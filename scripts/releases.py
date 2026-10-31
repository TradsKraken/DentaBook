#!/usr/bin/env python3
"""Save five production website versions and deploy reviewed website changes."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import uuid
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
SERVICES = ('client', 'api', 'admin_api', 'db')
APPLICATIONS = ('api', 'admin_api', 'client')
KEEP = 5
VERSION = re.compile(r'^\d{8}T\d{12}Z-[a-f0-9]{8}$')
KIND = 'dentabook-production-version'
FILES = ('compose.json', 'database.dump', 'images.tar.gz', 'version.json')


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def write_json(path, value):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, indent=2) + '\n')
    os.chmod(temporary, 0o600)
    temporary.replace(path)


class Releases:
    def __init__(self, root=ROOT):
        self.root = Path(root).resolve()
        self.store = self.root / '.local' / 'production-releases'
        self.history_file = self.root / '.local' / 'website-updates.json'

    def run(self, command, capture=False, **kwargs):
        return subprocess.run(command, cwd=self.root, check=True,
                              stdout=kwargs.pop('stdout', subprocess.PIPE if capture else None),
                              text=capture, **kwargs)

    def compose(self, *arguments, saved=None):
        command = ['docker', 'compose', '--project-name', 'dentabook']
        if saved:
            command += ['--file', str(saved)]
        else:
            command += ['--env-file', str(self.root / '.env'),
                        '--file', str(self.root / 'docker-compose.yml'),
                        '--file', str(self.root / 'docker-compose.production.yml')]
        return command + list(arguments)

    @contextmanager
    def locked(self):
        if self.store.is_symlink() or (self.root / '.local').is_symlink():
            raise ValueError('Release storage must not be a symlink.')
        self.store.mkdir(parents=True, exist_ok=True, mode=0o700)
        os.chmod(self.store, 0o700)
        with (self.store / '.lock').open('a') as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                raise ValueError('Another production release operation is running.') from None
            yield

    def versions(self):
        versions = []
        if not self.store.exists():
            return versions
        for path in self.store.iterdir():
            if not VERSION.fullmatch(path.name):
                continue
            if path.is_symlink() or not path.is_dir():
                raise ValueError('Invalid release directory: ' + path.name)
            value = json.loads((path / 'version.json').read_text())
            if value.get('kind') != KIND or value.get('version') != path.name:
                raise ValueError('Invalid release metadata: ' + path.name)
            if not isinstance(value.get('sequence'), int):
                raise ValueError('Invalid release order: ' + path.name)
            versions.append((path, value))
        return sorted(versions, key=lambda item: item[1]['sequence'])

    def remove_tags(self, version, value):
        for service in SERVICES:
            tag = value['images'][service]['tag']
            if tag != f'dentabook-restore/{service}:{version}':
                raise ValueError('Unexpected restore image tag.')
            # Remove only our named restore tag. Never prune global Docker images.
            try:
                self.run(['docker', 'image', 'rm', tag], capture=True, stderr=subprocess.PIPE)
            except subprocess.CalledProcessError:
                used = self.run(['docker', 'ps', '-aq', '--filter', 'ancestor=' + value['images'][service]['id']], capture=True).stdout.strip()
                if not used:
                    raise
                print('Docker retained an image still required by an existing container.')

    def prune(self):
        for path, value in self.versions()[:-KEEP]:
            self.remove_tags(path.name, value)
            shutil.rmtree(path)
            print('Removed oldest saved version: ' + path.name)

    def containers(self, require_healthy=True):
        ids = self.run(self.compose('ps', '-aq'), capture=True).stdout.split()
        if not ids:
            raise ValueError('Production must be running before a version can be saved.')
        values = json.loads(self.run(['docker', 'inspect', *ids], capture=True).stdout)
        result = {}
        for item in values:
            labels = item['Config']['Labels']
            if labels.get('com.docker.compose.project') != 'dentabook':
                raise ValueError('Refusing to operate on another Compose project.')
            service = labels.get('com.docker.compose.service')
            if service in SERVICES:
                if (require_healthy or service == 'db') and (not item['State']['Running'] or item['State'].get('Health', {}).get('Status', 'healthy') != 'healthy'):
                    raise ValueError('Production service is not healthy: ' + service)
                result[service] = item
        if set(result) != set(SERVICES):
            raise ValueError('Expected the four running production services.')
        return result

    def runtime_compose(self, containers, images):
        # Build a restore definition from the running containers, not newer source
        # files that might differ from the website being saved.
        result = {'name': 'dentabook', 'services': {}, 'networks': {}, 'volumes': {}}
        for service, item in containers.items():
            config, host = item['Config'], item['HostConfig']
            entry = {'image': images[service]['tag'], 'container_name': item['Name'].lstrip('/'),
                     'environment': dict(value.split('=', 1) for value in config['Env']),
                     'command': config.get('Cmd'), 'entrypoint': config.get('Entrypoint'),
                     'read_only': host.get('ReadonlyRootfs', False), 'networks': {}}
            for key, source in [('user', 'User'), ('working_dir', 'WorkingDir')]:
                if config.get(source):
                    entry[key] = config[source]
            restart = host.get('RestartPolicy', {}).get('Name')
            if restart and restart != 'no':
                entry['restart'] = restart
            for key, source in [('cap_drop', 'CapDrop'), ('security_opt', 'SecurityOpt'), ('tmpfs', 'Tmpfs')]:
                if host.get(source):
                    entry[key] = ([f'{target}:{options}' if options else target for target, options in host[source].items()]
                                  if key == 'tmpfs' else host[source])
            for name, network in item['NetworkSettings']['Networks'].items():
                result['networks'][name] = {'external': True, 'name': name}
                entry['networks'][name] = {'aliases': [service]}
            for target, bindings in (host.get('PortBindings') or {}).items():
                port, protocol = target.split('/')
                for binding in bindings or []:
                    value = {'target': int(port), 'published': binding['HostPort'], 'protocol': protocol}
                    if binding.get('HostIp'):
                        value['host_ip'] = binding['HostIp']
                    entry.setdefault('ports', []).append(value)
            for mount in item['Mounts']:
                value = {'type': mount['Type'], 'target': mount['Destination'], 'read_only': not mount['RW']}
                if mount['Type'] == 'volume':
                    name = mount['Name']
                    result['volumes'][name] = {'external': True, 'name': name}
                    value['source'] = name
                elif mount['Type'] == 'bind':
                    value['source'] = mount['Source']
                elif mount['Type'] == 'tmpfs':
                    continue  # Captured above in HostConfig.Tmpfs.
                else:
                    raise ValueError('Unsupported production mount type: ' + mount['Type'])
                entry.setdefault('volumes', []).append(value)
            health = config.get('Healthcheck')
            if health:
                entry['healthcheck'] = {'test': health['Test']}
                for field in ['Interval', 'Timeout', 'StartPeriod', 'StartInterval']:
                    if health.get(field):
                        snake = re.sub(r'(?<!^)(?=[A-Z])', '_', field).lower()
                        entry['healthcheck'][snake] = str(health[field]) + 'ns'
                if health.get('Retries') is not None:
                    entry['healthcheck']['retries'] = health['Retries']
            result['services'][service] = entry
        for service in ('api', 'admin_api'):
            if result['services'][service]['environment'].get('NODE_ENV') != 'production':
                raise ValueError('Refusing to snapshot a development API as production.')
        return result

    def export_images(self, tags, destination):
        with tempfile.TemporaryFile() as errors:
            with subprocess.Popen(['docker', 'image', 'save', *tags], stdout=subprocess.PIPE, stderr=errors) as process:
                try:
                    with gzip.open(destination, 'wb', compresslevel=1) as output:
                        shutil.copyfileobj(process.stdout, output, 1024 * 1024)
                except BaseException:
                    process.terminate()
                    process.wait()
                    raise
                if process.wait() != 0:
                    raise ValueError('Docker image export failed; saved versions were not pruned.')

    def save(self, note, allow_unhealthy=False):
        containers = self.containers(require_healthy=not allow_unhealthy)
        version = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ-') + uuid.uuid4().hex[:8]
        previous = self.versions()
        value = {'kind': KIND, 'version': version, 'sequence': previous[-1][1]['sequence'] + 1 if previous else 1,
                 'created_at': datetime.now(timezone.utc).isoformat(), 'note': note,
                 'images': {service: {'id': item['Image'], 'tag': f'dentabook-restore/{service}:{version}'} for service, item in containers.items()}}
        images = json.loads(self.run(['docker', 'image', 'inspect', *{item['Image'] for item in containers.values()}], capture=True).stdout)
        if shutil.disk_usage(self.store).free < sum(image['Size'] for image in images) + 256 * 1024 * 1024:
            raise ValueError('Insufficient free disk space to safely save the current website.')
        pending = Path(tempfile.mkdtemp(prefix='.pending-', dir=self.store))
        tagged = []
        try:
            for service, image in value['images'].items():
                self.run(['docker', 'image', 'tag', image['id'], image['tag']])
                tagged.append(image['tag'])
            write_json(pending / 'compose.json', self.runtime_compose(containers, value['images']))
            with (pending / 'database.dump').open('wb') as output:
                self.run(self.compose('exec', '-T', 'db', 'sh', '-c',
                    'pg_dump --format=custom -U "$POSTGRES_USER" "$POSTGRES_DB"'), stdout=output)
            with (pending / 'database.dump').open('rb') as stream:
                if stream.read(5) != b'PGDMP':
                    raise ValueError('Database backup is not a PostgreSQL custom-format archive.')
            with (pending / 'database.dump').open('rb') as stream:
                self.run(self.compose('exec', '-T', 'db', 'pg_restore', '--list'), capture=True, stdin=stream)
            self.export_images(tagged, pending / 'images.tar.gz')
            write_json(pending / 'version.json', value)
            write_json(pending / 'checksums.json', {name: digest(pending / name) for name in FILES})
            for file in pending.iterdir():
                os.chmod(file, 0o600)
            # Validate restore configuration without replacing any service.
            self.run(self.compose('config', '--quiet', saved=pending / 'compose.json'))
            pending.rename(self.store / version)
        except BaseException:
            for tag in tagged:
                try:
                    self.run(['docker', 'image', 'rm', tag], capture=True)
                except subprocess.CalledProcessError:
                    pass
            shutil.rmtree(pending, ignore_errors=True)
            raise
        print('Saved production website: ' + version)
        return version

    def verify_snapshot(self, version):
        if not VERSION.fullmatch(version):
            raise ValueError('Choose an exact version ID from the list command.')
        found = {path.name: path for path, _ in self.versions()}
        if version not in found:
            raise ValueError('Saved version not found.')
        path = found[version]
        hashes = json.loads((path / 'checksums.json').read_text())
        if set(hashes) != set(FILES):
            raise ValueError('Saved version has an invalid checksum manifest.')
        for name in FILES:
            if (path / name).is_symlink() or digest(path / name) != hashes[name]:
                raise ValueError('Saved version failed integrity checks: ' + name)
        return path

    def check_website(self, config):
        origins = [config['services'][name]['environment']['CLIENT_URL'] for name in ('api', 'admin_api')]
        for origin in origins:
            with urlopen(origin.rstrip('/') + '/api/health', timeout=20) as response:
                if response.status != 200 or not json.load(response)['database']['connected']:
                    raise ValueError('Website API health check failed.')
        for url in (origins[0], origins[0] + '/clinic/sign-in', origins[1] + '/admin/sign-in'):
            with urlopen(url, timeout=20) as response:
                if response.status != 200:
                    raise ValueError('Website page check failed.')

    def record_update(self, note):
        updates = json.loads(self.history_file.read_text()) if self.history_file.exists() else []
        updates.append({'date': datetime.now(timezone.utc).isoformat(), 'status': 'live', 'website_change': note})
        write_json(self.history_file, updates)

    def deploy(self, note):
        if self.run(['git', 'status', '--porcelain'], capture=True).stdout.strip():
            raise ValueError('Commit the tested source changes before deploying.')
        self.containers()
        self.run(self.compose('build'))
        version = self.save('Before website update: ' + note)
        try:
            self.run(self.compose('up', '-d', '--no-build', '--pull', 'never', '--no-deps',
                                  '--wait', '--wait-timeout', '180', *APPLICATIONS))
            config = json.loads(self.run(self.compose('config', '--format', 'json'), capture=True).stdout)
            self.check_website(config)
            self.record_update(note)
        except Exception as error:
            raise ValueError(f'Deployment checks failed. Verified restore point {version} is retained. Review database migrations before rolling back. {type(error).__name__}') from None
        finally:
            self.prune()
        print('Production updated. The five newest saved versions are retained.')

    def rollback(self, version, note):
        target = self.verify_snapshot(version)
        config = json.loads((target / 'compose.json').read_text())
        self.run(self.compose('config', '--quiet', saved=target / 'compose.json'))
        rescue = self.save('Before restoring a previous website version', allow_unhealthy=True)
        try:
            self.run(['docker', 'image', 'load', '--input', str(target / 'images.tar.gz')], capture=True)
            self.run(self.compose('up', '-d', '--no-build', '--pull', 'never', '--no-deps',
                                  '--wait', '--wait-timeout', '180', *APPLICATIONS, saved=target / 'compose.json'))
            self.check_website(config)
            self.record_update(note)
        except Exception as error:
            raise ValueError(f'Rollback checks failed. Verified rescue version {rescue} is retained. {type(error).__name__}') from None
        finally:
            self.prune()
        print('Website images restored. The current database was preserved.')


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='action', required=True)
    sub.add_parser('list', help='List the saved production website versions')
    sub.add_parser('history', help='Show successful user-facing website release notes')
    save = sub.add_parser('save', help='Save the running website without deploying changes')
    save.add_argument('--note', required=True)
    deploy = sub.add_parser('deploy', help='Back up and deploy the committed, tested source')
    deploy.add_argument('--note', required=True, help='Describe the website feature or fix, not project work')
    rollback = sub.add_parser('rollback', help='Restore saved application images; preserve current database')
    rollback.add_argument('version')
    rollback.add_argument('--note', required=True, help='Describe the user-facing website correction')
    args = parser.parse_args()
    if hasattr(args, 'note') and (not args.note.strip() or len(args.note) > 2000):
        parser.error('Provide a website change description of 1–2,000 characters.')
    releases = Releases()
    with releases.locked():
        if args.action == 'list':
            for path, value in releases.versions():
                print(f"{path.name}  {value['created_at']}  {value['note']}")
        elif args.action == 'history':
            values = json.loads(releases.history_file.read_text()) if releases.history_file.exists() else []
            for value in values:
                print(f"- {value['date']}: {value['website_change']}")
        elif args.action == 'save':
            releases.save(args.note.strip())
            releases.prune()
        elif args.action == 'deploy':
            releases.deploy(args.note.strip())
        else:
            releases.rollback(args.version, args.note.strip())


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print('Release operation stopped: ' + str(error), file=sys.stderr)
        sys.exit(1)

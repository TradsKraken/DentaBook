#!/usr/bin/env python3
"""Prepare a reviewed client source snapshot and documentation package."""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import zipfile
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATES = ROOT / 'delivery' / 'client'
ROOT_FILES = ['docker-compose.yml', 'docker-compose.production.yml', '.env.example']
FORBIDDEN = {'.git', '.agents', '.codex', 'internal', 'AGENTS.md', 'SKILL.md', 'node_modules', 'test-results', 'playwright-report', '.local'}

def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args])

def validate(destination):
    problems = []
    for path in destination.rglob('*'):
        if not path.is_file():
            continue
        relative = path.relative_to(destination)
        if path.is_symlink() or set(relative.parts) & FORBIDDEN:
            problems.append(f'Unexpected file: {relative}')
        if (path.name.startswith('.env') and not path.name.endswith('.example')) or path.suffix in {'.dump', '.log', '.pem', '.key', '.p12', '.pfx'}:
            problems.append(f'Private runtime file: {relative}')
        if path.suffix == '.md':
            text = path.read_text(encoding='utf-8')
            for target in re.findall(r'\[[^\]]*\]\(([^\s)]+)\)', text):
                if re.match(r'^[a-zA-Z]+:', target) or target.startswith('#'):
                    continue
                link = (path.parent / target.split('#', 1)[0]).resolve()
                if not link.is_relative_to(destination.resolve()) or not link.exists():
                    problems.append(f'Broken local link in {relative}: {target}')
    if problems:
        raise ValueError('\n'.join(problems))

def write_manifest(destination):
    files = sorted(path for path in destination.rglob('*') if path.is_file() and '.git' not in path.relative_to(destination).parts and path.name != 'MANIFEST.sha256')
    (destination / 'MANIFEST.sha256').write_text(''.join(hashlib.sha256(path.read_bytes()).hexdigest() + '  ' + path.relative_to(destination).as_posix() + '\n' for path in files))

def archive(destination):
    output = destination.with_suffix('.zip')
    if output.exists():
        raise FileExistsError(f'Archive already exists: {output}')
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as package:
        for path in sorted(destination.rglob('*')):
            if path.is_file() and '.git' not in path.relative_to(destination).parts:
                package.write(path, destination.name + '/' + path.relative_to(destination).as_posix())
    return output

def dependencies(destination):
    explanations = {
        'react': 'Interface components', 'react-dom': 'Browser rendering',
        'react-router-dom': 'Page navigation', 'lucide-react': 'Icons',
        'vite': 'Frontend builds and development server', '@vitejs/plugin-react': 'React build integration',
        '@playwright/test': 'Browser and responsive-layout tests', 'express': 'HTTP API framework',
        'pg': 'PostgreSQL connection pool', 'bcrypt': 'Password hashing',
        'cors': 'Allowed browser-origin handling', 'dotenv': 'Private environment configuration',
        '@electric-sql/pglite': 'Isolated PostgreSQL-compatible integration tests',
    }
    sections = ['# Dependency versions\n\nThese versions come from the delivered lockfiles. Use `npm ci` to reproduce them. Node.js 22 and PostgreSQL 16 are selected by the Dockerfiles and Compose configuration.\n']
    for area, title in [('client', 'Website'), ('server', 'API')]:
        package = json.loads((destination / area / 'package.json').read_text())
        lock = json.loads((destination / area / 'package-lock.json').read_text())
        sections.append(f'\n## {title}\n\n| Package | Locked version | Use | Purpose |\n| --- | --- | --- | --- |\n')
        for group, kind in [('dependencies', 'Runtime'), ('devDependencies', 'Build/test')]:
            for name in sorted(package.get(group, {})):
                version = lock['packages']['node_modules/' + name]['version']
                sections.append(f'| `{name}` | {version} | {kind} | {explanations.get(name, "Supporting package")} |\n')
    sections.append('\nNginx and base container images currently use the tags declared in the Dockerfiles. Tags can resolve to newer image builds; record image digests with each deployment if an exact container rebuild is required. The lockfiles cover JavaScript package versions, not container image immutability.\n')
    (destination / 'docs' / 'DEPENDENCIES.md').write_text(''.join(sections))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / '.local' / 'client-delivery' / 'DentaBook-Client')
    args = parser.parse_args()
    destination = args.output.resolve()
    if destination == ROOT or destination in ROOT.parents or TEMPLATES == destination or TEMPLATES.is_relative_to(destination) or destination.is_relative_to(TEMPLATES):
        raise ValueError('Choose a separate export directory.')
    if destination.exists():
        raise FileExistsError(f'Export directory already exists: {destination}. Use a new directory for each release.')
    destination.mkdir(parents=True)
    tracked = [Path(value) for value in git('ls-files', '-z', '--', 'client', 'server').decode().split('\0') if value]
    tracked += [Path(value) for value in ROOT_FILES]
    source_hashes = {}
    for relative in tracked:
        source = ROOT / relative
        if source.is_symlink() or set(relative.parts) & FORBIDDEN or not source.is_file():
            raise ValueError(f'Unexpected source path: {relative}')
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        source_hashes[relative.as_posix()] = hashlib.sha256(source.read_bytes()).hexdigest()
    for source in TEMPLATES.rglob('*'):
        if source.is_file():
            target = destination / source.relative_to(TEMPLATES)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
    dependencies(destination)
    subprocess.run([sys.executable, str(ROOT / "delivery" / "render_handbook.py"), str(destination)], check=True)
    validate(destination)
    for relative, expected in source_hashes.items():
        if hashlib.sha256((destination / relative).read_bytes()).hexdigest() != expected:
            raise ValueError(f'Source changed during export: {relative}')
    write_manifest(destination)
    package = archive(destination)
    record = {
        'prepared_date': date.today().isoformat(),
        'development_commit': git('rev-parse', 'HEAD').decode().strip(),
        'copied_source_files': source_hashes,
        'client_directory': str(destination),
        'archive': str(package),
        'archive_sha256': hashlib.sha256(package.read_bytes()).hexdigest(),
    }
    # This record belongs to development; it is not part of the client archive.
    destination.with_suffix('.export-record.json').write_text(json.dumps(record, indent=2) + '\n')
    print(json.dumps({'directory': str(destination), 'archive': str(package), 'source_files_verified': len(source_hashes), 'markdown_links': 'passed', 'private_paths': 'excluded'}, indent=2))

if __name__ == '__main__':
    main()

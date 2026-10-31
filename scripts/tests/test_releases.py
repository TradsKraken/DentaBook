import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import Mock

spec = importlib.util.spec_from_file_location('releases', Path(__file__).resolve().parents[1] / 'releases.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.manager = release.Releases(Path(self.temp.name))
        self.manager.store.mkdir(parents=True)
        self.manager.run = Mock(return_value=Mock(stdout=''))

    def version(self, number):
        key = f'20261031T1200{number:02d}000000Z-abcdef12'
        path = self.manager.store / key
        path.mkdir()
        value = {'kind': release.KIND, 'version': key, 'sequence': number,
                 'created_at': '2026-10-31', 'note': 'Patients can browse clinics.',
                 'images': {service: {'id': 'sha256:abc', 'tag': f'dentabook-restore/{service}:{key}'} for service in release.SERVICES}}
        release.write_json(path / 'version.json', value)
        return path, value

    def test_sixth_saved_version_removes_only_the_oldest(self):
        for n in range(1, 7):
            self.version(n)
        unrelated = self.manager.store / 'manual-backup'
        unrelated.mkdir()
        self.manager.prune()
        self.assertEqual([v['sequence'] for _, v in self.manager.versions()], [2, 3, 4, 5, 6])
        self.assertTrue(unrelated.exists())
        calls = [call.args[0] for call in self.manager.run.call_args_list]
        self.assertEqual(len(calls), 4)
        self.assertTrue(all(command[:3] == ['docker', 'image', 'rm'] for command in calls))
        self.assertTrue(all('20261031T120001000000Z' in command[-1] for command in calls))

    def test_five_versions_are_kept_without_deleting_any(self):
        for n in range(1, 6):
            self.version(n)
        self.manager.prune()
        self.manager.run.assert_not_called()

    def test_invalid_metadata_or_symlink_is_never_pruned(self):
        path, _ = self.version(1)
        (path / 'version.json').write_text('{}')
        with self.assertRaises(ValueError):
            self.manager.prune()
        self.assertTrue(path.exists())
        self.manager.run.assert_not_called()

    def test_manifest_detects_corrupted_restore_archive(self):
        path, _ = self.version(1)
        for name in ('compose.json', 'database.dump', 'images.tar.gz'):
            (path / name).write_bytes(b'verified data')
        release.write_json(path / 'checksums.json', {name: release.digest(path / name) for name in release.FILES})
        self.assertEqual(self.manager.verify_snapshot(path.name), path)
        (path / 'images.tar.gz').write_bytes(b'corrupted data')
        with self.assertRaisesRegex(ValueError, 'integrity'):
            self.manager.verify_snapshot(path.name)

    def test_rollback_rejects_path_traversal(self):
        with self.assertRaises(ValueError):
            self.manager.verify_snapshot('../../production')

    def test_failed_build_does_not_save_or_prune(self):
        self.manager.containers = Mock()
        self.manager.save = Mock()
        self.manager.prune = Mock()
        self.manager.run.side_effect = [Mock(stdout=''), subprocess.CalledProcessError(1, 'build')]
        with self.assertRaises(subprocess.CalledProcessError):
            self.manager.deploy('Patients can search by treatment.')
        self.manager.save.assert_not_called()
        self.manager.prune.assert_not_called()

    def test_failed_deployment_keeps_verified_restore_point_applies_five_version_limit_and_does_not_publish_history(self):
        self.manager.containers = Mock()
        self.manager.save = Mock(return_value='saved-version')
        self.manager.prune = Mock()
        self.manager.record_update = Mock()
        self.manager.run.side_effect = [Mock(stdout=''), Mock(), subprocess.CalledProcessError(1, 'up')]
        with self.assertRaisesRegex(ValueError, 'saved-version'):
            self.manager.deploy('Patients can search by treatment.')
        self.manager.prune.assert_called_once()
        self.manager.record_update.assert_not_called()

    def test_successful_deploy_prunes_after_website_checks_and_records_only_supplied_website_change(self):
        events = []
        self.manager.containers = Mock()
        self.manager.save = Mock(return_value='saved-version')
        self.manager.run.side_effect = [Mock(stdout=''), Mock(), Mock(), Mock(stdout='{}')]
        self.manager.check_website = Mock(side_effect=lambda _: events.append('checked'))
        self.manager.prune = Mock(side_effect=lambda: events.append('pruned'))
        self.manager.deploy('Patients can search by treatment.')
        self.assertEqual(events, ['checked', 'pruned'])
        history = json.loads(self.manager.history_file.read_text())
        self.assertEqual(history[0]['website_change'], 'Patients can search by treatment.')
        self.assertEqual(set(history[0]), {'date', 'status', 'website_change'})

    def test_uncommitted_changes_block_deployment(self):
        self.manager.run.return_value.stdout = ' M server/app.js'
        with self.assertRaisesRegex(ValueError, 'Commit'):
            self.manager.deploy('Patients can search by treatment.')
        self.assertEqual(self.manager.run.call_count, 1)

    def test_rollback_preserves_database_and_saves_rescue_version_even_when_application_unhealthy(self):
        path, _ = self.version(1)
        (path / 'compose.json').write_text('{}')
        self.manager.verify_snapshot = Mock(return_value=path)
        self.manager.save = Mock(return_value='rescue')
        self.manager.check_website = Mock()
        self.manager.prune = Mock()
        self.manager.rollback(path.name, 'Restored working patient sign-in.')
        self.manager.save.assert_called_once_with('Before restoring a previous website version', allow_unhealthy=True)
        commands = [call.args[0] for call in self.manager.run.call_args_list]
        up = next(command for command in commands if 'up' in command)
        self.assertEqual(up[-3:], ['api', 'admin_api', 'client'])
        self.assertNotIn('db', up)
        self.assertFalse(any('pg_restore' in command for command in commands))
        self.manager.prune.assert_called_once()

    def test_explicit_production_compose_scope_ignores_development_environment(self):
        command = self.manager.compose('ps')
        self.assertIn('dentabook', command)
        self.assertIn(str(self.manager.root / '.env'), command)
        self.assertNotIn('docker-compose.development.yml', ' '.join(command))

    def test_failed_database_backup_cleans_partial_save_and_preserves_all_older_versions(self):
        for n in range(1, 6):
            self.version(n)
        self.manager.containers = Mock(return_value={service: {'Image': 'sha256:' + service} for service in release.SERVICES})
        self.manager.runtime_compose = Mock(return_value={})
        self.manager.export_images = Mock()
        def command(args, capture=False, **kwargs):
            if args[:3] == ['docker', 'image', 'inspect']:
                return Mock(stdout='[{"Size": 0}]')
            if 'sh' in args and '-c' in args:
                kwargs['stdout'].write(b'invalid backup')
            return Mock(stdout='')
        self.manager.run.side_effect = command
        with self.assertRaisesRegex(ValueError, 'PostgreSQL'):
            self.manager.save('Current website')
        self.assertEqual(len(self.manager.versions()), 5)
        self.assertEqual(list(self.manager.store.glob('.pending-*')), [])
        self.manager.export_images.assert_not_called()

    def test_pruning_refuses_unrelated_image_tags(self):
        for n in range(1, 7):
            path, value = self.version(n)
            if n == 1:
                value['images']['client']['tag'] = 'unrelated-website:latest'
                release.write_json(path / 'version.json', value)
        with self.assertRaisesRegex(ValueError, 'Unexpected'):
            self.manager.prune()
        self.assertEqual(len(self.manager.versions()), 6)
        self.manager.run.assert_not_called()

    def test_failed_rollback_keeps_rescue_point_and_never_records_a_successful_website_change(self):
        path, _ = self.version(1)
        (path / 'compose.json').write_text('{}')
        self.manager.verify_snapshot = Mock(return_value=path)
        self.manager.save = Mock(return_value='rescue-point')
        self.manager.prune = Mock()
        self.manager.record_update = Mock()
        self.manager.run.side_effect = [Mock(), subprocess.CalledProcessError(1, 'load')]
        with self.assertRaisesRegex(ValueError, 'rescue-point'):
            self.manager.rollback(path.name, 'Restored working sign-in.')
        self.manager.prune.assert_called_once()
        self.manager.record_update.assert_not_called()

    def test_lock_prevents_two_release_operations(self):
        with self.manager.locked():
            with self.assertRaisesRegex(ValueError, 'Another'):
                with self.manager.locked():
                    self.fail('Second lock should not be acquired')


if __name__ == '__main__':
    unittest.main()

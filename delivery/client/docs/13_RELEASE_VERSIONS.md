# Production releases and five saved website versions

The production release manager keeps the **five newest saved production versions**. Each version contains the exact running application/container images, a PostgreSQL database backup, the running service configuration, and integrity checksums. Saving the current website does not deploy newer development changes.

Snapshots are private under `.local/production-releases/`. This directory is ignored by Git and restricted to the operator. Saved configuration and database files contain private information. Keep this folder off public web hosting.

## Normal update workflow

1. Make changes and rebuild the development preview using the operator’s separate development setup.
2. Review the affected website behavior on phones and desktop and complete the relevant tests.
3. Commit the tested source. Do not add untested changes between review and release.
4. Deploy using the release manager, describing the actual website feature or fix:

```sh
cd /home/dentabook
python3 scripts/releases.py deploy --note "Patients can now filter clinics by treatment."
```

The example note illustrates the required wording; use the change actually implemented and tested. The command builds production images, saves the currently running website and database, verifies that saved copy, deploys the application services, and checks the website pages and APIs. The running production database container is retained. Any new application migrations still run on API startup.

Use this command instead of a direct `docker compose build` / `up` when releasing production so version retention and release records are applied. Development rebuilds remain separate and do not create production versions.

## Five-version retention

Completed operations keep at most five saved restore points, ordered by their saved sequence. When a sixth complete copy exists, the oldest saved copy is removed. Its private archive and owned restore-image tags are removed; Docker retains any image still required by an existing container. Unrelated images, development services, production data volumes, and older manually made backups are not globally pruned.

No old version is removed to make room before the new recovery copy has completed successfully. A failed build or backup leaves the older saved versions intact. If a deployment or rollback fails after its recovery copy is verified, that newest copy is kept and the normal five-version limit still applies. Failed releases are not added to the website-update history. A sixth folder can exist temporarily while a release operation is running.

Available disk space is checked before saving. A full disk, export failure, invalid database dump, or invalid restore configuration stops the operation. Only one save/deploy/rollback operation can run at a time. Use the release manager for all production releases; simultaneous manual Docker operations are outside that lock.

## List or save a version

```sh
python3 scripts/releases.py list
python3 scripts/releases.py save --note "Current clinic directory, patient accounts, and clinic review."
```

The list shows the exact version IDs needed for rollback, saved dates, and descriptions. A manual save creates a restore point without updating the live website and applies the same five-version limit. The version contains the website actually running at capture time, even when newer source exists in the working folder.

## Restore a previous website version

Choose an exact ID from the list:

```sh
python3 scripts/releases.py rollback VERSION_ID --note "Restored working patient sign-in."
```

The command verifies the saved checksums, saves a rescue copy of the current installation, loads the saved images, restores the application services, and checks the website. It can capture an unhealthy application before rollback as long as the production database remains healthy.

**Rollback preserves the current database.** It does not erase appointments or restore older customer records. Before rolling back across a schema migration, check that the earlier application supports the current database schema. If it does not, use a forward fix or plan a separate, deliberate database recovery. A database restore can discard records created after the backup and is not automated by this command. The saved custom-format dump is available for an operator's recovery procedure.

The saved application images are loaded directly; rollback does not rebuild old source against newer packages. Existing production networks and data volumes are reused. Production configuration can contain passwords, so never copy the saved configuration into a public repository.

## Website update history

A successful deployment or rollback records the supplied website-change description with a date and live status in the private `.local/website-updates.json`. To review the entries:

```sh
python3 scripts/releases.py history
```

Write notes about the website: what changed, who can use it, or what problem was fixed. Do not use raw commit titles, personal work logs, repository tasks, documentation changes, or server setup as website-update entries. Notes for development-only features must remain labeled as preview work until production is actually released. Update the client README/history with the reviewed website entries as part of the handoff; the release command does not automatically publish to GitHub.

## Verification and limits

Automated isolated tests cover the sixth-save deletion rule, exactly five retained versions, unrelated-folder protection, archive corruption, failure paths, locking, production-project selection, and database-preserving rollback. The installed current production baseline was saved and its restore configuration and PostgreSQL archive validated without restarting the website. A production deploy or rollback is not run merely to test this tooling.

Versions are stored on the same server. They support recovery from a bad release; protection against loss of the entire server requires separate off-host backups. Page/API release checks do not replace feature review, the application test suites, or public-path checks from outside the LAN.

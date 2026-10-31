# Operations manual

## Routine checks

Use the correct project directory and production `.env`. Check `docker compose ps`, both HTTPS health endpoints, certificate renewal, available disk space, and the most recent verified backup. Agree an appropriate check schedule and responsible operator before relying on the system for daily operations.

```bash
docker compose ps
docker compose logs --tail=100 api admin_api client db
```

Logs can contain operational or account-related information. Share only the relevant, redacted excerpt when requesting support.

## Backing up the database

The persistent Docker volume keeps records when containers are replaced. It is not a separate backup. Create a private backup before every release or database maintenance operation, and on the schedule agreed with the project owner.

From the project root on a Linux host:

```bash
mkdir -p .local/backups
chmod 700 .local/backups
umask 077
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > ".local/backups/dentabook-$(date +%Y%m%d-%H%M%S).sql"
```

Keep a protected copy outside the production server. Test recovery periodically in an isolated environment. Store the configuration and access needed for recovery separately from the database backup. This release does not configure scheduled backups, backup encryption, or retention automatically.

## Recovery procedure

1. Identify the last verified backup and the application version it belongs to.
2. Prepare an isolated PostgreSQL 16 database with the required database role and extension permissions.
3. Restore the SQL backup into a new, empty database using an authorized database operator's connection. A command such as `psql --set ON_ERROR_STOP=1 --dbname "$RESTORE_DATABASE_URL" --file backup.sql` must target that recovery database, not the live one.
4. Check account and clinic record counts, session behavior, directory data, and the relevant application workflows against the restored database.
5. Agree the production recovery window and data cutover before reconnecting the live application.
6. Repeat the health and acceptance checks after cutover.

The backup format is plain SQL. Restoring it into an already initialized database may conflict with existing tables or records; prepare an empty recovery database and stop on errors. Do not attempt a production restore by trial and error.

## Installing a new release

Confirm that the release has passed the agreed tests and read its release notes. Obtain and test the approved release using the agreed branch or tag, and commit the intended source. The release manager saves the current running images and a verified database backup before replacing services and retains the five newest saved versions. Then run:

```bash
python3 scripts/releases.py deploy --note "Describe the tested website feature or fix."
python3 scripts/releases.py list
```

Verify the two HTTPS health endpoints and the user journeys. Database migrations run at startup and may require a recovery plan beyond restarting an old image. The current project has no general automatic migration-down command.

Never use `docker compose down -v` for a routine update: it deletes the named database volume. `docker compose down` stops the stack without deleting that named volume. Keep production configuration independent from local testing.

## Common problems

| Symptom | What to check |
| --- | --- |
| Repeated redirects through the public hostname | For this confirmed deployment, keep NPM Force SSL off and HTTP/2 Support on. Compare the public and LAN routes; a successful LAN check alone does not verify the Cloudflare path. |
| Proxy shows 502 | Container status, production server address, correct upstream port, LAN reachability, and application logs |
| Certificate or hostname error | Exact Proxy Host name, DNS record, matching certificate, and renewal status |
| Sign-in form works but session does not persist | HTTPS, correct browser hostname, production origins, cookies, and API health |
| Registration returns a verification error | The browser is using the configured origin and requests carry the required application header |
| Clinic directory is empty | Whether clinics have been approved and active clinic service/dentist records exist |
| Clinic cannot open its workspace | Signed-in account role, clinic ownership, and approval status |
| Temporary too-many-attempts message | Respect the retry period; repeated requests may have reached the process's limit |
| An administrator link fails on the main site | Use the separate administrator hostname; public-host admin routes are intentionally blocked |

Self-service password resets, MFA, automated email delivery, and provider payments are not available in this release. Escalate those requests to the designated maintainer using the approved maintenance process.

## Versioned production releases

Use the [five-version release manager](13_RELEASE_VERSIONS.md) when releasing tested website changes. It saves the running images and a database backup before the update. Direct Compose updates bypass that saved-version process. Rollback restores application images while preserving the current database; schema compatibility must be reviewed separately.

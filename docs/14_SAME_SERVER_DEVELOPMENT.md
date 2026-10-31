# Development on the deployment server

Development can now run on **10.10.1.113** alongside production. The older development computer at 10.10.1.116 is optional. The two server installations use separate containers, images, networks, PostgreSQL databases, storage volumes, and configuration.

## Open the development website

Use these addresses from a device on the LAN:

| Area | Address |
| --- | --- |
| Public website | http://10.10.1.113:3013 |
| Patient sign-in | http://10.10.1.113:3013/patient/sign-in |
| Patient registration | http://10.10.1.113:3013/patient/register |
| Clinic sign-in | http://10.10.1.113:3013/clinic/sign-in |
| Clinic registration | http://10.10.1.113:3013/clinic/register |
| Administrator sign-in | http://10.10.1.113:3015/admin/sign-in |

The development owner account is **admin** with password **admin123**. It has been explicitly created in this development database. Sign in on the desired portal. The clinic portal offers a selector for existing clinics; it shows an empty state until clinics are registered. No production accounts or clinic data are copied into this database. Ordinary accounts retain their usual role and clinic-approval requirements.

These development addresses use HTTP within the LAN. Keep the development password and ports out of public proxy/domain forwarding. Production remains at the existing HTTPS domains on ports 3003 and 3005. The development-only account is rejected by production-mode APIs.

## Develop and update the preview

Edit the project source in `/home/dentabook`, then run:

```sh
cd /home/dentabook
./scripts/development.sh up -d --build --wait
```

The command rebuilds and replaces only the development services. Refresh the development browser page afterward. This setup uses built images rather than hot reload. Saving source files or rebuilding development does not update the running production images. A production release remains a separate tested deployment using the [five-version release manager](15_RELEASE_VERSIONS.md).

The wrapper always selects the `dentabook-development` project, `docker-compose.development.yml`, and private `.env.development.local`. It avoids the root production `.env`, its `COMPOSE_FILE`, and production image tags. Use this wrapper for development operations:

```sh
# Show development services and health.
./scripts/development.sh ps

# Review development logs.
./scripts/development.sh logs --tail 100 api admin_api client

# Restart development services without rebuilding.
./scripts/development.sh restart

# Stop development while retaining its database.
./scripts/development.sh stop

# Start existing development containers again.
./scripts/development.sh up -d --wait
```

Plain `docker compose` in this directory still selects production through the root `.env`. Use the development wrapper when changing the preview.

## Data and configuration

| Item | Development | Production |
| --- | --- | --- |
| Compose project | `dentabook-development` | `dentabook` |
| Configuration | `.env.development.local` | `.env` |
| Public/clinic port | 3013 | 3003 |
| Administrator port | 3015 | 3005 |
| Database | `dentabook_development` | Existing production database |
| PostgreSQL storage | `dentabook-development_development_pgdata` | `dentabook_dentabook_pgdata` |
| Frontend image | `dentabook-development-client:local` | `dentabook-client` |
| API image | `dentabook-development-api:local` | Existing production API images |

The development database password is generated separately and stored in the ignored private configuration with mode 0600. API and database ports are not published. Only the development web ports bind to the server's IPv4 LAN address. Each API accepts its exact browser origin; administrator routes are blocked on the public listener and public/clinic routes are blocked on the administrator listener.

Development data persists across rebuilds, restarts, and stops. Do not remove its volume when updating. Never point development at the production database or restore production personal information into it as a shortcut for test data. Use authorized registrations and saved records for the workflows you want to review.

For a fresh installation, copy `.env.development.example` to `.env.development.local`, set the server LAN address and a unique database password, then run the development build command. To create the requested owner once on a new database:

```sh
./scripts/development.sh exec -T api npm run create-owner -- --development
```

The account already exists on this installed development instance. Rerunning its creation command refuses the duplicate rather than resetting it. Owner permissions and production strong-password provisioning are explained in [owner access](13_OWNER_ACCESS.md).

The development build mounts a CA bundle only during dependency installation. The default is the Linux host's `/etc/ssl/certs/ca-certificates.crt`; set `DEV_BUILD_CA_FILE` to an appropriate trusted bundle if building on a different host. Certificates are not copied into the application image by this mechanism.

## Development backup

```sh
mkdir -p .local/development-backups
chmod 700 .local/development-backups
umask 077
./scripts/development.sh exec -T db pg_dump -U dentabook_dev dentabook_development > .local/development-backups/development.sql
```

This command backs up development only. Keep backups private and choose a new filename when retaining multiple snapshots. Production backup/release instructions remain in the [production guide](12_DOMAIN_SETUP.md).

## Verification

The installed stack was checked through the real LAN listeners and PostgreSQL database. Browser checks use the actual owner login without intercepted API responses or inserted example clinics. They cover patient/clinic/admin sign-in, effective roles, empty clinic selection, workspace restrictions, logout, and layouts at 390px first, then 320px, 768px, and 1440px. Separate listener checks cover redirects, origin enforcement, headers, and portal boundaries.

The production baseline comparison checks container IDs, image IDs, start times, storage mounts, and the private production configuration hash. Development networks and database storage are checked against production to confirm they are separate. Source updates here have not been deployed to production.

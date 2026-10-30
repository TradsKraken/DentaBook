# Setup and deployment

This guide is for the person responsible for hosting. Routine users only need a browser and the website addresses in the user guide.

## Requirements

Use a server with Docker Engine and Docker Compose 2.24.4 or newer. Production requires the public and administrator hostnames to point to a reverse proxy, a valid certificate for each hostname, and HTTPS. Node.js 22 is needed on a workstation only when running development tools outside Docker.

Run a test installation on a separate machine from the live stack. The supplied container names are fixed; another copy on the same machine will conflict with the running containers unless the operator deliberately changes the configuration.

## Local evaluation

1. Copy `.env.example` to `.env` in the project root.
2. Replace the database password placeholder with a newly generated random password.
3. Set `NODE_ENV=development` and `CLIENT_URL=http://localhost:3000`.
4. Keep the production `COMPOSE_FILE` setting disabled for a combined local preview.
5. Confirm that ports 3000, 5000, and the chosen database diagnostic port are unused.
6. Run:

```bash
docker compose config --quiet
docker compose up -d --build --wait
docker compose ps
curl --fail http://localhost:3000/api/health
```

Open `http://localhost:3000`. Local patient, clinic, and administrator routes share that origin, with server-enforced roles. Local HTTP is for controlled evaluation; production uses HTTPS.

## Production configuration

On the intended production server, copy `.env.production.example` to `.env`. Preserve an existing production `.env` when updating a live installation. Supply a unique database password before first startup. On Linux, restrict the file with `chmod 600 .env`.

| Setting | Meaning |
| --- | --- |
| `COMPOSE_FILE` | Selects the base file and production override together |
| `CLIENT_PORT=3003` | Host port for the patient/clinic website |
| `ADMIN_PORT=3005` | Host port for the administrator website |
| `CLIENT_URL` | Exact public HTTPS browser origin, with no path |
| `ADMIN_URL` | Exact administrator HTTPS origin, with no path |
| `DB_USER`, `DB_NAME`, `DB_PASSWORD` | Database connection settings; preserve these for an existing volume |
| `NODE_ENV=production` | Enables production operation and secure session cookies |
| `TRUST_PROXY` | Optional explicit trusted proxy addresses; leave blank until correctly configured |

Run all commands from the project root so Compose loads the intended `.env`:

```bash
docker compose config --quiet
docker compose build
docker compose up -d --wait
docker compose ps
```

The database initializes a new persistent volume on first startup. API startup applies pending migrations. An existing volume is reused on later deployments. Changing an environment password does not automatically change the password inside an existing database.

Production contains four services: the website, the public/clinic API, the administrator API, and PostgreSQL. The APIs and database have no published host ports. The website exposes ports 3003 and 3005 for the upstream reverse proxy.

## Nginx Proxy Manager

Create these two Proxy Hosts, substituting the production server's LAN address:

| Domain | Forward scheme | Forward host | Forward port |
| --- | --- | --- | --- |
| `dentabook.forgroup.space` | `http` | Production server LAN address | `3003` |
| `dentabook-admin.forgroup.space` | `http` | Production server LAN address | `3005` |

Install a valid certificate for each exact name and enable Force SSL. Forward the entire hostname; the application already handles `/api` forwarding. Do not create a separate clinic host. Clinic access uses `/clinic/sign-in` on the main website. Use Cloudflare Full (strict) encryption when the DNS records are proxied through Cloudflare.

The administrator root redirects to `/admin/sign-in`. Redirects are relative so they preserve the browser's HTTPS hostname or the published LAN port.

## First administrator

An operator creates the first real administrator interactively:

```bash
docker compose exec api npm run create-admin
```

Enter the intended person's name, email, and a private password. There are no default administrator credentials. Transfer access through the agreed private process, not through a source-code file or this documentation.

## Verify the installation

```bash
curl --fail https://dentabook.forgroup.space/api/health
curl --fail https://dentabook-admin.forgroup.space/api/health
curl --fail --location --head https://dentabook-admin.forgroup.space/
curl --fail --head https://dentabook.forgroup.space/clinic/sign-in
```

Both health responses should report `healthy` and a connected database. Administrator pages must return 404 on the public host; patient and clinic pages must return 404 on the administrator host. Then run the [acceptance checks](07_TESTING_AND_ACCEPTANCE.md).

If the domains change, update the origins in `.env`, rebuild the client, recreate the API services, and update DNS/certificates. Public and clinic links are configured during the website build.

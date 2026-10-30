# Production domains, ports, and releases

Development stays on `10.10.1.116`. Production runs in `/home/dentabook` on `10.10.1.113`, with independent configuration and its own PostgreSQL volume.

## Current addresses

| Portal | Browser URL | Nginx Proxy Manager upstream |
| --- | --- | --- |
| Patient/public | `https://dentabook.forgroup.space` | `http://10.10.1.113:3003` |
| Clinic sign-in | `https://dentabook.forgroup.space/clinic/sign-in` | Same public host and port 3003 |
| Clinic registration | `https://dentabook.forgroup.space/clinic/register` | Same public host and port 3003 |
| Administrator | `https://dentabook-admin.forgroup.space/admin/sign-in` | `http://10.10.1.113:3005` |

The user chose to share the patient/clinic port and supplied `dentabook-admin.forgroup.space` as the actual administrator domain. Port 3004 is no longer used. Earlier three-port instructions and the names `clinic.dentabook.forgroup.space` / `admin.dentabook.forgroup.space` are superseded.

The administrator root redirects to `/admin/sign-in`. Redirects are relative, preserving the HTTPS host or published LAN port rather than exposing internal container ports. LAN URLs are diagnostic HTTP upstreams; browser credentials use HTTPS.

## Isolation and accounts

Production's public API process has `APP_PORTAL=public`: patient and clinic login/registration are available, with account roles, clinic approval, and record ownership enforced on the server. A patient cannot enter a clinic workspace and a clinic account cannot read patient appointments. Public-host administrator pages and APIs return 404.

Administration has its own API process, `APP_PORTAL=admin`, which rejects patient/clinic pages, login, registration, and workspace endpoints. The configured origin is exactly `https://dentabook-admin.forgroup.space`. A public session token renamed as an administrator cookie is still rejected by its server-validated role; the public API likewise rejects administrator sessions. Forwarded headers cannot select another portal.

Patient/clinic access uses `__Host-dentabook_public_session`; administration uses `__Host-dentabook_admin_session`. Both cookies are `Secure`, `HttpOnly`, `SameSite=Strict`, host-only, and expire server-side. Patient and clinic roles share a browser session on their common host; sign out to switch accounts. Existing users must sign in again after cookie-name changes.

Separate ports do not provide encryption or independent database privileges. The services share the production database; API and database ports are not published. HTTPS and role checks remain essential. No accounts or clinics are seeded automatically.

## Proxy settings

Nginx Proxy Manager is at `http://10.10.1.108:81`. The user manages its settings:

| Domain | Scheme | Forward IP | Port |
| --- | --- | --- | --- |
| `dentabook.forgroup.space` | `http` | `10.10.1.113` | `3003` |
| `dentabook-admin.forgroup.space` | `http` | `10.10.1.113` | `3005` |

Use valid certificates for those exact names and Force SSL. Cloudflare, when proxying these records, should use Full (strict). Forward the entire host without path rewrites or extra `/api` rules. For administrator access limited to your team, use a Proxy Host IP access list with your actual trusted addresses; administrator authentication is still required.

The user reports both Proxy Hosts are configured. Local DNS resolves them to `10.10.1.108`. Do not redirect clinic traffic to a separate clinic domain. Production clinic links point to the public host.

## Production configuration

The private `.env` (mode 0600, ignored by Git) selects the production override:

```dotenv
COMPOSE_PROJECT_NAME=dentabook
COMPOSE_FILE=docker-compose.yml:docker-compose.production.yml
CLIENT_PORT=3003
ADMIN_PORT=3005
CLIENT_URL=https://dentabook.forgroup.space
ADMIN_URL=https://dentabook-admin.forgroup.space
NODE_ENV=production
```

Docker Compose 2.24.4 or newer is required. Run Compose commands from `/home/dentabook`. The base Compose file retains the combined development setup; development's runtime and database are not changed. Do not overwrite production `.env` with development configuration. The database volume remains `dentabook_dentabook_pgdata` with its existing generated password. The unused port 3004 and standalone clinic API were removed after combining clinic access with the patient site.

Public and clinic links use the public HTTPS origin at build time. Changing an origin requires a client rebuild. Administrator links remain absent from public navigation.

## Deliberate releases

Develop and test on `10.10.1.116` using a feature branch, then merge reviewed changes into `main`. Production images copy source during builds; development edits or pushes do not update production automatically.

Before a release, create a private database backup:

```bash
cd /home/dentabook
mkdir -p .local/backups
chmod 700 .local/backups
umask 077
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > ".local/backups/pre-release-$(date +%Y%m%d-%H%M%S).sql"
```

From a clean production checkout, pull the tested release and build before replacing services:

```bash
git switch main
git pull --ff-only origin main
docker compose build
docker compose up -d --wait
docker compose exec -T client nginx -c /etc/nginx/portals/nginx.conf -t
docker compose exec -T client nginx -c /etc/nginx/portals/nginx.conf -s reload
```

Resolve local changes before pulling. Never use `docker compose down -v` for an update; it deletes production data. The production Nginx configuration resolves API container addresses through Docker DNS. Backups are manual; scheduled backups are not configured.

## Verification

```bash
docker compose ps
curl --fail https://dentabook.forgroup.space/api/health
curl --fail https://dentabook-admin.forgroup.space/api/health
curl --fail --location --head https://dentabook-admin.forgroup.space/
curl --fail --head https://dentabook.forgroup.space/clinic/sign-in
# Must return 404:
curl --head https://dentabook.forgroup.space/admin/sign-in
```

Verify LAN roots with `http://10.10.1.113:3003/` and `http://10.10.1.113:3005/`. The admin redirect must retain port 3005. Verify external access separately because LAN and public DNS can differ.

The backend tests use isolated PostgreSQL data and cover session lifecycle, role/ownership boundaries, clinic approvals, cookie security, origin protection, administrator isolation, shared patient/clinic authorization, and invalid configuration. Production browser checks use the real APIs without creating records:

```bash
# From client/, with dependencies and Chromium installed:
PLAYWRIGHT_BASE_URL=https://dentabook.forgroup.space PLAYWRIGHT_ADMIN_URL=https://dentabook-admin.forgroup.space npm test -- portals.spec.js
```

The browser checks review 390px first, then 320px, 768px, and 1440px; public browsing, clinic registration/sign-in, patient access redirects, administrator root redirects, no horizontal overflow, input text sizes, touch targets, CSP, and blocked cross-portal routes. Complete real account sign-in using the intended user's credentials; there are no default administrator credentials.

## Verified deployment (2026-10-30)

All 33 backend tests passed. Both production browser tests passed through the actual HTTPS domains, with 390px checked first followed by 320px, 768px, and 1440px. Checks confirmed public/clinic access, administrator route isolation, protected-page redirects, relative administrator root redirects that preserve the browser origin, security headers/CSP, readable controls, and no horizontal overflow. Both HTTPS APIs report healthy connected databases. Correct login origins reach validation; foreign origins are rejected. LAN administrator access retains port 3005; clinic access succeeds on port 3003. No production accounts or clinic records were created by verification, and no real account credentials were used. The existing unrelated website containers remain healthy.

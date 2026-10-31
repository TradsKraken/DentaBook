# Docker deployment handoff

> Historical development-host notes. Production is on `10.10.1.113`; development remains on `10.10.1.116`. Follow [current production domain setup](../12_DOMAIN_SETUP.md) for hosting and releases.

Date: 2026-10-29. Branch: `main`. Base commit: `7fd4569`.

## Status at a glance

| Item | Status |
| --- | --- |
| Docker website, API, PostgreSQL | Built and running |
| Database schema and startup migrations | Applied successfully |
| Live patient authentication checks | Passed; temporary test data removed |
| Current local API origin | `http://10.10.1.116:3003`, development mode |
| External Nginx route and certificate | Pending on proxy server `10.10.1.108` |
| End-to-end browser access through domain | Pending proxy configuration |

## For the next session

Confirm this status with `git status`, `docker compose ps`, and the checks below.
Read this document before changing ports or the browser origin. If a knowledge
graph is available, query Docker deployment relationships with graphify.
Update this document when the proxy and HTTPS checks pass.

## Objective and decisions

Run the existing application in Docker and make it available through the user's
main/patient domain, `dentabook.forgroup.space`. Existing projects occupy host
ports 3000 and 5432; DentaBook uses separate ports and its own persistent volume.
The user declined Tailscale hosting and supplied the domain instead. No Tailscale
Serve configuration was created. No administrator account was created.

## Architecture and completed setup

The domain resolves here to `10.10.1.108`, an external OpenResty/Nginx proxy.
DentaBook runs on `10.10.1.116`. Requests should flow from the HTTPS proxy to
Nginx in the client container, which serves React and forwards `/api/` internally
to the Express container. Express uses PostgreSQL 16.

- Website upstream: `http://10.10.1.116:3003`.
- API diagnostic port: `127.0.0.1:5003`.
- Database: isolated internal Docker network; no host port exposed by the runtime.
- Persistent database volume: `dentabook_dentabook_pgdata`.
- Root `.env` is ignored by Git, mode 0600, with a generated database password.
- `CLIENT_URL=https://dentabook.forgroup.space` controls origin validation.
- Services restart with Docker using `unless-stopped`.
- API startup applies database migrations; client startup waits for a healthy API.
- Dockerfiles use lockfile-based `npm ci`. API health uses Node fetch, avoiding
  the unnecessary Alpine curl installation that stalled the original build.

Production session cookies require HTTPS. The direct HTTP upstream is useful
for diagnostics and browsing, but browser sign-in must use the configured HTTPS
domain. Do not disable secure cookies to make direct HTTP sign-in work.

## Future hosting proxy setup

- [x] User identified the existing proxy as Nginx.
- [x] Confirmed the website responds on port 3003.
- [ ] Configure the proxy on `10.10.1.108`; no configuration access was supplied.
- [ ] Obtain/install a valid certificate and enable HTTPS for the domain.
- [ ] Verify the domain from a browser and test real patient sign-in.

For Nginx Proxy Manager, create a Proxy Host with:

| Field | Value |
| --- | --- |
| Domain Names | `dentabook.forgroup.space` |
| Scheme | `http` |
| Forward Hostname / IP | `10.10.1.116` |
| Forward Port | `3003` |
| SSL | Valid certificate for this domain; Force SSL |

No separate `/api` proxy rule is needed: the client container already forwards
it. The last domain checks returned HTTP 404 and a TLS unrecognized-name error,
consistent with a missing proxy host/certificate. External Internet DNS and
reachability have not been verified.

## Verification

From the repository root:

```bash
docker compose up -d --build --wait
docker compose ps
curl --fail http://127.0.0.1:3003/api/health
curl --fail -I http://127.0.0.1:3003/patient/sign-in
# After the external proxy is configured:
curl --fail https://dentabook.forgroup.space/api/health
```

Live smoke tests through `http://client/api` inside the API container verified
database connectivity, directory responses, temporary patient registration,
login, HttpOnly/Secure cookies, authenticated account access, logout (204), and
revoked session rejection (401). The test account and sessions were deleted.
Both Docker production builds succeeded. No UI changes were made and no browser
layout suite was run in this session.

## Operations and deferred work

Stop with `docker compose down`; start with `docker compose up -d --wait`.
Do not use `down -v` unless intentionally deleting the database.
Logs: `docker compose logs --tail=100 api client db`.
To create an administrator, run `docker compose exec api npm run create-admin`
interactively and supply the actual administrator's details.

Booking submission and other unfinished product features remain as documented
in the README. Backup scheduling and future product features were not added.

## Files changed

- `client/Dockerfile`
- `server/Dockerfile`
- `docker-compose.yml`
- `.env` (private, ignored)
- This document

Implementation is now recorded in repository commits; verify current Git status for documentation follow-ups.

## Change log

- 2026-10-29: Built and started the isolated stack, verified live authentication,
  configured the domain origin, and documented the pending external proxy route.

## Portal security follow-up (2026-10-29)

See [portal security](../11_PORTAL_SECURITY.md) for the routes, implemented controls,
and encryption limits. Patient pages now use `/patient/...`, clinic registration
uses `/clinic/register`, and existing bookmarks redirect. Sessions are bound to
roles and revoked by database triggers after credential or role changes. HTTPS
cookies use a host-only prefix. Administrator sessions last one hour. The API
runs non-root with a read-only filesystem and no capabilities; PostgreSQL is on
an isolated internal network. Nginx applies CSP and browser security headers.

Verification: the final full sequential backend suite passed all 26 tests,
including the credential-race guard. All 16 browser tests passed against production Nginx, including
320/390/768/1440px layouts, legacy redirects and inline-script CSP rejection.
Live real-PostgreSQL checks passed role boundaries and trigger revocation.
No test accounts remain. The implementation is recorded in commits `cdcbff0` and `f3400a7`; documentation follow-ups may still be uncommitted.

The latest HTTPS domain request succeeds at TLS but returns HTTP 404 via
Cloudflare; the external Nginx route still needs completion. No access to that
proxy configuration has been supplied. At-rest database/backup encryption, TLS
on internal hops, MFA, and persistent shared throttling remain unimplemented.

Final API deployment and real PostgreSQL login passed after the credential-race guard was deployed. All services are healthy.

## Local-access correction (2026-10-29)

The user clarified that the project is not hosted yet. The current supported
address is `http://10.10.1.116:3003`. `.env` now sets that exact CLIENT_URL and
NODE_ENV=development. Compose allows NODE_ENV to be configured while retaining
production as its default. The API was recreated and Nginx reloaded. Role checks,
session revocation, bcrypt and CSRF checks remain enabled. Future domain/proxy
steps above are optional hosting work, not blockers for local sign-in. Local
HTTP is unencrypted; production requires HTTPS and production cookie settings.

## Domain activation follow-up (2026-10-30)

The user requested `dentabook.forgroup.space` and chose to apply the hosting settings themselves. The existing app on `10.10.1.116:3003` remains healthy, with the LAN browser origin still configured. Nginx Proxy Manager 2.15.1 responds on `10.10.1.108:81`. Public HTTPS through Cloudflare returns 404; local HTTPS still lacks a matching certificate. This checkout is on `10.10.1.113`, not the app host. No duplicate deployment was created and no remote runtime settings were changed. See [domain setup](../12_DOMAIN_SETUP.md) for the exact proxy, certificate, production origin, and verification steps. Activation remains pending the user's configuration.

## Production host correction and deployment (2026-10-30)

The user clarified that `10.10.1.116` is development and `10.10.1.113` is production. The earlier proposed proxy destination is superseded. Built and started the production stack in `/home/dentabook` on `10.10.1.113:3003`, from application commit `1b0d0ee`, with independent generated credentials and database volume. `.env` is ignored and mode 0600; production origin and secure cookie settings are enabled. No development database was copied or modified. The existing other project's containers remain healthy. Live API and browser verification passed, including 390/320/768/1440px, unauthenticated portal API rejection, origin protection, and actual empty directory data. No test data was inserted. The domain now returns 502 through the LAN proxy and a same-URL redirect through Cloudflare; user must apply `http://10.10.1.113:3003` as proxy upstream, enable the domain certificate/Force SSL, and use Cloudflare Full (strict). See [current production instructions](../12_DOMAIN_SETUP.md).

## Separate production portal ports (2026-10-30)

At the user's request, production now selects `docker-compose.production.yml` via its private `.env`. Patients use `10.10.1.113:3003`, clinics `:3004`, and administrators `:3005`. Each listener rejects other portal pages and forwards to its own API process with an explicit `APP_PORTAL`, origin, allowed endpoint set, and role-checked session cookie. API/database host ports were removed. Development stays on the base Compose configuration on `10.10.1.116`; its runtime was not modified. Database credentials and the existing production volume were retained. A private pre-change SQL backup and environment backup are under ignored `.local/`.

The complete backend suite passed all 32 tests. After configuration validation was hardened against inherited object property names, the six focused isolation tests passed again. The standard frontend regression run passed 15 tests with the three production-only checks correctly skipped. Live production listener tests additionally cover cross-port HTML/API rejection, exact origins, actual empty directory responses, access redirects, security headers/CSP, and 390/320/768/1440px layouts. Those checks found and prompted fixes for 14px desktop search inputs and a navigation target narrower than 44px.

Production uses patient host `dentabook.forgroup.space`, clinic host `clinic.dentabook.forgroup.space`, and admin host `admin.dentabook.forgroup.space`. The user still needs to configure those HTTPS Proxy Hosts at `10.10.1.108:81` using HTTP upstream ports 3003/3004/3005 and valid matching certificates. Public HTTPS authentication remains unverified; local patient-domain HTTPS last returned 502, and the new clinic/admin names lacked matching certificates. See [current production instructions](../12_DOMAIN_SETUP.md).

Final live browser verification passed both separated-portal tests after the control fixes (390/320/768/1440px), with all three API health endpoints healthy. No production test accounts were created. Public HTTPS sign-in still awaits proxy/certificate configuration.

## Staff LAN root redirect correction (2026-10-30)

Fixed the staff root redirects leaking internal ports 81/82 by configuring relative Nginx redirects. Client rebuilt and deployed; LAN redirect-follow checks return HTTP 200 on the correct 3004 and 3005 ports. Tests now assert the exact relative Location and preserved browser origin, using actual LAN endpoints. Patient HTTPS API is healthy. Exact user-created clinic/admin domain names are pending clarification because the runtime's current staff names lack proxy hosts/certificates.

## Confirmed domains and shared clinic access (2026-10-30)

The user supplied the actual administrator domain, `dentabook-admin.forgroup.space`, and chose to share clinic access with the patient port. Production now publishes only 3003 (patient/clinic) and 3005 (administrator). Port 3004 and the unused clinic API process were removed. The public API uses `APP_PORTAL=public`, allows patient/clinic endpoints, and rejects administrator routes and administrator sessions. Patient/clinic role boundaries remain enforced by workspace guards. Administration has its own process, exact HTTPS origin, and cookie. Clinic links now point to `https://dentabook.forgroup.space/clinic/...`. Admin's origin is `https://dentabook-admin.forgroup.space`. Production credentials and PostgreSQL volume were preserved. Development was not changed.

All 33 backend tests passed, including the new shared patient/clinic boundary test. Both actual HTTPS health APIs report connected databases. Correct-origin patient/clinic/admin login requests reach validation, while foreign origins return 403. Clinic HTTPS sign-in and administrator HTTPS root redirects return HTTP 200. The admin LAN root retains port 3005, and clinic LAN sign-in returns HTTP 200 on port 3003. Real-browser HTTPS checks are in `client/tests/browser/portals.spec.js`; current instructions are in [production setup](../12_DOMAIN_SETUP.md). Earlier three-port and pending-certificate notes are superseded.

Final verification passed both production browser tests through the actual patient/clinic and administrator HTTPS domains at 390/320/768/1440px. No credentials or production test data were created.

## Confirmed public-route redirect correction (2026-10-31)

The operator confirmed the working NPM settings are Force SSL off and HTTP/2 Support on. With Force SSL enabled, public Cloudflare requests repeatedly redirected to the same HTTPS URL, while direct LAN HTTPS succeeded. After disabling it, public homepage/clinic checks return 200 without redirects and admin root returns 200 after one expected sign-in redirect. The current deployment and client guides have been corrected; earlier Force SSL recommendations are superseded for this route. This change was applied in NPM by the operator, not in application code.

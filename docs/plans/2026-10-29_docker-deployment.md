# Docker deployment handoff

Date: 2026-10-29. Branch: `main`. Base commit: `7fd4569`.

## Status at a glance

| Item | Status |
| --- | --- |
| Docker website, API, PostgreSQL | Built and running |
| Database schema and startup migrations | Applied successfully |
| Live patient authentication checks | Passed; temporary test data removed |
| Main domain configuration in API | Set to `https://dentabook.forgroup.space` |
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
- Database diagnostic port: `127.0.0.1:5435`.
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

## Remaining proxy setup

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

Changes are local and have not been committed or pushed.

## Change log

- 2026-10-29: Built and started the isolated stack, verified live authentication,
  configured the domain origin, and documented the pending external proxy route.

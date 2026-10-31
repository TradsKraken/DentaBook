# Portal routes and security

Development is available on `10.10.1.113:3013` (patients/clinics) and `10.10.1.113:3015` (administration), with independent configuration, images, networks, and database storage. The older `10.10.1.116` installation is optional. See [same-server development](14_SAME_SERVER_DEVELOPMENT.md). Production runs on `10.10.1.113`: patient and clinic access share port 3003 and `https://dentabook.forgroup.space`; administration uses port 3005 and `https://dentabook-admin.forgroup.space`. See [current production setup](12_DOMAIN_SETUP.md). Local HTTP is unencrypted; credentials use the HTTPS domains.

| Portal | Sign-in | Private pages | Registration |
| --- | --- | --- | --- |
| Patient | `/patient/sign-in` | `/patient/account`, `/patient/appointments`, `/patient/book` | `/patient/register` |
| Clinic | `/clinic/sign-in` | `/clinic` | `/clinic/register` |
| Administrator | `/admin/sign-in` | `/admin` | Operator-only CLI |

The homepage and directory remain public. Old `/account`, `/appointments`,
`/book`, and `/register-clinic` bookmarks redirect to their portal routes,
preserving query strings. Patient return destinations accept only known patient
pages. Clinic and administrator pages have dedicated headers. Administrator
links do not appear in public navigation.

## Server enforcement

The Express API enforces authorization independently of the UI. Production uses a public API process (`APP_PORTAL=public`) for patients and clinics, and a separate administrator API (`APP_PORTAL=admin`). Public pages and APIs reject administration routes; administration rejects patient/clinic routes. Each process checks its exact HTTPS browser origin. Portal selection comes from process configuration, not a caller-supplied header. API and database ports are not published.

Ordinary accounts can sign in only to their designated role. An explicitly provisioned [owner account](13_OWNER_ACCESS.md) can sign into each portal with a session scoped to that portal’s role. Development-only owners are blocked by production APIs. The public process accepts only patient or clinic sessions; the administrator process accepts only system administrators, even if a foreign session token is copied into its cookie. `/auth/login` remains a clinic-only alias for `/auth/clinic/login`. Workspaces independently enforce roles. Ordinary clinic staff require clinic approval and record ownership; a clinic-role owner session can explicitly select an existing clinic for read-only access without changing approval or ownership. Patient appointments use the signed-in patient's ID, never a caller-supplied ID. The combined development setup retains the same role checks.

Sessions use random 256-bit tokens; only SHA-256 hashes are stored. They are bound
to the sign-in role. Database triggers revoke all sessions when an account's role
or password hash changes. Owner-grant, development-only flag, and username changes also revoke sessions. Re-login rotates the browser session; logout revokes
it. Administrator and owner sessions expire after one hour; other accounts after eight hours.

Production uses `__Host-dentabook_public_session` on the shared patient/clinic host and `__Host-dentabook_admin_session` on the administrator host. Cookies have `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/`, and no Domain attribute. Cookies are not isolated by port, so separate hosts and names protect administrator session separation. Patients and clinic staff share one browser session on their common host and sign out to switch accounts. Existing users must sign in again after a cookie-name change. Default combined local deployments retain `dentabook_session` (or its secure host-prefixed form).

Passwords use bcrypt at cost 12. Mutations require the application header,
reject mismatched Origins and cross-site Fetch Metadata. Private responses are
`no-store`. Existing login and registration rate limits remain per-process and
in-memory, not persistent distributed account lockouts.

## Browser and container controls

Nginx restricts scripts and connections to the same origin, disables framing and
plugins, and restricts browser permissions. Inline styles remain allowed for
React styles; inline scripts and eval are blocked. Assets retain security headers.

The API runs as a non-root user on a read-only filesystem with temporary `/tmp`,
no Linux capabilities, and no privilege escalation. PostgreSQL has a separate
internal Docker network. The production override removes API/database host ports; the base development Compose file retains loopback diagnostic mappings.
Compose requires a database password rather than supplying a built-in fallback.
These controls do not protect against a compromised host or Docker operator.

## Encryption and deployment limits

Browser-facing HTTPS has been verified. For this deployment, NPM Force SSL is off and HTTP/2 Support is on; enabling Force SSL caused a public redirect loop. This redirect setting does not establish Cloudflare-to-origin encryption, which depends on separate origin/TLS configuration. Forward the patient/clinic HTTPS host to `10.10.1.113:3003` and the administrator HTTPS host to `10.10.1.113:3005`. Direct HTTP upstream access is for diagnostics, not submitting credentials. Each API uses its exact HTTPS browser origin and secure portal cookie. Separate ports do not by themselves provide encryption or replace role checks.

The proxy-to-app LAN hop and API-to-PostgreSQL Docker hop do not currently use
TLS. Database disks and backups are not encrypted by these changes. Encryption
at rest needs a host/storage and backup key-management setup. Password hashing
is not database encryption; host/database operators can access stored personal
information.

MFA, account recovery, email verification, shared/persistent login throttling,
security audit logging, and independent penetration testing remain future work.

## Verification

```bash
cd server
node --test --test-concurrency=1 tests/*.test.js
cd ../client
npm run build
npm test
# Test the public and administrator HTTPS listeners and their security headers:
PLAYWRIGHT_BASE_URL=https://dentabook.forgroup.space PLAYWRIGHT_ADMIN_URL=https://dentabook-admin.forgroup.space npm test -- portals.spec.js
```

Install Playwright Chromium first, or select a browser with PLAYWRIGHT_CHANNEL
or PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH. The default test server uses port 4173.
Tests cover login/role boundaries, record ownership, session lifecycle, HTTPS
cookies, CSRF checks, clinic approvals, portal redirects, and layouts at 320,
390, 768, and 1440px. The production-only test verifies CSP rejects inline code.

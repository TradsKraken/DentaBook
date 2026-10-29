# Portal routes and security

All portals use `https://dentabook.forgroup.space`.

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

The Express API enforces authorization independently of the UI. Login endpoints
accept only their designated role. `/auth/login` remains a clinic-only alias for
`/auth/clinic/login`. Workspace APIs verify both the session and required role.
Clinic workspaces require approval and derive ownership from the account.
Patient appointments use the signed-in patient's ID, never a caller-supplied ID.

Sessions use random 256-bit tokens; only SHA-256 hashes are stored. They are bound
to the sign-in role. Database triggers revoke all sessions when an account's role
or password hash changes. Re-login rotates the browser session; logout revokes
it. Administrator sessions expire after one hour; other roles after eight hours.

HTTPS/production cookies use `__Host-dentabook_session`, `Secure`, `HttpOnly`,
`SameSite=Strict`, `Path=/`, and no Domain attribute. The host prefix protects
against parent-domain cookie injection from sibling subdomains. Development HTTP
uses an unprefixed cookie. Existing production users must sign in again.

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
internal Docker network. API/database debug ports bind to host loopback.
Compose requires a database password rather than supplying a built-in fallback.
These controls do not protect against a compromised host or Docker operator.

## Encryption and deployment limits

No system is guaranteed unbreachable. Browser-to-proxy encryption requires a
valid certificate and Force SSL on the external Nginx proxy. Forward the domain
to `http://10.10.1.116:3003`. Direct HTTP upstream access is for diagnostics, not
submitting credentials. The API uses the exact HTTPS browser origin and Secure
cookies.

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
# Test production Nginx headers and CSP against Docker:
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 npm test
```

Install Playwright Chromium first, or select a browser with PLAYWRIGHT_CHANNEL
or PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH. The default test server uses port 4173.
Tests cover login/role boundaries, record ownership, session lifecycle, HTTPS
cookies, CSRF checks, clinic approvals, portal redirects, and layouts at 320,
390, 768, and 1440px. The production-only test verifies CSP rejects inline code.

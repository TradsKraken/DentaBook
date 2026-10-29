# Clinic accounts and approval setup

This increment implements real clinic registration, sign-in, administrator review, and the approved clinic dashboard. It requires the PostgreSQL database and API; there is no browser-stored account or fallback administrator.

## Run the application

1. Configure the root `.env` using `.env.example`. Choose a database password and set `CLIENT_URL` to the exact address used by the browser. Use HTTPS for a non-local deployment.
2. With Docker running, start the existing stack from the repository root:

```powershell
docker compose up -d --build
```

The database initializes from `server/database/init.sql`. The API applies versioned migrations from `server/database/migrations/` on startup. Existing database volumes are retained; do not delete them to apply this change. Migration failures stop API startup. If an existing installation contains email addresses differing only by capitalization, resolve those duplicate accounts before applying the unique email index.

## Create the first administrator

Run this operator-only command against the intended database:

```powershell
docker compose exec api npm run create-admin
```

It asks for the administrator's name, email, password, and password confirmation. Password input is hidden in an interactive terminal. There are no default credentials, public administrator registration, or automatic promotion of existing users.

For a locally running Node server, configure `server/.env` with the database settings and use `npm.cmd run create-admin` from `server/`. Use `DB_HOST=localhost` when connecting to the database's loopback port. Configuration must point to the intended database before running the command.

## Clinic workflow

1. Open `/register-clinic`. Submit the authorized account holder's details, clinic contact information, and a clinic registration/license reference for review.
2. The server creates the staff account and pending clinic in one transaction. A clinic remains unpublished until approved.
3. The clinic signs in at `/clinic/sign-in` to view its pending/rejected status and review notes. Pending, rejected, and suspended clinics cannot open the clinic dashboard.
4. A system administrator signs in separately at `/admin/sign-in` and is directed to `/admin`. The administrator sign-in uses a separate endpoint and accepts only administrator accounts; the clinic sign-in accepts only clinic staff accounts. Review the registration reference and contact information, perform the necessary checks outside the application, then approve or reject the registration. Rejection requires a reason.
5. Approval records the reviewer, review time, and notes. It publishes the clinic and unlocks `/clinic`. A clinic owner can refresh their status without signing out.
6. The dashboard shows the clinic's saved contact details and database counts for dentists, published services, and pending appointments. Editing these resources is the next increment.

No email notification is claimed or sent in this increment. Registration outcomes are available after sign-in. The registration reference is not an automatic verification or proof of credentials, and is not included in the public clinic API.

## Session and deployment behavior

- Passwords are hashed with bcrypt. Passwords require at least 12 characters and at most 72 UTF-8 bytes.
- Sessions are random opaque values; only their SHA-256 hashes are stored in PostgreSQL. Cookies use `HttpOnly`, `SameSite=Strict`, and `/api` scope, and are secure in production/HTTPS. Sessions expire after eight hours and are revoked on logout.
- API authorization checks the current database account and current clinic approval on every protected request. Public registration cannot choose an administrator role or an approved status.
- Mutations require the application's custom request header and reject a mismatched browser origin. Authenticated responses are marked `no-store`.
- Login and registration attempts are rate limited in memory per API process/IP. If deploying behind a reverse proxy, configure `TRUST_PROXY` with only that proxy's actual addresses/CIDRs so client addresses are interpreted correctly. The API host port is bound to loopback. Do not trust arbitrary forwarded addresses. Multiple API processes will need a shared rate-limit store before scaling out.
- Password recovery, email ownership verification, credential document uploads, staff invitations, and clinic profile/service/schedule editing are not implemented in this increment.

Session controls follow the [OWASP session management guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) and [Express security guidance](https://expressjs.com/en/advanced/best-practice-security.html).

## Validation

Run `npm.cmd test` from `server/`. The onboarding suite applies the actual schema and migration against an isolated PGlite PostgreSQL engine, then exercises the Express HTTP API. It covers validation, registration rollback, password hashes, case-insensitive duplicate emails, approval/rejection, access boundaries, rate limits, live role/status changes, session expiry, and logout. PGlite is a test dependency and is not used by the deployed application.

Run `npm.cmd run test:browser` from `client/` for phone-first registration, sign-in, review screens, dashboard access, public pages, touch targets, and overflow checks. Browser fixtures exist only in test files. Docker PostgreSQL 16 deployment connectivity remains unverified until the local Docker engine is running and the configured stack is exercised.

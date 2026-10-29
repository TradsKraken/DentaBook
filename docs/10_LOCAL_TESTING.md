# Running the complete local website on Windows

The website can run with native PostgreSQL 16 when Docker Desktop/WSL is unavailable. It uses the same Express API, schema, migrations, account records, sessions, and approval workflow. PGlite, browser mocks, and simulated data are not used by this runtime.

## Open and sign in

- Website: http://localhost:3000
- Clinic registration: http://localhost:3000/register-clinic
- Patient registration: http://localhost:3000/patient/register
- Patient sign-in: http://localhost:3000/patient/sign-in
- Clinic sign-in: http://localhost:3000/clinic/sign-in
- Administrator sign-in: http://localhost:3000/admin/sign-in
- Administrator workspace: http://localhost:3000/admin
- Clinic workspace: http://localhost:3000/clinic

The requested administrator email is `test@gmail.com`. Its generated password is stored in `.local/admin-credentials.txt`, which is ignored by Git. No password is included in the source code or documentation. Use this account at `/admin/sign-in`; it cannot sign in through patient or clinic portals. Use a different email to register a clinic staff account, then sign in through `/clinic/sign-in`. The public website does not display an administrator sign-in link. `/sign-in` now redirects to patient sign-in, following the added patient-account requirement.

Patients can browse without signing in. Opening `/book`, `/appointments`, or `/account` requires patient sign-in. Patient registration is separate from clinic registration and does not require clinic approval. Each account has one role; use a different email if you need to test another role. Booking submission remains unavailable until the booking backend is implemented.

Register a clinic, sign in with that clinic account, and check its pending status. Use another browser profile/private window to sign in as the administrator and approve it. The clinic owner can then refresh their registration status to open the dashboard.

## Restart after closing the services or restarting Windows

Double-click `start-local.bat` in the project root. It starts the existing native database, API, and frontend as needed. It reuses existing data and does not reset passwords or create example clinics.

Alternatively, from PowerShell in the repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1
```

Logs are under `.local/logs/`. Database files live under `.local/postgres-data/`; retain this directory to retain accounts and clinic data. The local database and credentials are private runtime files and must not be committed or included in client delivery.

## Local configuration

| Component | Address / configuration |
| --- | --- |
| Website | `127.0.0.1:3000`, open using `http://localhost:3000` |
| API | `127.0.0.1:5000`, configured by ignored `server/.env` |
| PostgreSQL 16 | `127.0.0.1:55432` |
| Root `.env` | Retained for the independent Docker configuration |

Use `localhost` in the browser so its origin matches the configured `CLIENT_URL`. The API still rejects requests from unapproved browser origins. This configuration binds services to the local computer; it does not publish a public website or replace the HTTPS deployment setup.

## Reinstalling the native runtime on another Windows machine

The binaries come from the [EDB PostgreSQL binary distribution](https://www.enterprisedb.com/download-postgresql-binaries), linked by the [PostgreSQL Windows download page](https://www.postgresql.org/download/windows/). The version used here is PostgreSQL 16.15.

After installing the project's npm dependencies, download and extract the binary archive inside this workspace:

```powershell
New-Item -ItemType Directory -Force .local/downloads,.local/postgresql | Out-Null
curl.exe --fail --location https://get.enterprisedb.com/postgresql/postgresql-16.15-5-windows-x64-binaries.zip --output .local/downloads/postgresql.zip
tar.exe -xf .local/downloads/postgresql.zip -C .local/postgresql pgsql/bin pgsql/lib pgsql/share
node scripts/setup-local.cjs YOUR_ADMIN_EMAIL
.\start-local.bat
```

The setup script creates a generated root database password when `.env` is absent. An existing root `.env` must use the generated 64-character hexadecimal password for this local setup script. Existing server settings pointing to another database are not overwritten. Setup reuses an existing administrator without changing its password and will not promote an unrelated account.

## Verification performed

A real Microsoft Edge browser was used against the running website/API/native PostgreSQL database to register a temporary clinic, sign in, verify pending dashboard denial, approve the clinic using the requested administrator, reload the approved dashboard, open its public profile, and verify logout. No request interception was used. Temporary verification records were removed afterward; the requested administrator was retained.

Docker Desktop failed because its WSL version check timed out. The Docker container path remains available but was not verified in this session. No Windows/WSL reset or machine restart was performed.

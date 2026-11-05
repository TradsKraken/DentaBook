# DentaBook

Dental clinic discovery, treatment cost estimation, online appointment booking, and clinic management.

**Book your smile, know your cost.**

Patients will browse clinics and dentist credentials, select services, estimate costs, and request appointments. Dentists review requests before patients pay the required deposit and receive confirmation. Patients can track, cancel, request rescheduling, and leave feedback after completed visits.

Clinics will manage profiles, services, prices, dentists, schedules, requests, and payment records. Platform administrators will review clinic registrations.

## Current state

Development is proceeding in production increments, with a mobile-first interface based on the supplied logo and blue-and-white theme. The first increment includes the public homepage, clinic directory, public profiles, service information, and a cost estimator based on published clinic prices.

The directory reads approved clinic records from PostgreSQL through `/api/clinics`; it does not supply invented listings, ratings, credentials, or prices. Only active services and dentist profiles are public. Empty results and service failures have distinct states. No appointments are stored in browser storage, and there is no public staff dashboard.

Clinic registration, sign-in, administrator approval/rejection, and the protected clinic dashboard are now implemented. See [clinic accounts setup](docs/09_CLINIC_ACCOUNTS_SETUP.md) to configure the database and create the first administrator. Accounts are not seeded automatically. An operator can explicitly provision [owner access to all three portals](docs/13_OWNER_ACCESS.md), including the requested development-only account and an existing-clinic selector.

Patient registration, sign-in, account information, and an account-scoped appointment list are implemented. Visitors can browse clinics, services, and estimates without an account. Booking, personal appointments, and account pages require patient sign-in. Use `/patient/register` and `/patient/sign-in`; `/sign-in` is now a shortcut to patient sign-in.

Clinic setup, dentist-service assignments, duration-based appointment requests, clinic review, manually verified GCash deposits, private receipts, and unpaid Pay at clinic confirmation were released to production on 3 November 2026. Booking prefills the account email when available; patients can enter a different appointment contact email without changing their account email or record ownership. Unconfigured clinics show honest unavailable payment states.

Cancellation and clinic-approved rescheduling are now live, released and verified on 3 November 2026. Clinics explicitly set enabled patient actions, notice deadlines, and terms. Cancellation preserves payments and flags refund review. Reschedule requests retain the original reservation until the replacement time is approved atomically, preserving the dentist, treatment, original quote/duration, and payment records. See [appointment changes](docs/16_APPOINTMENT_CHANGES.md).

The development preview adds clinic-configured private intake, saved clinic follow-up/patient replies, patient name/phone/password editing, owner-managed manager/appointment-staff invitations, and easier multi-dentist/multi-day working hours with split shifts and editing. See [intake, staff access, and working hours](docs/17_INTAKE_STAFF_AND_HOURS.md). These changes are not yet released to production. Account-email editing awaits verified delivery; follow-up currently appears in the signed-in portals.

Notifications, completion, feedback, password recovery, verified email changes, date-specific closures, automated refunds, cash-collection recording, dentist-specific access/MFA, and complete history pagination remain future increments.

## Development on this server

Use **http://10.10.1.113:3013** for the development patient/clinic website and **http://10.10.1.113:3015/admin/sign-in** for development administration. The development-only owner login is `admin` / `admin123`. This instance has its own database, containers, and images. Rebuild it with `./scripts/development.sh up -d --build --wait`; production continues on ports 3003 and 3005. See [same-server development](docs/14_SAME_SERVER_DEVELOPMENT.md) for operations and isolation details. The older 10.10.1.116 development computer is optional.

## Preview the website locally

The complete local runtime is now configured with native PostgreSQL 16. Double-click `start-local.bat` to start/reuse the database, API, and website. Open http://localhost:3000. See [local testing and administrator access](docs/10_LOCAL_TESTING.md) for credentials location and the registration/approval test steps.

For frontend development only:

```powershell
cd client
npm.cmd install
npm.cmd run dev
```

Open the URL printed by Vite (normally http://localhost:3000). Start the backend and provision PostgreSQL for clinic data; the frontend shows a connection error when the API is unavailable. The Docker setup below runs all three services. No production clinic data is seeded automatically.

The cost calculator uses a selected clinic's published prices. It does not collect payment or submit a request. Signed-in patients use `/patient/book` to request a treatment and an available time. Staff tools require server-side authentication and approval. Clinic staff use `/register-clinic`, `/clinic/sign-in`, and `/clinic`. Administrators use the separate `/admin/sign-in` and `/admin` area. The server checks roles at sign-in and restricts dashboard access by role and clinic status.

```powershell
# From client/
npm.cmd run build
npm.cmd test
npm.cmd run test:browser

# From server/
npm.cmd install
npm.cmd test
```

Automated browser checks use Playwright Chromium (or an explicitly configured installed browser) and test-only API fixtures. The account integration tests exercise the Express API using the real schema and migrations in an isolated PGlite PostgreSQL engine. A separate real-browser verification has also passed against the running native PostgreSQL 16 instance, without intercepted requests. The Docker deployment and HTTPS domain/portal checks have passed. Use `PLAYWRIGHT_CHANNEL` or `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to select an available browser. The automated checks start a local development server when needed.

See the [ordered completion checklist](docs/05_DELIVERY_ROADMAP.md) for the remaining work, and [incremental delivery status](docs/08_IMPLEMENTATION_STATUS.md) for implementation details and validation limits.

## File organization

```text
DentaBook/
|-- client/                         React + Vite frontend and Nginx configuration
|   |-- public/branding/            Original DentaBook logo
|   `-- src/                        Frontend source
|-- server/                         Express API and Dockerfile
|   `-- database/init.sql           PostgreSQL initialization
|-- docs/                           Project specifications and workflows
|   |-- design/                     Interface reference image
|   `-- references/                 Original client brief
|-- internal/                       Private development notes; exclude from handoff
|   `-- references/                 Previous project's architecture reference
|-- docker-compose.yml              Client, API, and database services
|-- .env.example                    Environment configuration template
|-- sync.bat                        Windows sync launcher
|-- sync.ps1                        Git pull, commit, and push helper
`-- README.md
```

## Documentation

- [Portal routes and security controls](docs/11_PORTAL_SECURITY.md)

- [Project overview](docs/01_PROJECT_OVERVIEW.md)
- [Patient workflow](docs/02_PATIENT_WORKFLOW.md)
- [Clinic and administrator workflow](docs/03_CLINIC_ADMIN_WORKFLOW.md)
- [Feature specifications](docs/04_FEATURE_SPECIFICATIONS.md)
- [Delivery roadmap](docs/05_DELIVERY_ROADMAP.md)
- [DentaBook architecture](docs/06_SYSTEM_ARCHITECTURE.md)
- [Brand and interface guide](docs/07_BRAND_AND_INTERFACE_GUIDE.md)
- [Original client brief](docs/references/original-client-brief.txt)

## Visual assets

- [Original logo](client/public/branding/dentabook-logo.jpg): served by Vite at `/branding/dentabook-logo.jpg`.
- [Interface reference](docs/design/interface-reference.jpg): blue-and-white layouts for discovery, profiles, estimation, booking, and administration. DentalLink is the reference's sample name; this project is DentaBook.

The previous Fortek architecture document is preserved under `internal/references/` as historical input. Use the DentaBook architecture document for this project's plan.

## Production hosting

Development now also runs on `10.10.1.113:3013` with administration on port `3015`; the older `10.10.1.116` setup is optional. Production runs independently on `10.10.1.113` with shared patient/clinic port `3003` and separate administrator port `3005`, its own database, and private environment configuration. The production override isolates administrator pages, APIs, browser origin, and session cookie from the patient/clinic site; patient and clinic account roles remain enforced on the server. The domain proxy forwards `dentabook.forgroup.space` to `10.10.1.113:3003` and `dentabook-admin.forgroup.space` to `10.10.1.113:3005`. See [production domain setup and release workflow](docs/12_DOMAIN_SETUP.md). Development changes reach production only when a tested release is explicitly rebuilt and deployed.

## Saved production versions

Release tested website changes with `python3 scripts/releases.py deploy --note "Describe the website feature or fix."`. Each release saves the previous running website and a database backup, keeps the five newest saved versions, and removes the oldest after the new recovery copy is verified. Use `python3 scripts/releases.py list` to view them. See [version retention and rollback](docs/15_RELEASE_VERSIONS.md). Website update notes describe product changes; project work stays out of that history.

## Docker quick start

From the repository root:

```powershell
Copy-Item .env.example .env
# Configure .env for your environment.
docker compose up -d --build
```

Default addresses:

- Frontend: http://localhost:3000
- API health: http://localhost:5000/api/health
- Database: localhost:5432 (host loopback)

Stop services with `docker compose down`.

## Windows backup and sync

Run `sync.bat`, or `./sync.ps1 -Message "Describe your changes"` from the repository root. This helper pulls from `origin/main`, stages all changes, commits, and pushes to GitHub.

## Client handoff

Include frontend, backend, required configuration, and client documentation. Exclude `internal/`, private environment files, and developer records. See [internal delivery notes](internal/README.md).

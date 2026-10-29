# DentaBook

Dental clinic discovery, treatment cost estimation, online appointment booking, and clinic management.

**Book your smile, know your cost.**

Patients will browse clinics and dentist credentials, select services, estimate costs, and request appointments. Dentists review requests before patients pay the required deposit and receive confirmation. Patients can track, cancel, request rescheduling, and leave feedback after completed visits.

Clinics will manage profiles, services, prices, dentists, schedules, requests, and payment records. Platform administrators will review clinic registrations.

## Current state

Development is proceeding in production increments, with a mobile-first interface based on the supplied logo and blue-and-white theme. The first increment includes the public homepage, clinic directory, public profiles, service information, and a cost estimator based on published clinic prices.

The directory reads approved clinic records from PostgreSQL through `/api/clinics`; it does not supply invented listings, ratings, credentials, or prices. Only active services and dentist profiles are public. Empty results and service failures have distinct states. No appointments are stored in browser storage, and there is no public staff dashboard.

Clinic registration, sign-in, administrator approval/rejection, and the protected clinic dashboard are now implemented. See [clinic accounts setup](docs/09_CLINIC_ACCOUNTS_SETUP.md) to configure the database and create the first administrator. There are no default administrator credentials.

Patient registration, sign-in, account information, and an account-scoped appointment list are implemented. Visitors can browse clinics, services, and estimates without an account. Booking, personal appointments, and account pages require patient sign-in. Use `/patient/register` and `/patient/sign-in`; `/sign-in` is now a shortcut to patient sign-in.

Online booking submission is still unavailable. Profile/service/dentist editing, schedules, booking creation, notifications, payments, cancellation/rescheduling, reviews, and password recovery remain future increments. Signing in does not simulate these unfinished features.

## Preview the website locally

The complete local runtime is now configured with native PostgreSQL 16. Double-click `start-local.bat` to start/reuse the database, API, and website. Open http://localhost:3000. See [local testing and administrator access](docs/10_LOCAL_TESTING.md) for credentials location and the registration/approval test steps.

For frontend development only:

```powershell
cd client
npm.cmd install
npm.cmd run dev
```

Open the URL printed by Vite (normally http://localhost:3000). Start the backend and provision PostgreSQL for clinic data; the frontend shows a connection error when the API is unavailable. The Docker setup below runs all three services. No production clinic data is seeded automatically.

The cost calculator uses a selected clinic's published prices and links to its contact details. It does not collect payment or submit an appointment request. Staff tools require server-side authentication and approval. Clinic staff use `/register-clinic`, `/clinic/sign-in`, and `/clinic`. Administrators use the separate `/admin/sign-in` and `/admin` area. The server checks roles at sign-in and restricts dashboard access by role and clinic status.

```powershell
# From client/
npm.cmd run build
npm.cmd test
npm.cmd run test:browser

# From server/
npm.cmd install
npm.cmd test
```

Automated browser checks use Playwright with installed Microsoft Edge and test-only API fixtures. The account integration tests exercise the Express API using the real schema and migrations in an isolated PGlite PostgreSQL engine. A separate real-browser verification has also passed against the running native PostgreSQL 16 instance, without intercepted requests. Docker deployment remains unverified. On other systems, adjust `channel` in `client/playwright.config.js` to an available Playwright browser. The automated checks start a local development server when needed.

See [incremental delivery status](docs/08_IMPLEMENTATION_STATUS.md) for the next parts and validation limits.

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

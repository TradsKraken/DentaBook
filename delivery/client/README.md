# DentaBook

**Book your smile, know your cost.**

DentaBook helps people find approved dental clinics, explore treatments, and estimate costs using a clinic's published prices. Patients can create accounts, clinic representatives can submit their clinics for review, and platform administrators can approve or reject those submissions.

**Development status, last updated 31 October 2026:** the clinic discovery, accounts, and clinic-approval foundation is delivered. **Clinic content management is the next planned increment.** Online appointment submission, live scheduling, and payments remain planned work.

[Development status](#development-status) · [Recent updates](#recent-updates) · [Website history](#website-update-history) · [Next planned release](#next-planned-release) · [Website addresses](#website-addresses) · [Documentation](#documentation)

## Development status

| Area | Status | What this means for the client |
| --- | --- | --- |
| Public website | Available | Visitors can use the homepage, treatment information, about page, and navigation without signing in |
| Clinic discovery | Available | Search approved clinics and view their saved public details, active services, and active dentist information |
| Cost calculator | Available | Estimate selected treatments using a clinic's published prices; the estimate does not create a booking or collect payment |
| Patient accounts | Available | Register, sign in/out, view account information, and access protected patient pages |
| Patient appointment list | Read-only | Display existing records linked to the signed-in patient, or an empty state; new appointment requests cannot yet be submitted |
| Clinic registration | Available | Submit an authorized clinic/staff registration and check its review status and notes |
| Approved-clinic workspace | Read-only | The clinic owner can view saved clinic information and database counts after approval |
| Administrator review | Available | Administrators use a separate website to review pending clinics and save approval or rejection decisions |
| Clinic profile, service, and dentist editing | Next — planned | This is the next proposed feature release; editing screens and save operations are not delivered yet |
| Scheduling, booking, and payments | Planned | These depend on the later development phases described below |

**Available** means the stated function is delivered. **Read-only** means saved information can be viewed, with the limitations shown. **Next — planned** identifies the next proposed increment. **Planned** means future work. Planned items are not marked as actively in progress in this release.

Clinic listings come from approved database records. A new installation can legitimately show an empty directory until records are approved and relevant clinic information is provisioned.

## Recent updates

| Date | Website change | What users experience | Status |
| --- | --- | --- | --- |
| 31 October 2026 | Redirect-loop fix | Patient and clinic pages open successfully; administrator access reaches sign-in normally | Live fix verified |
| 30 October 2026 | Patient accounts | Register, sign in/out, view account information, and read personal appointment records | Included in the delivered foundation |
| 30 October 2026 | Access and phone usability | Separate account-role access, stronger sign-in protection, readable phone controls, and accessible page transitions | Included in the delivered foundation |
| 29 October 2026 | Clinic discovery and estimates | Browse approved clinics and treatment information and estimate costs using published prices | Included in the delivered foundation |
| 29 October 2026 | Clinic registration and review | Submit a clinic, check review status/notes, and approve or reject pending registrations | Included in the delivered foundation |

The development preview also supports an owner account that can sign in separately to each portal and select existing clinic workspaces. **That change is awaiting production release and is implemented in the supplied source for development use.** Ordinary-account permissions and personal-appointment restrictions remain enforced.

See [website updates](CHANGELOG.md), the [full website history](docs/12_DEVELOPMENT_HISTORY.md), and the [verification record](docs/VERIFICATION.md) for the behavior and limits. Documentation, repository, and project-administration tasks are kept out of this website-update history.

## Website update history

The earliest recorded website features date from **29 October 2026**. The history follows changes to public pages, clinic discovery, estimates, clinic registration/review, patient accounts, access protection, phone usability, and the redirect fix.

Dates use **Philippine time (UTC+8)**. Earlier feature dates describe recorded implementation changes, not the exact day each feature first appeared in production. Each new update should state the affected website behavior and whether it is **live**, **development preview**, or **planned**. Read the [full website update history](docs/12_DEVELOPMENT_HISTORY.md) for details.

## Next planned release

### Clinic content management

**Status: next planned increment.** This phase will let an approved clinic maintain the information that patients see. Its completion criteria are:

| Work | Expected result when delivered |
| --- | --- |
| Clinic profile editing | Authorized clinic staff can update their own approved fields and see the saved changes after reloading |
| Service and price management | Clinics can maintain their own treatment information, prices, and active/publication settings |
| Dentist information management | Clinics can maintain their own dentist profiles and the agreed credential information |
| Permission and publication checks | Other accounts cannot change the clinic's records; public pages use only information allowed by the publication rules |
| Review and testing | Changes persist in the database, work on phones and desktop, handle validation/errors, and pass the agreed access-control tests |

Before implementation, confirm the editable fields, publication rules, and credential-handling requirements with the project owner. Review the completed behavior in the test environment before approving a production release.

## Following development phases

| Order | Planned work | Intended outcome |
| --- | --- | --- |
| 2 | Dentist assignments and schedules | Availability based on saved working hours, services, durations, and closures |
| 3 | Persistent appointment requests | Signed-in patients can submit valid requests with server-side conflict checks |
| 4 | Clinic appointment review | Clinics can review only their own requests and patients can see the saved decision |
| 5 | Deposits and payment confirmation | Confirm payments through the selected provider with server-validated amounts and safe handling of duplicate callbacks |
| 6 | Cancellation, rescheduling, and notifications | Apply agreed appointment-change policies and notify the appropriate people |
| 7 | Completed-visit feedback | Allow eligible patients to leave feedback under the agreed publication rules |
| 8 | Account recovery and operational strengthening | Add recovery/verification workflows and the agreed backup, monitoring, and account-protection improvements |

All rows above are **planned**, not completed or currently marked as started. The [detailed development plan](docs/06_STATUS_AND_DEVELOPMENT_PLAN.md) contains dependencies and acceptance criteria. The [roadmap and future booking diagrams](docs/11_DIAGRAMS_AND_WORKFLOWS.md) show how the phases fit together. Dates and effort estimates are agreed after each phase's requirements are confirmed.

### Client decisions needed for upcoming phases

The planning discussion should confirm which clinic fields can be changed, how credential information is handled, schedule/booking rules, deposit and refund policies, the payment provider, notification channels, and operational ownership. These decisions define what each future release must support.

## Current limitations

- Online appointment submission and live time-slot selection are unavailable. Signing in does not create an appointment.
- The appointment list can read existing patient-linked records; it does not yet provide booking creation, cancellation, or rescheduling.
- Clinic profile, service/price, dentist, and schedule editing are not available in the delivered workspace. An authorized operator must arrange controlled data updates until management features are delivered.
- Deposit collection, payment-provider integration, automated notifications, and completed-visit reviews are not implemented.
- Self-service password recovery, email verification, MFA, and scheduled backup automation remain future work. Current operational procedures are in the [operations manual](docs/05_OPERATIONS_MANUAL.md).

Unavailable operations have clear interface notices. The application does not create temporary browser appointment records or invented clinic listings to represent unfinished features.

## Website addresses

| Area | Address |
| --- | --- |
| Public and patient website | https://dentabook.forgroup.space |
| Patient registration | https://dentabook.forgroup.space/patient/register |
| Patient sign-in | https://dentabook.forgroup.space/patient/sign-in |
| Clinic sign-in | https://dentabook.forgroup.space/clinic/sign-in |
| Clinic registration | https://dentabook.forgroup.space/clinic/register |
| Administrator sign-in | https://dentabook-admin.forgroup.space/admin/sign-in |

Patients and clinics share the main website, with different account permissions. Administration has a separate hostname, port, and API process. There is no public administrator registration or administrator link in the public navigation.

## Technology and verification

The interface uses **React 19, React Router 7, Vite 6, and mobile-first CSS**. The server uses **Node.js 22 and Express 4**, with **PostgreSQL 16** for saved records and sessions. **Nginx, Docker, and Docker Compose** package and run the services. Exact dependencies and responsibilities are explained in the [technical overview](docs/03_TECHNICAL_OVERVIEW.md) and [dependency versions](docs/DEPENDENCIES.md).

The latest recorded delivery checks include **33 backend tests**, **two production browser checks**, and layouts at **320px, 390px, 768px, and 1440px**, with a phone checked first. The diagram/handbook checks also cover image loading, contained phone scrolling, print sizing, and relationship-label readability. See the [verification record](docs/VERIFICATION.md) for scope and limitations. These are recorded release checks, not continuous uptime monitoring.

## How development progress is reported

Each reviewed release should update this README's date and feature status, the website update history, the detailed development plan, and the verification record. History entries describe changes to website behavior and identify whether they are live, available only in development preview, or planned. Work moves to **in progress** when implementation actually starts and to **available** only after its agreed acceptance checks pass.

Development, client delivery, and production deployment are separate steps. A development commit does not automatically appear in the client repository or change the live website. An approved release is documented, tested, backed up, deployed deliberately, and checked again.

## Documentation

Open the [HTML handbook](CLIENT_GUIDE.html) locally in a browser for a printable guide. A PDF edition is included with reviewed releases when provided.

| What you need | Where to read |
| --- | --- |
| A plain-language project introduction | [Project guide](docs/01_PROJECT_GUIDE.md) |
| Instructions for patients, clinics, and administrators | [User guide](docs/02_USER_GUIDE.md) |
| Delivered features and remaining development phases | [Status and development plan](docs/06_STATUS_AND_DEVELOPMENT_PLAN.md) |
| Earlier website features and fixes | [Website update history](docs/12_DEVELOPMENT_HISTORY.md) |
| Workflow, architecture, and database diagrams | [Diagram guide](docs/11_DIAGRAMS_AND_WORKFLOWS.md) |
| How the website is built | [Technical overview](docs/03_TECHNICAL_OVERVIEW.md) |
| Installation and domain configuration | [Setup and deployment](docs/04_SETUP_AND_DEPLOYMENT.md) |
| Saved production versions and rollback | [Five-version release guide](docs/13_RELEASE_VERSIONS.md) |
| Backups, updates, and troubleshooting | [Operations manual](docs/05_OPERATIONS_MANUAL.md) |
| Test procedures and client review | [Testing and acceptance](docs/07_TESTING_AND_ACCEPTANCE.md) |
| Technical interfaces and stored information | [API reference](docs/08_API_REFERENCE.md), [data and security](docs/09_DATA_AND_SECURITY.md) |
| Access transfer and ongoing responsibility | [Handover checklist](docs/10_HANDOVER_CHECKLIST.md) |

## Source layout

```text
client/                         Website interface, branding, styles, and browser tests
server/                         API, account permissions, database schema, and tests
docs/                           Client guides, status, roadmap, diagrams, and verification
CLIENT_GUIDE.html                Browser-readable handbook
docker-compose.yml              Local development services
docker-compose.production.yml   Production public/admin separation
.env.example                    Local configuration template
.env.production.example         Production configuration template
CHANGELOG.md                    Client delivery history
```

The setup guide provides the startup procedure. Actual passwords, database backups, certificates, and private hosting access are transferred separately through the operator's agreed process.

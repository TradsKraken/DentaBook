# DentaBook

**Book your smile, know your cost.**

DentaBook helps people find approved dental clinics, explore treatments, and estimate costs using a clinic's published prices. Patients can create accounts, clinic representatives can submit their clinics for review, and platform administrators can approve or reject those submissions.

**Updated 3 November 2026.** The supplied source and development preview now include clinic setup, dentist-service assignments, available appointment times, patient requests, and clinic acceptance/decline. These new tools are **development preview only**; updating this repository does not deploy production.

[Development status](#development-status) · [Recent updates](#recent-updates) · [Website history](#website-update-history) · [Next planned release](#next-planned-release) · [Website addresses](#website-addresses) · [Documentation](#documentation)

## Development status

| Area | Status | What users can do |
| --- | --- | --- |
| Public discovery and estimates | Existing foundation | Browse approved clinics, published services/dentists, and cost estimates without signing in |
| Patient and clinic accounts | Existing foundation | Register, sign in/out, and use server-protected personal or clinic pages |
| Administrator review | Existing foundation | Review pending clinic registrations through the separate administration website |
| Clinic setup | Development preview | Edit the clinic profile, services, estimated prices/durations, dentist profiles, and weekly working hours |
| Dentist-service assignments | Development preview | Choose which treatments each dentist provides within the clinic |
| Appointment availability | Development preview | Choose a published treatment, assigned dentist, and time derived from working hours and existing reservations |
| Patient booking requests | Development preview | Submit one treatment per request; the server validates availability and saves the request durably |
| Clinic appointment inbox | Development preview | Review the latest 100 requests for a selected status; accept or decline pending requests with an audited decision |
| Patient status tracking | Development preview | Refresh the latest 50 own appointments to read the clinic’s saved decision and note |
| Payments, final confirmation, appointment changes, reminders, and reviews | Planned | These operations are not implemented in this increment |

Listings, prices, credentials, schedules, and requests use backend records. Empty installations show honest empty states. Publishing a dentist profile does not create a staff sign-in account. The clinic workspace opens on an overview with real pending counts and booking setup guidance. Use the desktop sidebar or phone menu to reach appointments, services, dentists, working hours, and the public profile editor.

## Recent updates

| Date | Website change | Status |
| --- | --- | --- |
| 3 November 2026 | Clinic workspace redesigned with task navigation, searchable lists, focused edit/review panels, grouped schedules, and booking setup guidance | Development preview; supplied source included |
| 3 November 2026 | Booking automatically uses the signed-in patient’s registered email | Development preview; supplied source included |
| 3 November 2026 | Patient requests with real available times, double-booking protection, retry safety, and a clinic accept/decline inbox | Development preview; supplied source included |
| 3 November 2026 | Clinic profile, service/price, dentist, and weekly working-hour management | Development preview; supplied source included |
| 31 October 2026 | Patient/clinic redirect-loop fix and administrator sign-in access | Previously verified live fix |
| 30 October 2026 | Patient accounts, personal records, role separation, and phone usability | Existing delivered foundation |
| 29 October 2026 | Approved-clinic discovery, cost estimates, registration, and administrator review | Existing delivered foundation |

An operator-provisioned owner can sign in separately to each portal and select an existing clinic. Ordinary accounts remain restricted to their own records. Development-only credentials are not accepted in production and are not bundled with this delivery.

## Website update history

Read [website updates](CHANGELOG.md) and the [full website history](docs/12_DEVELOPMENT_HISTORY.md). Dates use Philippine time (UTC+8). Earlier dates describe recorded feature changes, not exact production rollout dates. New entries identify whether behavior is live, in the development preview, or planned. Project-administration work is excluded from this website history.

## Next planned release

Payment and final-confirmation rules need the next implementation phase. The current preview saves requests and clinic acceptance; it does not charge a deposit or mark a visit confirmed. After payment integration, the roadmap covers cancellation/rescheduling policies, reminders, visit completion, completed-visit feedback, account recovery, and operational improvements.

## Booking rules and current limitations

- Booking fills the registered patient email automatically and keeps it read-only. The server uses the account email even if a different email is submitted. Accounts without an email, including the development owner login, must use a registered patient account to create requests.
- A request contains one treatment and one assigned dentist. Prices and durations come from the server; new requests preserve the treatment name and quoted price.
- Working hours recur weekly in Philippine time. Available starts are 15 minutes apart, require 15 minutes of lead time, and cover today through 90 days ahead. Date-specific closures and configurable booking policies remain planned.
- Pending, accepted, and confirmed appointments reserve time for the same dentist. A declined request releases its reservation. Changing working hours does not change existing appointments.
- Identical retries with the same request key return the saved appointment. A changed payload with a used key is rejected.
- Clinics can accept or decline pending requests. Declines require a patient-visible reason. Acceptance rechecks the current configuration and does not process payment or complete final confirmation.
- Pending requests remain reserved until reviewed; automatic expiry is not implemented. Clinic staff should review their inbox regularly.
- The inbox and patient lists are bounded and can be refreshed; live push updates, notifications, self-service cancellation/rescheduling, visit completion, payment collection, and feedback are not implemented.
- Self-service password recovery, email verification, MFA, and scheduled backup automation remain future work. Production releases use the [five-version release guide](docs/13_RELEASE_VERSIONS.md).

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

Booking verification includes the isolated backend suite, separate real PostgreSQL concurrency checks, and a full browser journey through real test APIs. Changed journeys are checked at **390px first, then 320px, 768px, and 1440px**. See the [verification record](docs/VERIFICATION.md) for recorded results and limits. Preview test results do not claim production deployment or continuous monitoring.

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

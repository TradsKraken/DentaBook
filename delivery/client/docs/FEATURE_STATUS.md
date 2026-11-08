# DentaBook

**Book your smile, know your cost.**

DentaBook helps people find approved dental clinics, explore treatments, and estimate costs using a clinic's published prices. Patients can create accounts, clinic representatives can submit their clinics for review, and platform administrators can approve or reject those submissions.

**Updated 8 November 2026.** Clinic setup, booking requests, editable appointment email, manually verified GCash deposits, and unpaid Pay at clinic confirmation are released on production. Cancellation and clinic-approved rescheduling are also live. Private intake/follow-up, patient profile/password editing, manager/appointment-staff access, and easier working-hours assignment were released on 5 November 2026.

Patients can send symptoms or questions to their chosen clinic. The first linked dentist to accommodate an unassigned concern becomes assigned; patients and authorized clinic staff exchange private replies. Patient and clinic Notifications show unread counts, individual read state, and links back to conversations. Clinics can collect required consented intake during booking, complete eligible confirmed visits, and receive private patient feedback afterward. Payment status stays separate from completion.

[Development status](#development-status) · [Recent updates](#recent-updates) · [Website history](#website-update-history) · [Next planned release](#next-planned-release) · [Website addresses](#website-addresses) · [Documentation](#documentation)

## Development status

| Area | Status | What users can do |
| --- | --- | --- |
| Public discovery and estimates | Existing foundation | Browse approved clinics, published services/dentists, and cost estimates without signing in |
| Patient and clinic accounts | Existing foundation | Register, sign in/out, and use server-protected personal or clinic pages |
| Password visibility | Live | Show or hide each password field while typing, using keyboard-accessible controls that do not submit the form |
| Administrator review | Existing foundation | Review pending clinic registrations through the separate administration website |
| Clinic setup | Live | Edit the clinic profile, services, estimated prices/durations, dentist profiles, and weekly working hours |
| Dentist-service assignments | Live | Choose which treatments each dentist provides within the clinic |
| Appointment availability | Live | Choose a published treatment, assigned dentist, and time derived from working hours and existing reservations |
| Patient booking requests | Live | Submit one treatment per request; the server validates availability and saves the request durably |
| Clinic appointment inbox | Live | Review the latest 100 requests for a selected status; accept or decline pending requests with an audited decision |
| Patient status tracking | Live | Refresh the latest 50 own appointments to read the clinic’s saved decision and note |
| GCash and Pay at clinic | Live | Clinic-specific policy/recipient, patient reference claims, audited staff verification, private deposit receipts, and unpaid Pay at clinic confirmation |
| Cancellation and rescheduling | Live | Clinics configure policy/deadlines; patients cancel or request another time; staff atomically approve replacements while preserving payments |
| Patient intake and follow-up | Live | Clinics configure questions/purpose/retention; patients consent, submit private answers, and reply to saved clinic information requests |
| Patient profile editing | Live | Edit name/phone and change passwords with current-password verification; password changes revoke all sessions |
| Additional clinic staff | Live | Owners share 48-hour single-use invitations, set manager/appointment-staff roles, revoke access, and view access history |
| Easier working hours | Live | Select multiple dentists/days, add split shifts, preview a batch, and edit existing shifts without moving booked visits |
| Clinic concerns | Live | Chosen-clinic questions, first-dentist accommodation, private replies and reversible spam controls |
| Notifications | Live | Patient/clinic tabs, unread indicators, saved read state and links to concern conversations |
| Visit completion and feedback | Live | Complete confirmed past visits with an audit trail; patients submit private feedback |
| Intake before submission | Live | Required questions and explicit consent save together with the booking |
| Dentist access | Live | Owner-invited dentists review only their assigned appointments and concerns |
| Automated reminders and public reviews | Planned | Email/SMS delivery, reminders, public ratings and moderation remain future work |

Listings, prices, credentials, schedules, and requests use backend records. Empty installations show honest empty states. Publishing a dentist profile does not create a staff sign-in account. The clinic workspace opens on an overview with real pending counts and booking setup guidance. Use the desktop sidebar or phone menu to reach appointments, deposits/payments, appointment policies, services, dentists, working hours, the public profile editor, patient intake, and owner-only staff access. Appointment staff see appointments, working hours, concerns and notifications; their appointment details include private intake/follow-up.

## Recent updates

The 8 November release adds clinic concerns, notification tabs, dentist access, intake before booking submission, and completed-visit feedback. The 5 November release added private clinic-configured intake, saved follow-up requests/replies, patient profile/password editing, owner-managed staff access, and batch working-hours assignment. Open **Patient intake**, **Staff access**, or **Working hours** in the clinic workspace. Patients use **My account** and **My appointments → Intake & clinic follow-up**. Clinics must configure questions and their purpose/retention statements before enabling intake.

| Date | Website change | Status |
| --- | --- | --- |
| 8 November 2026 | Individual Show/Hide password controls for sign-in, registration, invitations and password changes | Live; released 8 November 2026 |
| 8 November 2026 | Chosen-clinic concerns, notifications, restricted dentist access, booking intake, visit completion and private feedback | Live; released 8 November 2026 |
| 5 November 2026 | Private intake/follow-up, profile/password editing, manager/appointment-staff access, and easier working-hours assignment | Live; released 5 November 2026 |
| 3 November 2026 | Direct GCash deposits, staff verification, private receipts, and unpaid Pay at clinic confirmation with each clinic’s own policy | Live; released 3 November 2026 |
| 3 November 2026 | Clinic workspace redesigned with task navigation, searchable lists, focused edit/review panels, grouped schedules, and booking setup guidance | Live; released 3 November 2026 |
| 3 November 2026 | Booking prefills an editable contact email; entering another address leaves account email unchanged | Live; released 3 November 2026 |
| 3 November 2026 | Patient requests with real available times, double-booking protection, retry safety, and a clinic accept/decline inbox | Live; released 3 November 2026 |
| 3 November 2026 | Clinic profile, service/price, dentist, and weekly working-hour management | Live; released 3 November 2026 |
| 31 October 2026 | Patient/clinic redirect-loop fix and administrator sign-in access | Previously verified live fix |
| 30 October 2026 | Patient accounts, personal records, role separation, and phone usability | Existing delivered foundation |
| 29 October 2026 | Approved-clinic discovery, cost estimates, registration, and administrator review | Existing delivered foundation |

An operator-provisioned owner can sign in separately to each portal and select an existing clinic. Ordinary accounts remain restricted to their own records. Development-only credentials are not accepted in production and are not bundled with this delivery.

## Website update history

Read [website updates](../CHANGELOG.md) and the [full website history](12_DEVELOPMENT_HISTORY.md). Dates use Philippine time (UTC+8). Earlier dates describe recorded feature changes, not exact production rollout dates. New entries identify whether behavior is live, in the development preview, or planned. Project-administration work is excluded from this website history.

## Next planned release

Next increments cover email notifications/reminders, password recovery and verification, verified account-email changes, date-specific closures, public reviews/moderation, actual cash collection/refund recording, complete history pagination, and operational recovery. Follow-up currently appears in the signed-in portals; owners share staff invitation links directly. Dentists use owner-invited clinic sign-in; MFA remains planned.

## Booking rules and current limitations

- Booking prefills the account email when available. Patients may enter a different appointment contact address, including when their account has no email. The server validates and saves it without changing account email or ownership.
- Clinics explicitly enable patient cancellation/rescheduling and set deadlines/terms under Appointment policies. Original reservations remain until reschedule approval; estimates, payments, and issued receipts are preserved. Cancellation flags financial review without recording a refund.
- A request contains one treatment and one assigned dentist. Prices and durations come from the server; new requests preserve the treatment name and quoted price.
- Working hours recur weekly in Philippine time. Available starts are 15 minutes apart, require 15 minutes of lead time, and cover today through 90 days ahead. Date-specific closures and configurable booking policies remain planned.
- Pending, accepted, and confirmed appointments reserve time for the same dentist. A declined request releases its reservation. Changing working hours does not change existing appointments.
- Identical retries with the same request key return the saved appointment. A changed payload with a used key is rejected.
- Clinics can accept or decline pending requests. Declines require a patient-visible reason. Acceptance rechecks the current configuration. Patients then choose an enabled payment method; separate clinic payment review completes eligible visits’ confirmation.
- Pending requests remain reserved until reviewed; automatic expiry is not implemented. Clinic staff should review their inbox regularly.
- The inbox and patient lists are bounded and can be refreshed; device push, email/SMS, appointment reminders, gateway processing, cash collection recording, automatic refunds, and public reviews are not implemented. Concern notifications, visit completion and private feedback are live.
- Self-service password recovery, email verification, MFA, and scheduled backup automation remain future work. Production releases use the [five-version release guide](13_RELEASE_VERSIONS.md).

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

The interface uses **React 19, React Router 7, Vite 6, and mobile-first CSS**. The server uses **Node.js 22 and Express 4**, with **PostgreSQL 16** for saved records and sessions. **Nginx, Docker, and Docker Compose** package and run the services. Exact dependencies and responsibilities are explained in the [technical overview](03_TECHNICAL_OVERVIEW.md) and [dependency versions](DEPENDENCIES.md).

Booking verification includes the isolated backend suite, separate real PostgreSQL concurrency checks, and a full browser journey through real test APIs. Changed journeys are checked at **390px first, then 320px, 768px, and 1440px**. See the [verification record](VERIFICATION.md) for recorded results and limits. Preview test results do not claim production deployment or continuous monitoring.

## How development progress is reported

Each reviewed release should update this README's date and feature status, the website update history, the detailed development plan, and the verification record. History entries describe changes to website behavior and identify whether they are live, available only in development preview, or planned. Work moves to **in progress** when implementation actually starts and to **available** only after its agreed acceptance checks pass.

Development, client delivery, and production deployment are separate steps. A development commit does not automatically appear in the client repository or change the live website. An approved release is documented, tested, backed up, deployed deliberately, and checked again.

## Documentation

Open the [HTML handbook](../CLIENT_GUIDE.html) locally in a browser for a printable guide. A PDF edition is included with reviewed releases when provided.

| What you need | Where to read |
| --- | --- |
| A plain-language project introduction | [Project guide](01_PROJECT_GUIDE.md) |
| Instructions for patients, clinics, and administrators | [User guide](02_USER_GUIDE.md) |
| Delivered features and remaining development phases | [Status and development plan](06_STATUS_AND_DEVELOPMENT_PLAN.md) |
| Earlier website features and fixes | [Website update history](12_DEVELOPMENT_HISTORY.md) |
| Workflow, architecture, and database diagrams | [Diagram guide](11_DIAGRAMS_AND_WORKFLOWS.md) |
| How the website is built | [Technical overview](03_TECHNICAL_OVERVIEW.md) |
| Installation and domain configuration | [Setup and deployment](04_SETUP_AND_DEPLOYMENT.md) |
| Saved production versions and rollback | [Five-version release guide](13_RELEASE_VERSIONS.md) |
| Backups, updates, and troubleshooting | [Operations manual](05_OPERATIONS_MANUAL.md) |
| Test procedures and client review | [Testing and acceptance](07_TESTING_AND_ACCEPTANCE.md) |
| Technical interfaces and stored information | [API reference](08_API_REFERENCE.md), [data and security](09_DATA_AND_SECURITY.md) |
| Access transfer and ongoing responsibility | [Handover checklist](10_HANDOVER_CHECKLIST.md) |

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

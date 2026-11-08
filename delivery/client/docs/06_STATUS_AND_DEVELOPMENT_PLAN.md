# Status and development plan

**Snapshot: 8 November 2026.** Clinic setup, booking/request review, editable appointment contact email, direct GCash verification, and Pay at clinic confirmation are now released on production. Cancellation/rescheduling is also released and verified on production. Public discovery, accounts, and administrator clinic review remain the previously delivered foundation.

Patients can send symptoms or questions to their chosen clinic. The first linked dentist to accommodate an unassigned concern becomes assigned; patients and authorized clinic staff exchange private replies. Patient and clinic Notifications show unread counts, individual read state, and links back to conversations. Clinics can collect required consented intake during booking, complete eligible confirmed visits, and receive private patient feedback afterward. Payment status stays separate from completion.

## Available website features

| Area | Available behavior |
| --- | --- |
| Clinic setup | Edit public clinic details, services/prices/durations, dentist profiles, publication settings, and weekly working hours |
| Treatment assignments | Assign only the clinic’s own services to its dentists |
| Availability | Server-derived slots from active assignments, weekly hours, treatment duration, and pending/accepted/confirmed reservations |
| Patient requests | A signed-in patient submits one treatment and dentist; a transaction rechecks the quote and time before saving |
| Retry protection | A request key returns the same saved record on an identical retry |
| Clinic review | Approved owning clinics accept or decline pending requests, with recorded reviewer/time and patient-visible notes |
| Payments | Per-clinic deposit/refund policy, direct GCash recipient, patient reference claims, staff account verification, private receipts, and unpaid Pay at clinic confirmation |
| Appointment changes | Explicit clinic policy/deadlines, patient/staff cancellation, pending reschedules, atomic clinic approval, retained quotes/payments, and auditable history |
| Clinic concerns and spam controls | Private chosen-clinic conversations, first-dentist assignment, replies, auditable reassignments and reversible restrictions |
| Concern notifications | Patient/clinic tabs, unread counts, persistent individual reads, paginated history and concern links |
| Dentist access | Owner invitations linked to active clinic profiles; assigned appointment/concern access only |
| Booking intake | Required current answers/consent save atomically with the appointment |
| Visit completion and feedback | Audited completion of confirmed past visits; private patient feedback, separate from payment state |
| Patient tracking | The latest 50 own records show the saved decision; patients can refresh the list |

No browser-only appointments, invented clinics, or simulated payments are supplied. Setup changes preserve existing appointments. New treatment lines preserve their name and quoted price.

## Clinic workspace usability

The live clinic workspace has dedicated navigation for overview, appointments, services/prices, dentists, working hours, and clinic profile. The desktop sidebar becomes a compact menu on phones. Lists offer search/status filters; add/edit and request review use focused panels. Working hours are grouped by day and filterable by dentist. The overview’s setup checklist uses saved services, published dentists, valid assignments, and working hours that fit an assigned treatment. No invented activity, revenue, trends, patients, or appointments appear.

## Booking rules

All times use Asia/Manila. Patients can request today through 90 days ahead, with at least 15 minutes of lead time. Slot starts are spaced 15 minutes apart within each saved shift, and the complete treatment duration must fit. Pending, accepted, and confirmed visits block overlaps for the same dentist. Declines release the time. Pending requests have no automatic expiry yet.

Acceptance requires a future visit time, active service/dentist assignments, current working hours covering the saved visit, and no conflicting reservation. An accepted request remains distinct from final confirmation. After acceptance, patients can choose an enabled GCash or Pay at clinic method. GCash is a direct transfer in the patient’s own app, followed by a reference claim. Clinic staff must match the actual incoming transaction before recording payment. This confirms eligible future accepted visits and issues a private deposit receipt. Pay at clinic requires staff confirmation and remains unpaid. Existing clinics start with both payment methods disabled.

## Appointment changes

Each approved clinic sets its own enabled actions, whole-hour notice periods, and change terms. Patient actions stay unavailable until configured. Cancellation preserves payments and receipts and flags clinic refund review; it never records a refund. Patients can request or withdraw another time with the same dentist/treatment. The original visit stays reserved until clinic approval rechecks replacement availability atomically. Approval retains the original quote/duration and existing payment records. Conflicts and declines keep the original visit. New bookings preserve configured policy terms; older bookings without a snapshot use current terms until their first change. Visit history records the requester, reviewer, reason, policy, and old/requested time.

## Intake, staff accounts, and easier hours — live 5 November 2026

Clinics can configure private intake questions for all treatments or a selected service, with required/optional answers, patient consent, and purpose/retention statements. Patients submit answers and respond to saved clinic information requests from their appointments. Authorized staff see answers and request follow-up in appointment details. Email/SMS delivery remains planned.

Patients can edit name/phone and change passwords using the current password; existing appointment contact details remain as booked, and password changes sign out all devices. Account-email changes await verified email delivery. Clinic owners can share private, single-use staff invitations (48-hour expiry), choose manager or appointment-staff access, change roles, remove access, and view access history. Managers cannot manage staff; appointment staff handle appointments, intake/follow-up, and working hours. Dentists use restricted owner-invited clinic accounts; MFA remains planned.

Working hours support multiple dentists/days, weekday/all-day shortcuts, split shifts, batch previews, and editing saved shifts. Saving rejects overlaps as a unit and preserves identical shifts on retry; existing appointment times stay unchanged.

## Remaining development

| Work | Needed before completion |
| --- | --- |
| Further payment automation | Optional gateway, automatic reconciliation, refund actions, and recording on-site cash collection |
| Email/SMS/push and reminders | Delivery channels, consent, durable retries, and delivery-state handling; in-app concern notifications are live |
| Public reviews | Private completed-visit feedback is live; public ratings and moderation remain planned |
| Further scheduling controls | Date-specific closures, configurable lead time/horizon, and reservation-expiry policy |
| Staff access and account lifecycle | Password recovery, email verification/changes and agreed MFA scope remain planned |
| Operations | Agreed backup ownership, off-host recovery, monitoring, and recurring restore checks |

## Release workflow

Implement and test in development, update the client documentation, and publish a reviewed client snapshot preserving its existing Git history. Client delivery and production deployment are separate. Production updates must use `python3 scripts/releases.py deploy --note "Website feature or fix"` after source testing and commit, retaining the five newest verified restore points. Rollback preserves current customer data.

The [workflow diagrams](11_DIAGRAMS_AND_WORKFLOWS.md) include earlier planning snapshots. The status and rules above are authoritative for this released increment.

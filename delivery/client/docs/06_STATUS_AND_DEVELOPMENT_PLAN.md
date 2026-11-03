# Status and development plan

**Snapshot: 3 November 2026.** Clinic setup and booking/request review are implemented in the supplied source and development preview. Production has not received these increments. Public discovery, accounts, and administrator clinic review remain the previously delivered foundation.

## Development preview

| Area | Available behavior |
| --- | --- |
| Clinic setup | Edit public clinic details, services/prices/durations, dentist profiles, publication settings, and weekly working hours |
| Treatment assignments | Assign only the clinic’s own services to its dentists |
| Availability | Server-derived slots from active assignments, weekly hours, treatment duration, and pending/accepted/confirmed reservations |
| Patient requests | A signed-in patient submits one treatment and dentist; a transaction rechecks the quote and time before saving |
| Retry protection | A request key returns the same saved record on an identical retry |
| Clinic review | Approved owning clinics accept or decline pending requests, with recorded reviewer/time and patient-visible notes |
| Patient tracking | The latest 50 own records show the saved decision; patients can refresh the list |

No browser-only appointments, invented clinics, or simulated payments are supplied. Setup changes preserve existing appointments. New treatment lines preserve their name and quoted price.

## Clinic workspace usability

The development preview has dedicated navigation for overview, appointments, services/prices, dentists, working hours, and clinic profile. The desktop sidebar becomes a compact menu on phones. Lists offer search/status filters; add/edit and request review use focused panels. Working hours are grouped by day and filterable by dentist. The overview’s setup checklist uses saved services, published dentists, valid assignments, and working hours that fit an assigned treatment. No invented activity, revenue, trends, patients, or appointments appear.

## Booking rules

All times use Asia/Manila. Patients can request today through 90 days ahead, with at least 15 minutes of lead time. Slot starts are spaced 15 minutes apart within each saved shift, and the complete treatment duration must fit. Pending, accepted, and confirmed visits block overlaps for the same dentist. Declines release the time. Pending requests have no automatic expiry yet.

Acceptance requires a future visit time, active service/dentist assignments, current working hours covering the saved visit, and no conflicting reservation. An accepted request remains distinct from final confirmation. Online payment, deposit collection, and final confirmation are not available in this increment.

## Remaining development

| Work | Needed before completion |
| --- | --- |
| Deposits and final confirmation | Payment provider, verified callbacks, deposit/refund policy, duplicate-event handling, and reconciliation |
| Cancellation and rescheduling | Agreed policy, authorized transitions, atomic replacement-slot checks, and patient/staff actions |
| Reminders and notifications | Delivery channels, consent, retries, and delivery-state handling |
| Visit completion and feedback | Authorized completion rules and eligible patient review/moderation |
| Further scheduling controls | Date-specific closures, configurable lead time/horizon, and reservation-expiry policy |
| Staff access and account lifecycle | Additional staff permissions, password recovery, verification, and agreed MFA scope |
| Operations | Agreed backup ownership, off-host recovery, monitoring, and recurring restore checks |

## Release workflow

Implement and test in development, update the client documentation, and publish a reviewed client snapshot preserving its existing Git history. Client delivery and production deployment are separate. Production updates must use `python3 scripts/releases.py deploy --note "Website feature or fix"` after source testing and commit, retaining the five newest verified restore points. Rollback preserves current customer data.

The [workflow diagrams](11_DIAGRAMS_AND_WORKFLOWS.md) include earlier planning snapshots. The status and rules above are authoritative for this preview increment.

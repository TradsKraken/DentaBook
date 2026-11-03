# Website updates

## 3 November 2026 — Clinic setup, booking, and payments released (live)

Patients can request available appointments with an editable contact email and use clinic-enabled GCash or Pay at clinic after acceptance. Clinics manage profiles, treatments, dentists, assignments, working hours, request decisions, and payment verification in the redesigned workspace. Staff verify actual GCash transfers before issuing private deposit receipts; Pay at clinic stays unpaid. These features are now released and verified on both HTTPS portals. Existing clinics are not enrolled in payment methods automatically.

## 3 November 2026 — Cancellation and clinic-approved rescheduling (implemented; release pending)

Clinics set their own enabled patient actions, deadlines, and terms. Patients can cancel eligible visits, request another available time, or withdraw a pending reschedule. The original reservation remains until owning clinic staff approve a replacement after an atomic availability check. Change history records reasons, policies, requester/reviewer, and original/requested times. Original quotes, treatment duration, appointment references, payment records, and issued receipts are preserved. Cancellation flags any financial follow-up without recording a refund. Production verification for this increment is pending.


## 3 November 2026 — GCash deposits and Pay at clinic (development preview)

Each approved clinic can enable its own GCash account and Pay at clinic, set its deposit percentage, and write cancellation/refund terms. After acceptance, patients choose a method. GCash uses the server-calculated deposit, saves the agreed terms and recipient, and lets patients submit a transaction reference. Staff must check their actual GCash account and match the received amount and reference before recording payment. Verification confirms an eligible future accepted visit and creates an account-scoped deposit receipt. Pay at clinic requires staff confirmation and remains unpaid, with no receipt. Retried submissions are protected, verified GCash references cannot be reused, and payment reviews record the staff member, time, and note. Existing records are preserved; no clinic is automatically enrolled and no gateway or automatic refund is supplied. Available in the development preview and source; production is unchanged.


## 3 November 2026 — Clinic workspace redesign (development preview)

Reorganized clinic management into an overview and dedicated appointment, service, dentist, working-hour, and profile sections. Desktop navigation uses a persistent sidebar; phones use a compact menu. Added searchable/status-filtered lists, focused add/edit panels, weekday-grouped schedules, and a patient-details panel for reviewing requests. The overview now shows real pending/published counts and a booking setup checklist, including missing treatment assignments. Existing account permissions, database-backed records, and booking rules remain in place. This redesign is available in the development preview and supplied source; production is unchanged.


## 3 November 2026 — Account email in booking (development preview)

Booking now fills the signed-in patient’s registered email automatically and displays it read-only. The server saves the account email, so a submitted alternative cannot replace it. Accounts without an email show a clear message to use a registered patient account. Previously saved requests and their retry behavior are preserved. This improvement is available in the development preview and supplied source; production is unchanged.


## 3 November 2026 — Appointment requests and clinic setup (development preview)

The supplied source and development preview now let approved clinics edit their profile, services/prices, dentist profiles, and weekly working hours, including publication controls and dentist-service assignments. Signed-in patients can choose real available times and send persistent requests for one treatment. Pending requests reserve time, overlapping submissions are rejected atomically, and identical retries return the saved request. Clinics can accept or decline pending requests with an audited decision and patient-visible notes. Patients can refresh their own appointments to read the outcome.

These changes are **development-preview-only** and have not been deployed to production. Payments, final confirmation, appointment changes, reminders, completion, and reviews remain planned. The [status and development plan](docs/06_STATUS_AND_DEVELOPMENT_PLAN.md) records the booking rules and limitations.

## 31 October 2026 — Website access fixed

Fixed the repeated redirects that stopped some visitors from opening DentaBook. The patient homepage and clinic sign-in load successfully, and the administrator website opens its sign-in page normally. This correction is confirmed on the live website.

## 30 October 2026 — Patient accounts and personal pages

Added patient registration, sign-in/out, account pages, protected personal access, and an appointment list limited to the signed-in patient's saved records. Patients return to an appropriate requested page after signing in. Appointment creation, cancellation, and rescheduling remain unavailable.

## 30 October 2026 — Access protection and phone usability

Separated patient, clinic, and administrator access, with administration on its own website. Ordinary account roles remain restricted to their workspaces. Password/role changes require fresh sign-in. Improved phone form readability, touch targets, links, redirects, and page transitions respecting reduced-motion preferences.

## 29 October 2026 — Public website and clinic discovery

Added the branded public pages, searchable approved-clinic directory, clinic profiles, treatment information, and published-price cost estimates. Listings use saved clinic records and honest loading, empty, and unavailable states. Estimates do not create bookings or collect payment.

## 29 October 2026 — Clinic registration and administrator review

Added clinic/staff registration and sign-in, registration status and review notes, administrator approval/rejection, and approved-clinic access to a read-only workspace with saved contact details and counts. Clinic editing and scheduling remain planned.

## Awaiting production release — Owner portal access

Available in the development preview: an explicitly created owner account can sign in to each portal and select existing clinic workspaces. Ordinary-account and personal-appointment restrictions remain enforced. This is not yet live and is implemented in the supplied source for development use.

Dates for the earlier entries are recorded website-feature dates in Philippine time (UTC+8), not exact production rollout dates. Read the [website update history](docs/12_DEVELOPMENT_HISTORY.md) for the behavior and limits, and the [current development plan](docs/06_STATUS_AND_DEVELOPMENT_PLAN.md) for unfinished features.

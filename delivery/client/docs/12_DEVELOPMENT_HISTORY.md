# Website update history

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

These changes are **development-preview-only** and have not been deployed to production. Payments, final confirmation, appointment changes, reminders, completion, and reviews remain planned. The [status and development plan](06_STATUS_AND_DEVELOPMENT_PLAN.md) records the booking rules and limitations.


**Reviewed through 31 October 2026.** This history records changes to DentaBook's pages, features, account access, and website behavior. Dates use Philippine time (UTC+8). Earlier dates identify recorded feature changes; they do not establish the exact production launch date of each feature.

## 31 October 2026 — Public website access fixed

- Fixed the repeated redirects that prevented some visitors from opening the website.
- The patient homepage and clinic sign-in now open successfully.
- Opening the administrator website takes the user to administrator sign-in without a redirect loop.

**Status:** confirmed on the live website.

## 30 October 2026 — Patient accounts

- Added patient registration, sign-in, sign-out, and account information pages.
- Protected booking and personal pages so visitors must sign in with a patient account.
- Added an appointment list that reads only records linked to the signed-in patient, with an empty state when there are no records.
- Returned patients to their intended personal page after sign-in, while rejecting unsafe return addresses.

The appointment list remains read-only. Creating, cancelling, and rescheduling appointments are not yet available.

## 30 October 2026 — Separate access and stronger account protection

- Separated patient, clinic, and administrator sign-in and workspace access.
- Kept administrator tools on their own website, without an administrator sign-in link in public navigation.
- Prevented ordinary accounts from entering another account role's workspace or reading another patient's appointment list.
- Required a fresh sign-in after password or account-role changes and shortened administrator sessions.
- Kept patient and clinic access together on the main website while administration uses its own hostname.

These are changes to website access and account protection. The current [status and development plan](06_STATUS_AND_DEVELOPMENT_PLAN.md) describes what each workspace provides.

## 30 October 2026 — Phone usability and page presentation

- Improved form readability and touch targets on phones.
- Improved links and redirects so they keep the correct website address.
- Added page transitions and content-reveal effects that respect reduced-motion preferences and keep content accessible without animations.

## 29 October 2026 — Public pages and clinic discovery

- Added the branded homepage, about page, treatment information, and phone-first navigation.
- Added a searchable approved-clinic directory and public clinic profiles.
- Displayed saved clinic details, active services, and active dentist information from the database.
- Added clear loading, empty, and unavailable states instead of invented listings.
- Added treatment-cost estimates using the selected clinic's published prices.

The calculator provides an estimate; it does not submit an appointment or collect payment.

## 29 October 2026 — Clinic registration and review

- Added clinic/staff registration and sign-in.
- Showed registration status and review notes to the clinic account.
- Added administrator approval and rejection of pending clinic registrations, with a reason required for rejection.
- Made approved clinics eligible for public listing and access to their own workspace.
- Added a read-only clinic workspace showing saved contact details and counts for dentists, published services, and pending appointments.

Clinic profile, service/price, dentist, and schedule editing are still planned.

## Development preview — awaiting production release

The development website now supports an operator-created owner account that can sign in separately to the patient, clinic, and administrator portals. In the clinic portal, the owner can select an existing clinic to read its workspace. Patient access still reads only that account's own appointment records, and ordinary accounts retain their usual restrictions.

**Status: development preview only.** This capability has not been deployed to production and is implemented in the supplied source for development use. No preview credentials are part of this history. Review and release are required before presenting it as a live feature.

## Next planned website update

Direct GCash verification and unpaid Pay at clinic confirmation are now implemented in the development preview. The next increments cover appointment-change policies, reminders, completion/feedback, and account recovery. Clinic setup, weekly scheduling, requests, and request review are now available in the development preview described above. Earlier entries describe the behavior at their recorded date.

See the [current status and development plan](06_STATUS_AND_DEVELOPMENT_PLAN.md) for scope and completion criteria. Future entries should describe what changed on the website, who can use it, and whether it is live, in development preview, or planned. Requirements drafting, documentation edits, repository setup, and other project administration are not website-update entries.

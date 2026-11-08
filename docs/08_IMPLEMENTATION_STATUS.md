# Incremental implementation status

Updated 8 November 2026. The [ordered completion checklist](05_DELIVERY_ROADMAP.md) tracks the remaining work.

## Live foundation

Public clinic discovery, published services/dentists, clinic-based cost estimates, patient accounts, clinic registration, administrator review, and separate protected portals are live. Guests can browse; booking and personal records require a server-validated patient session. No listings, credentials, prices, or appointments are invented or stored only in the browser.

## Clinic setup, booking, and payments — released 3 November 2026

Approved clinics can edit profiles, services/prices/durations, dentist profiles, publication settings, treatment assignments, and recurring weekly hours. The clinic workspace includes an overview, searchable lists, focused panels, and phone navigation.

Patients can request one treatment with an assigned dentist and an available time. The appointment contact email is editable and prefilled from the account when available; accounts without an email can enter a valid contact address. Account email and ownership remain unchanged. Slots use Philippine time, saved duration, weekly hours, a 90-day horizon, and 15-minute lead time. Pending, accepted, and confirmed appointments reserve time. Transaction checks prevent overlaps, stale price/duration quotes, and duplicate retry records.

Owning clinics accept or decline requests with an audited decision and patient-visible note. Acceptance is distinct from confirmation. Patients can choose explicitly enabled GCash or Pay at clinic methods. Staff match actual GCash transfers before recording a deposit and issuing a private receipt. Pay at clinic confirmation remains unpaid. Existing clinics are not automatically enrolled in payment methods.

The baseline was released from committed source with the required version-saving release manager. HTTPS portal checks passed at 390px, 320px, 768px, and 1440px. Production has no clinic listings at the time of this review; empty/unavailable states remain intentional.

## Cancellation and rescheduling — released 3 November 2026

Clinics explicitly configure patient actions, deadlines, and terms. Patient cancellation/rescheduling remains unavailable until enabled. Server checks enforce ownership, clinic approval, status transitions, and notice deadlines. Reasons and reviewer/requester history are saved. Cancellation releases time while preserving payments/receipts and flagging financial follow-up.

Rescheduling retains the original booking until clinic approval atomically rechecks and moves the visit. Requested times are not held. Conflicts, declines, and withdrawals preserve the original reservation. The same dentist, treatment, original duration/price, appointment reference, and payment records are retained. New bookings save configured policy terms. See [appointment changes](16_APPOINTMENT_CHANGES.md) for exact rules and endpoints.

## Remaining work

Email/SMS/push and reminders, password recovery and verification (including verified account-email changes), date-specific closures and scheduling buffers, reservation expiry, public reviews/moderation, cash collection/refunds, MFA, full history pagination, and expanded monitoring/off-host recovery remain future increments. A payment gateway is optional later work.

## Intake, staff access, and easier working hours — released 5 November 2026

Clinics configure their own required/optional questions, either for all visits or a selected treatment, and explain purpose/retention before enabling intake. Patients submit consented answers from their own appointment; saved submissions retain original question text and policy statements. Authorized clinic staff request information, and patients reply through a saved private thread. Appointment and payment states remain separate. Follow-up appears in the signed-in portals; email/SMS delivery is not implemented.

Patients edit name/phone and change passwords with current-password verification. Existing booking contact details stay intact; password changes revoke all sessions. Account-email editing remains unavailable until verification/delivery exists.

Clinic owners create private, 48-hour, single-use staff invitations, change manager/appointment-staff roles, and revoke access. Managers handle setup, appointments, intake, hours, and payments. Appointment staff handle appointments, intake/follow-up, and hours. Only owners administer staff. Membership, approval, and permissions are enforced by the API; audit records retain access changes. Patient/admin identities cannot be converted through an invitation.

Working hours now support multiple dentists/days, weekday/all-day shortcuts, split shifts, a save preview, and individual shift editing. Overlaps reject the entire batch; identical saved shifts are retained on retry. Existing appointments keep their saved times. The HTTP preview also uses compatible payment request IDs.

See [the feature guide and access rules](17_INTAKE_STAFF_AND_HOURS.md). These changes are live. The release manager saved verified restore point `20261105T003533848314Z-103fc223`, retained the production database, and applied migration 007.

## Verification boundaries

The backend suite covers account/clinic isolation and booking/payment/change behavior using the real schema and migrations. Real PostgreSQL checks exercise competing reservations, retries, replacement approvals, and cancellation/payment races. Browser fixtures remain test-only; the real browser journey uses a disposable PostgreSQL database and actual API requests for setup, booking, GCash verification, Pay at clinic, policy setup, rescheduling, and cancellation. No production records are created by these tests.

Release-manager safeguard tests and the existing restore-point integrity checks passed. The production baseline portal checks verify health, public access, protected-page redirects, origin checks, security headers, and layout/accessibility controls without using customer credentials. These checks do not claim completed off-host disaster recovery or notification delivery.

The appointment-change release passed seven additional checks against the deployed HTTPS website: four real portal/security journeys and three interface journeys using test-only API fixtures. The production migration and disabled default policy settings were verified without inserting customer records. All three retained restore points passed integrity verification.

## Visit completion, feedback, booking intake, and dentist access — live 8 November 2026

Released to production on 8 November 2026 after isolated API/browser verification. Confirmed past visits can be completed with staff identity/time while payment status remains unchanged. Owning patients can submit private feedback once. Clinic-configured intake is required during booking submission and saves atomically with the appointment. Owners can invite a dentist linked to an active profile; server checks restrict the account to assigned appointment review, intake/follow-up, completion, and feedback. See [behavior and access rules](18_VISIT_INTAKE_DENTIST_ACCESS.md). Public ratings, MFA, and email notifications remain outside this increment.

## Patient clinic concerns — live 8 November 2026

Clinic-specific concern conversations, first-dentist accommodation, patient/clinic replies, reasoned reassignment, reversible spam classification, clinic-specific 24-hour restrictions, and server-enforced daily/message limits are implemented. One open conversation is allowed per patient per clinic. Guests must sign in, with the chosen clinic preserved. Duplicate submissions reuse saved records and additional drafts are retained for replying. Appointment booking remains separate. See [clinic concern rules](19_PATIENT_CONCERNS.md). Released to production on 8 November 2026.

## Concern notification tabs — live 8 November 2026

Persistent in-app notifications now cover new clinic concerns, patient/clinic replies, assignment and concern-management updates. Patients have a Notifications page and header bell; clinic staff/dentists have a Notifications tab with unread counts. Read state is individual and durable, with mark-all/read actions, paginated history, authorized concern links, and periodic refresh. No email/SMS/push or appointment-reminder delivery is claimed. See [notification scope and access](20_CONCERN_NOTIFICATIONS.md). Released to production on 8 November 2026.

Production release on 8 November 2026 used committed application source `618b34d`. Migrations 008–010 are applied; current customer data was retained. Verified pre-release restore point: `20261108T073434221646Z-58962be0`. Five restore points are retained.

## Password visibility controls — development preview

A shared Show/Hide control now covers patient/clinic/administrator sign-in, patient and clinic registration, clinic invitation acceptance, and each patient password-change field. Inputs start hidden; visibility is local to each mounted field and is not saved. The button is keyboard accessible, has a 44px touch target and announced state, never submits the form, preserves the entered value, and respects disabled fieldsets. Existing validation/autocomplete remain in place. Production release verification is pending.

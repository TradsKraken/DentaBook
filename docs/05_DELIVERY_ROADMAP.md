# DentaBook completion checklist

Updated 5 November 2026. Work through the numbered items in order unless a requested feature takes priority. This is a development checklist, not a website release announcement. Checking a development task does not mean it is live in production.

## Already implemented

- [x] Public clinic discovery, service information, and clinic-based cost estimation.
- [x] Patient accounts and server-protected personal pages; separate clinic and administrator portals with server-side role checks.
- [x] Clinic registration and administrator approval/rejection.
- [x] Live: clinic profiles, services/prices/durations, dentist profiles, treatment assignments, and weekly working hours.
- [x] Live: available times, persistent appointment requests, clinic acceptance/decline, and patient status tracking.
- [x] Live: direct GCash reference claims, manual clinic verification, private receipts, and unpaid Pay at clinic confirmation.
- [x] Live: editable appointment contact email, prefilled when available, with manual entry for accounts without an email. The saved contact address does not change the account email or appointment ownership.

Clinic setup, booking, payments, and the editable appointment email were released and verified on production on 3 November 2026. Cancellation and rescheduling were also released and verified on production on 3 November 2026. Items 1–3 are complete.

## Ordered work

### 1. Review and release the existing preview

- [x] Review the complete patient and clinic journey in development, including an alternate appointment email and an account without an email.
- [x] Verify real clinic setup and explicit payment-method configuration. Unconfigured clinics must show an honest unavailable state.
- [x] Run relevant functional/security checks and phone-first layout checks at 390px, 320px, 768px, and 1440px.
- [x] Confirm backup/recovery ownership, production configuration, and the restore procedure before releasing.
- [x] Commit the intended source, then release using `python3 scripts/releases.py deploy --note "Website feature or fix"`, retaining the five newest verified restore points.
- [x] Verify the deployed patient, clinic, and administrator journeys and accurately label the release in website history.

Completed: committed baseline released with the required release manager and verified through both HTTPS portals. Restore point `20261103T125319228146Z-2a39d811` protects the previous running website.

### 2. Appointment cancellation

- [x] Agree on patient/staff cancellation permissions, deadlines, reasons, and deposit consequences; do not invent a deadline or refund promise.
- [x] Add server-authorized cancellation actions and patient/clinic controls with confirmation and useful failure messages.
- [x] Record who cancelled, when, why, and the applicable policy; release the reserved time atomically.
- [x] Preserve payments and receipts, recording any refund review required rather than claiming money was returned.
- [x] Test cross-patient/cross-clinic access, duplicate actions, deadline boundaries, and payment-review races.

Completed and live: eligible visits can be cancelled safely, both portals show the saved result, and payments/receipts are preserved.

### 3. Appointment rescheduling

- [x] Agree on request/approval rules, deadlines, pricing changes, and how existing deposits apply.
- [x] Let patients request a new available time and let the owning clinic review it.
- [x] Recheck and reserve the replacement time in a transaction. Preserve the original reservation if replacement fails.
- [x] Keep an auditable link between the original appointment and the reschedule decision.
- [x] Test competing bookings, repeated submissions, declined requests, and paid appointments.

Completed and live: pending requests preserve the original reservation, and clinic approval rechecks/replaces the time atomically.

### 4. Email notifications and reminders

- [ ] Configure a real email provider and sender; decide notification preferences and reminder timing. SMS is a later optional channel.
- [ ] Add durable queued delivery with retries, duplicate prevention, and delivery/failure records.
- [ ] Send appointment requests/decisions, confirmations, cancellations, and rescheduling updates to the saved appointment contact email.
- [ ] Schedule reminders only for eligible upcoming visits; invalidate outdated reminders after cancellation or rescheduling.
- [ ] Show saved appointment state independently of delivery success, and give staff useful delivery failures.

Done when real messages arrive and a provider outage does not lose or duplicate appointment actions.

### 5. Password recovery and email verification

- [ ] Add expiring, single-use recovery and verification links with rate limits and responses that do not reveal whether an account exists.
- [ ] Use the account email for account-security messages; an alternate appointment email must never grant account access.
- [ ] Define recovery for provisioned accounts without email and the effect of password changes on active sessions.
- [ ] Test expired/reused links, wrong accounts, portal boundaries, and delivery failures.

Done when supported accounts can recover access and verify account email safely. Depends on item 4's email delivery foundation.

### 6. Scheduling controls

- [ ] Add date-specific holidays, leave, closures, and one-off working-hour overrides.
- [ ] Add configurable appointment buffers, booking lead time, and booking horizon.
- [ ] Agree on expiry rules for unanswered requests and accepted-but-unpaid reservations; protect verified payments from accidental expiry.
- [ ] Define staff handling of existing bookings affected by schedule changes; do not silently cancel them.
- [ ] Test Philippine-time boundaries and conflicts across booking, review, and schedule edits.

Done when clinics can manage exceptions without publishing unusable slots or silently changing existing visits.

### 7. Visit completion

- [ ] Define eligible completion transitions and staff permissions, including treatment of cancelled and future visits.
- [ ] Add an authorized completion action with staff identity and timestamp.
- [ ] Keep visit completion and payment status separate; completion must not imply an unpaid balance was collected.
- [ ] Test duplicate completion, invalid transitions, and cross-clinic access.

Done when clinics can record completed visits and patients see the saved outcome.

### 8. Patient feedback

- [ ] Permit feedback only from the owning patient after an eligible completed visit, with duplicate protection.
- [ ] Add review submission, moderation/reporting rules, and appropriate patient identity display.
- [ ] Show only real published feedback and calculate ratings only from eligible records.
- [ ] Test unauthorized submissions, moderation visibility, and empty states.

Done when completed visits can produce authentic, appropriately moderated feedback. Depends on item 7.

### 9. Payment collection and refunds

- [ ] Record money collected at the clinic with amount, method, staff identity, timestamp, and a private acknowledgement.
- [ ] Track deposit, remaining balance, and adjustments without marking Pay at clinic paid merely because the visit is confirmed.
- [ ] Implement refund review and recording of actual refunds with reference, amount, author, and audit history.
- [ ] Test duplicate collection/refunds, amount limits, and cancelled/rescheduled appointments.

Done when staff can reconcile actual money received and returned. A payment gateway and automatic reconciliation are optional later work, separate from this manual workflow.

### 10. Patient intake and clinic follow-up

- [x] Use clinic-configured questions, as requested, with optional/required answers and treatment-specific applicability.
- [x] Add intake forms, explicit consent, restricted storage, question snapshots, and clinic-defined purpose/retention statements.
- [x] Add saved clinic information requests and patient replies with authors/timestamps, without changing appointment or payment state.
- [x] Test required/optional answers, treatment ownership, consent, access boundaries, retry handling, and phone layouts. Follow-up is delivered in the signed-in portals; email/SMS remains dependent on item 4.

Development preview only: patients use **My appointments → Intake & clinic follow-up**; managers configure **Patient intake**, and authorized clinic staff view answers/request information in appointment details. See [intake, staff, and hours](17_INTAKE_STAFF_AND_HOURS.md).

Done when clinics can gather necessary information and follow up through a saved patient workflow.

### 11. Account editing and staff access

- [x] Let patients edit name/phone and change passwords using their current password; password changes revoke all sessions. Account-email editing remains unavailable pending verified delivery in items 4–5.
- [x] Add owner-managed private staff invitations, clinic membership, manager/appointment-staff permissions, role changes, immediate revocation, and audit events.
- [x] Keep dentist logins and MFA explicitly outside these roles until their separate access/MFA requirements are agreed. Dentist profiles do not grant sign-in access.
- [x] Test invitation expiry/reuse/replacement, revoked sessions, role escalation, cross-clinic/portal boundaries, and mobile journeys.

Development preview only: patients use **My account**; clinic owners use **Staff access**. Invitations expire after 48 hours and are shared directly by the owner, with no claim of email delivery. Managers cannot manage staff; appointment staff access appointments/intake/follow-up and working hours.

Done when profile changes and additional staff access work without weakening portal separation or patient ownership.

### 12. Complete history and record navigation

- [ ] Add server-side pagination and useful date/status filters for patient appointments, clinic appointments, and payment records.
- [ ] Ensure records beyond the current latest-50/latest-100 limits remain reachable.
- [ ] Keep filters and pagination usable on phones, with loading, empty, and retry states.
- [ ] Test ordering, page boundaries, and access restrictions on every query.

Done when patients and staff can find their full authorized history.

### 13. Ongoing production recovery and monitoring

- [ ] Establish scheduled off-host backups with retention, restricted access, and named ownership.
- [ ] Perform and document a restore drill in an isolated environment and repeat it on an agreed schedule.
- [ ] Monitor site/API/database health, background jobs, message delivery failures, and backup failures with actionable alerts.
- [ ] Document incident ownership and recovery steps without exposing credentials or personal records.

Done when failures can be detected and recovery has been demonstrated. Start the basic ownership/recovery decisions in item 1; expand these controls as features are released. Existing five-version release restore points remain in use.

## Definition of done for each increment

- [ ] Behavior and unresolved policy decisions are written down before implementation.
- [ ] Data comes from the backend, with server-enforced roles, record ownership, and valid status transitions.
- [ ] Phone layouts are checked first at 390px, then 320px, 768px, and 1440px; actions have at least 44 by 44 CSS pixel targets, form controls use at least 16px text, and the page has no horizontal overflow.
- [ ] Relevant functional/security tests pass, including retries and competing actions where applicable.
- [ ] The development preview is rebuilt and the changed journey is reviewed there.
- [ ] Documentation identifies whether the feature is planned, preview-only, or live. Project administration is not added to website-update history.
- [ ] Any production release uses tested, committed source and the required version-saving release command; rollback preserves current customer data unless separate database recovery is authorized.

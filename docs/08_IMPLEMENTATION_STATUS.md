# Incremental implementation status

Updated 3 November 2026. The [ordered completion checklist](05_DELIVERY_ROADMAP.md) tracks the remaining work.

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

Notifications/reminders, password recovery and verification, date-specific closures and scheduling buffers, reservation expiry, visit completion, feedback, cash collection/refunds, structured intake/follow-up, profile editing/additional staff permissions, full history pagination, and expanded monitoring/off-host recovery remain future increments. A payment gateway is optional later work.

## Verification boundaries

The backend suite covers account/clinic isolation and booking/payment/change behavior using the real schema and migrations. Real PostgreSQL checks exercise competing reservations, retries, replacement approvals, and cancellation/payment races. Browser fixtures remain test-only; the real browser journey uses a disposable PostgreSQL database and actual API requests for setup, booking, GCash verification, Pay at clinic, policy setup, rescheduling, and cancellation. No production records are created by these tests.

Release-manager safeguard tests and the existing restore-point integrity checks passed. The production baseline portal checks verify health, public access, protected-page redirects, origin checks, security headers, and layout/accessibility controls without using customer credentials. These checks do not claim completed off-host disaster recovery or notification delivery.

The appointment-change release passed seven additional checks against the deployed HTTPS website: four real portal/security journeys and three interface journeys using test-only API fixtures. The production migration and disabled default policy settings were verified without inserting customer records. All three retained restore points passed integrity verification.

# Incremental implementation status

DentaBook is being built as a real service, one complete increment at a time. Mobile-first layouts remain mandatory. Do not substitute simulated business operations for unfinished features.

## Part 1: Public clinic discovery

- Public homepage and informational service categories.
- PostgreSQL-backed approved-clinic directory and profiles through `GET /api/clinics` and `GET /api/clinics/:id`.
- Only active services and dentist profiles are published. Profiles use actual saved contact details. No fabricated reviews, prices, credentials, or clinic photos.
- Client-side search by clinic, dentist, treatment, and location, with distinct loading, empty, filtered-empty, and error/retry states.
- Informational treatment estimates use the selected clinic's published prices. No browser amount is used to charge money or create a booking.
- No public dashboard, browser appointment persistence, fake confirmation, or payment submission.

Database records must be provisioned before listings can appear. Clinics can now register and administrators can approve their profiles through the account workflow below.

## Part 2: Clinic registration, approval, and protected access

- Transactional registration of a clinic staff account and unpublished clinic.
- Hashed passwords, database-backed sessions, sign-in/sign-out, and server-side access checks.
- Registration status and review notes for pending/rejected clinics.
- Administrator-only approval/rejection with reviewer, timestamp, and notes.
- Approved-clinic dashboard with saved clinic information and actual database counts.
- Private first-administrator setup command and versioned schema migrations.

See [clinic accounts setup](09_CLINIC_ACCOUNTS_SETUP.md). Profile/service/dentist editing and scheduling are still the next increment, and password recovery/email verification are not yet available.

## Subsequent parts

1. Clinic management: profile editing, dentist credentials, service/price management, dentist-service assignments, and staff ownership rules.
2. Account lifecycle: password recovery, email verification, and staff/dentist access. Customer registration is not required by the original brief and is not a prerequisite for browsing or the planned booking process.
3. Scheduling and booking: actual availability, duration and conflict checks in database transactions, patient intake, persistent requests, and authorized review actions.
4. Appointment management: tracking, policy-based cancellation/rescheduling, and notifications.
5. Payment integration: provider-confirmed deposits, idempotent callbacks, reconciliation, refunds, and confirmation rules.
6. Completed-visit reviews, deployment configuration, and operational verification.

These are implementation stages, not features claimed as already available to visitors.

## Verification boundaries

Public directory unit tests use a controlled query adapter. The account/approval integration suite uses the real schema and migrations with an isolated PGlite PostgreSQL engine. Browser tests use API fixtures confined to the test files. Test records are not inserted into the application's deployed database.

Docker PostgreSQL 16 deployment connectivity remains unverified because the local Docker engine is not running. Before enabling public clinic onboarding or bookings, configure the intended database, create the first administrator, and verify the complete flow against the deployed stack.

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
- Separate administrator sign-in (`/admin/sign-in`) and clinic sign-in (`/clinic/sign-in`), with portal-specific server role checks. Administrator pages use their own layout and are not linked from patient navigation.

See [clinic accounts setup](09_CLINIC_ACCOUNTS_SETUP.md). Profile/service/dentist editing and scheduling are still the next increment, and password recovery/email verification are not yet available.

## Patient accounts and public browsing

The user has added a patient-access requirement beyond the original brief: guests can browse clinic information, services, and cost estimates, but must sign in as a patient for booking and personal features.

- Patient registration and sign-in use `/patient/register` and `/patient/sign-in`. The `/sign-in` shortcut now redirects to patient sign-in; clinic and administrator addresses remain separate.
- `/book`, `/appointments`, and `/account` require a patient session. Guests return to their requested patient page after registering/signing in. Return URLs are restricted to known local patient routes.
- Patient accounts are stored in PostgreSQL with hashed passwords and database-backed sessions. Public patient registration cannot select a staff or administrator role.
- Personal appointments are read from the database, restricted to the session's patient ID, with no client-supplied patient selector. The current screen shows the latest 50 linked records and an honest empty state.
- Actual appointment submission, scheduling, payments, cancellation, and rescheduling remain future work; signing in does not simulate those operations.

## Operator-provisioned owner access

Source support now includes an explicit owner account with a username, separate portal-scoped sign-ins, and a selector for existing clinic workspaces. The requested weak-password account is development-only and blocked in production; production provisioning requires a strong password. Ordinary account, portal, and patient-record boundaries remain enforced. See [owner account setup](13_OWNER_ACCESS.md) for installation and provisioning. This source change does not by itself install an account on another host or deploy production.

## Subsequent parts

1. Clinic management: profile editing, dentist credentials, service/price management, dentist-service assignments, and staff ownership rules.
2. Account lifecycle: password recovery, email verification, and staff/dentist access. Patient sign-in is now required for booking and personal features by the user's later instruction; browsing remains public.
3. Scheduling and booking: actual availability, duration and conflict checks in database transactions, patient intake, persistent requests, and authorized review actions.
4. Appointment management: tracking, policy-based cancellation/rescheduling, and notifications.
5. Payment integration: provider-confirmed deposits, idempotent callbacks, reconciliation, refunds, and confirmation rules.
6. Completed-visit reviews, deployment configuration, and operational verification.

These are implementation stages, not features claimed as already available to visitors.

## Verification boundaries

Public directory unit tests use a controlled query adapter. The account/approval integration suite uses the real schema and migrations with an isolated PGlite PostgreSQL engine. Browser tests use API fixtures confined to the test files. Test records are not inserted into the application's deployed database.

The native Windows PostgreSQL 16 runtime has now been configured, the requested administrator created, and the complete registration/sign-in/approval/dashboard/logout flow verified in a real browser without API fixtures. See [local testing](10_LOCAL_TESTING.md). Temporary verification records were removed. Docker deployment remains unverified because WSL is unresponsive; this does not prevent local native testing. Public deployment still requires its own database, HTTPS, and operational verification.

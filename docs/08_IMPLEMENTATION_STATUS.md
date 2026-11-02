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

See [clinic accounts setup](09_CLINIC_ACCOUNTS_SETUP.md). Password recovery/email verification are not yet available.

## Clinic setup tools (development preview)

These tools are available in the development preview on port 3013. Production has not been updated with this increment.

Approved clinic staff can use the setup tools in `/clinic`:

- Edit the public clinic name, description, address, phone, and email. Public contact email remains separate from account sign-in email.
- Create and edit services, categories, estimated PHP prices, and durations. Publish or hide each service; published services appear in discovery and the calculator.
- Create and edit dentist names, professional titles, and supplied credentials. Publish or hide each profile without deleting its history. Dentist profiles do not create sign-in accounts.
- Add and remove recurring weekly working hours in Philippine time for published dentists. Split shifts are supported; overlapping hours for the same dentist are rejected.
- Read real database records with loading, empty, error/retry, and save feedback states.

Every tool requires a current server-validated clinic session and an approved clinic. Ordinary staff are scoped to their owned clinic, including every record update and schedule removal. Operator owner access must select an approved clinic before using these tools. Writes lock the clinic record while validating approval and saving changes.

## Booking and clinic review (development preview)

- Dentist editors assign treatments within their clinic. Only published, assigned service/dentist combinations can receive requests.
- `/patient/book` uses saved working hours, treatment durations, and existing reservations. Slots start at 15-minute intervals within each shift, require 15 minutes of lead time, and cover today through 90 days ahead in Asia/Manila.
- Each request covers one treatment and is saved with the session’s patient identity, server price and duration, contact details, optional visit notes, and a unique request code. Price/duration changes require the patient to review a refreshed quote.
- A transaction locks the clinic while checking configuration and reserving time. Pending, accepted, and confirmed requests block overlaps for the same dentist. Declines release the time. Request keys make identical retries return the saved record.
- The clinic inbox shows the latest 100 records for a chosen status, with a refresh action. Only the owning approved clinic (or an explicitly selected owner clinic) can accept or decline pending requests. Declines require a reason; both outcomes record reviewer, time, and patient-visible notes.
- Acceptance rechecks working hours, current assignments, publication, and conflicts. Patients can refresh their account-scoped appointment list to see decisions. Treatment names and prices are preserved on new service lines.

Production has not been updated. Payments, final confirmation, cancellations/rescheduling, notifications, completion, feedback, and date-specific closures remain planned. Changing setup information does not silently alter existing appointments.

## Patient accounts and public browsing

The user has added a patient-access requirement beyond the original brief: guests can browse clinic information, services, and cost estimates, but must sign in as a patient for booking and personal features.

- Patient registration and sign-in use `/patient/register` and `/patient/sign-in`. The `/sign-in` shortcut now redirects to patient sign-in; clinic and administrator addresses remain separate.
- `/book`, `/appointments`, and `/account` require a patient session. Guests return to their requested patient page after registering/signing in. Return URLs are restricted to known local patient routes.
- Patient accounts are stored in PostgreSQL with hashed passwords and database-backed sessions. Public patient registration cannot select a staff or administrator role.
- Personal appointments are read from the database, restricted to the session's patient ID, with no client-supplied patient selector. The current screen shows the latest 50 linked records and an honest empty state.
- Appointment submission, availability, and clinic acceptance/decline are available in the development preview described above. Payments, cancellation, and rescheduling remain planned.

## Operator-provisioned owner access

Source support now includes an explicit owner account with a username, separate portal-scoped sign-ins, and a selector for existing clinic workspaces. The requested weak-password account is development-only and blocked in production; production provisioning requires a strong password. Ordinary account, portal, and patient-record boundaries remain enforced. See [owner account setup](13_OWNER_ACCESS.md) for installation and provisioning. This source change does not by itself install an account on another host or deploy production.

## Subsequent parts

1. Further clinic management: additional staff access and date-specific closures. Setup and dentist-service assignments are implemented in the preview.
2. Account lifecycle: password recovery, email verification, and staff/dentist access. Patient sign-in is now required for booking and personal features by the user's later instruction; browsing remains public.
3. Further booking controls: agreed reservation expiry, clinic-specific booking policies, and date-specific closures. Basic availability, persistent requests, and authorized review are implemented in the preview.
4. Appointment management: tracking, policy-based cancellation/rescheduling, and notifications.
5. Payment integration: provider-confirmed deposits, idempotent callbacks, reconciliation, refunds, and confirmation rules.
6. Completed-visit reviews, deployment configuration, and operational verification.

These are implementation stages, not features claimed as already available to visitors.

## Verification boundaries

Public directory unit tests use a controlled query adapter. The account/approval integration suite uses the real schema and migrations with an isolated PGlite PostgreSQL engine. Browser tests use API fixtures confined to the test files. Test records are not inserted into the application's deployed database.

The native Windows PostgreSQL 16 runtime has now been configured, the requested administrator created, and the complete registration/sign-in/approval/dashboard/logout flow verified in a real browser without API fixtures. See [local testing](10_LOCAL_TESTING.md). Temporary verification records were removed. Docker deployment remains unverified because WSL is unresponsive; this does not prevent local native testing. Public deployment still requires its own database, HTTPS, and operational verification.

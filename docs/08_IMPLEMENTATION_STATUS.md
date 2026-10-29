# Incremental implementation status

DentaBook is being built as a real service, one complete increment at a time. Mobile-first layouts remain mandatory. Do not substitute simulated business operations for unfinished features.

## Part 1: Public clinic discovery

- Public homepage and informational service categories.
- PostgreSQL-backed approved-clinic directory and profiles through `GET /api/clinics` and `GET /api/clinics/:id`.
- Only active services and dentist profiles are published. Profiles use actual saved contact details. No fabricated reviews, prices, credentials, or clinic photos.
- Client-side search by clinic, dentist, treatment, and location, with distinct loading, empty, filtered-empty, and error/retry states.
- Informational treatment estimates use the selected clinic's published prices. No browser amount is used to charge money or create a booking.
- No public dashboard, browser appointment persistence, fake confirmation, or payment submission.

Database records must be provisioned before listings can appear. Clinic onboarding and approval tools are a later increment; there is currently no public write endpoint for them.

## Subsequent parts

1. Accounts and server-side sessions: patient, clinic staff, and platform administrator authorization, validation, password recovery, and access checks.
2. Clinic onboarding and approval: real profiles, dentist credentials, service/price management, and staff ownership rules.
3. Scheduling and booking: actual availability, duration and conflict checks in database transactions, patient intake, persistent requests, and authorized review actions.
4. Appointment management: tracking, policy-based cancellation/rescheduling, and notifications.
5. Payment integration: provider-confirmed deposits, idempotent callbacks, reconciliation, refunds, and confirmation rules.
6. Completed-visit reviews, deployment configuration, and operational verification.

These are implementation stages, not features claimed as already available to visitors.

## Verification boundaries

Server route tests use a controlled query adapter. Browser tests use API fixtures confined to the test files. They validate behavior without inserting invented records into the application or database.

Live PostgreSQL integration and deployment have not been verified in this increment: the local Docker engine is not running. Before enabling real clinic onboarding or bookings, provision the database using the project configuration and verify the complete flow against it.

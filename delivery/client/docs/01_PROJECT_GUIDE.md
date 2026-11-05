# Project guide

## Purpose

DentaBook helps people browse approved clinics, explore treatments, estimate published costs, and request appointments. The source in this delivery matches the production features released through 5 November 2026. Clinic review, direct GCash verification, unpaid Pay at clinic confirmation, cancellation/rescheduling, private intake/follow-up, profile/password editing, and scoped staff access are live.

## Who uses the website

| Person | Available behavior |
| --- | --- |
| Visitor | Browse clinics, public profiles, treatments, and estimates without signing in |
| Patient | Register/sign in, request and track own appointments, manage eligible changes/payments, submit intake/replies, and edit name/phone/password |
| Clinic owner | Register/check approval; manage setup, appointments, intake, hours, payments, staff invitations, and access |
| Clinic manager | Manage clinic setup, appointments, intake, hours, and payments; cannot manage staff access |
| Appointment staff | Handle appointments, private intake/follow-up, and working hours; cannot administer payments or edit clinic/service/dentist setup |
| Platform administrator | Review clinic submissions on the separate administration website |

The server validates roles, approval, membership, and record ownership. Public registration cannot grant administrator access. Dentist profiles do not create sign-in accounts. Clinics appear publicly only after approval, and listings use saved records with honest loading/empty/error states.

## Delivery boundaries

The calculator estimates published costs without creating a booking or collecting money. New requests reserve available times and retain quoted treatments/prices. Clinics accept/decline requests before patients choose explicitly enabled payment methods. GCash references require actual clinic verification; Pay at clinic remains unpaid. Cancellation/rescheduling follow clinic-configured rules and preserve payments/receipts.

Clinics supply their own intake questions and purpose/retention statements. Answers remain private to the patient and authorized clinic staff; follow-up appears in the signed-in portals. Retention statements do not trigger automatic record deletion. Owners share staff invitations directly, without automated email delivery.

Notifications/reminders, password recovery, verified email changes, closures/buffers, reservation expiry, completion/feedback, cash collection/refund recording, dentist-specific sign-in/MFA, complete history pagination, and expanded off-host recovery remain planned. See the [status and development plan](06_STATUS_AND_DEVELOPMENT_PLAN.md).

## Interface and handoff

The supplied DentaBook branding and blue-and-white theme are retained. Layouts begin on phones, with stacked forms, readable controls, touch targets, and contained scrolling regions. No clinics, ratings, credentials, prices, or appointment records are invented.

This handoff contains source, migrations, configuration templates, automated tests, asset notices, and client documentation. Live data, private credentials, backups, and hosting access are excluded. See the [user guide](02_USER_GUIDE.md) for available tasks.

# Visit completion, booking intake, and dentist access

Status: available in the development preview; not released to production.

## Behavior and access rules

Clinic owners, managers, appointment staff, and the assigned dentist may record a confirmed visit as completed after its scheduled end in Philippine time. Staff explicitly confirm attendance. Pending appointment changes must first be resolved. Completion saves staff identity/time and leaves payment records unchanged. Repeating completion does not rewrite the audit fields. Cancelled, declined, pending, accepted, and future visits cannot be completed.

Only the owning patient may submit one rating (1–5) and optional comment (up to 2,000 characters) after recorded completion. Repeating identical feedback returns the saved record; different replacement feedback is rejected. Feedback is private to the patient and authorized clinic staff, including the assigned dentist. There are no public ratings, moderation promises, or email invitations in this increment.

Enabled clinic intake questions relevant to the selected service appear before booking submission, with the clinic's purpose/retention statements and explicit consent. The API requires current question versions, valid answers, and required responses. Appointment, treatment snapshot, and intake snapshot save in one transaction. Failed intake leaves no reservation. Existing saved appointments retain the follow-up/intake workflow. Changing clinic/treatment or refreshing booking options clears unsaved answers/consent. Booking retries include the intake payload in their identity.

Owners invite dentists through Staff access and link an active profile from their own clinic. Dentists accept the existing private, expiring, single-use invitation and use `/clinic/sign-in`. No public registration or automatic access comes from a dentist profile. The API scopes appointment lists, counts, details, decisions, intake/follow-up, completion, and feedback to the linked dentist. Dentists cannot administer schedules, clinic settings, payments, staff, or appointment changes. Revocation, reassignment, hidden profiles, and clinic suspension are checked by the server on subsequent requests. MFA remains future work.

## Verification

The backend regression suite passed 90 active checks (six existing real-PostgreSQL-only checks skipped in the embedded-engine run). The feature integration suite also passed all 11 checks on real disposable PostgreSQL, including competing completion retries, invalid completion transitions, pending-change protection, payment preservation, private feedback ownership/retries, dentist reassignment/hidden-profile restrictions, and transactional booking intake.

The new real browser journey passed with the actual API and disposable PostgreSQL: owner dentist invitation, acceptance/sign-in, intake before booking, assigned dentist review, Pay at clinic confirmation, completion, feedback submission/reload, clinic feedback visibility, and unchanged unpaid status. The changed interfaces were checked first at 390px, then 320px, 768px, and 1440px for overflow, readable controls, and 44px actions. Phone screenshots were visually reviewed. Existing browser regressions passed 34 checks; the additional Nginx security-header check passed against the development preview (it is not applicable to Vite). Six environment-specific browser checks were skipped.

Development preview: patient/clinic at `http://10.10.1.113:3013`; administration remains separate at port 3015. Production was not deployed.

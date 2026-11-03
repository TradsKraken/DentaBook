# API reference

This appendix is for developers and operators. Browser users should use the normal website forms.

## Hosts and request rules

Public and clinic requests use `https://dentabook.forgroup.space/api`. Administrator requests use `https://dentabook-admin.forgroup.space/api`. Browser requests stay on the current host and use its session cookie.

State-changing requests use JSON, `Content-Type: application/json`, and `X-DentaBook-Request: 1`. The server rejects mismatched browser origins and cross-site request metadata. A valid session is still required where shown below. The configured API process rejects routes belonging to another production area with 404.

## Public and clinic endpoints

| Method | Path after `/api` | Access and purpose |
| --- | --- | --- |
| GET | `/health` | Reports service and database readiness |
| GET | `/clinics` | Approved public clinic directory |
| GET | `/clinics/:id` | Approved clinic details with active public services/dentists |
| POST | `/auth/register-patient` | Validated patient registration; the role is assigned by the server |
| POST | `/auth/patient/login` | Patient-only sign-in |
| POST | `/auth/register-clinic` | Transactional clinic/staff registration, initially pending review |
| POST | `/auth/clinic/login` | Clinic-staff-only sign-in |
| POST | `/auth/login` | Existing clinic-only compatibility alias |
| GET | `/auth/me` | Valid session; current account and owned clinic information when applicable |
| POST | `/auth/logout` | Revokes the presented session and clears its cookie |
| GET | `/workspaces/patient/appointments` | Patient session; latest 50 linked appointments |
| GET | `/workspaces/clinic` | Approved clinic owner’s saved clinic details and counts |
| GET | `/workspaces/clinic/manage` | Clinic session: private setup data, assignments, and pending count |
| PUT | `/workspaces/clinic/manage/profile` | Edit the approved owning clinic’s public details |
| POST | `/workspaces/clinic/manage/services` | Add a service with price, duration, and publication flag |
| PUT | `/workspaces/clinic/manage/services/:id` | Edit only a service in the owning clinic |
| POST | `/workspaces/clinic/manage/dentists` | Add a dentist profile with optional service assignments |
| PUT | `/workspaces/clinic/manage/dentists/:id` | Edit a dentist and optionally replace own-clinic service assignments |
| POST | `/workspaces/clinic/manage/schedules` | Add recurring working hours; reject invalid/overlapping shifts |
| DELETE | `/workspaces/clinic/manage/schedules/:id` | Remove only an owned dentist’s shift; preserve existing appointments |
| GET | `/workspaces/patient/booking-options?clinicId=...` | Patient session: published services, dentists/assignments, contact defaults, date window |
| GET | `/workspaces/patient/availability?clinicId=...&serviceId=...&dentistId=...&date=YYYY-MM-DD` | Patient session: current server-derived slots and treatment quote |
| POST | `/workspaces/patient/appointments` | Patient session: atomically validate and save one treatment request |
| GET | `/workspaces/clinic/manage/appointments?status=pending_review` | Approved clinic session: latest 100 own records for a selected status |
| PUT | `/workspaces/clinic/manage/appointments/:id/review` | Approved clinic session: accept/decline only a pending own request |

Patient registration accepts `name`, `email`, `phone`, and `password`. Clinic registration accepts `ownerName`, `email`, `password`, `clinicName`, `address`, `phone`, `contactEmail`, `registrationReference`, and `consent: true`. Client-side password confirmation is not a stored field. Unknown role/status fields cannot select elevated privileges.

## Administrator endpoints

The administrator host also provides `/health`, the public clinic read endpoints, and its own `/auth/me` and `/auth/logout` session operations.

| Method | Path after `/api` | Access and purpose |
| --- | --- | --- |
| POST | `/auth/admin/login` | System-administrator-only sign-in |
| GET | `/workspaces/admin/clinics?status=pending_review` | Administrator session; registrations in the chosen status |
| POST | `/workspaces/admin/clinics/:id/review` | Administrator session; review a pending registration |

The review body uses `decision: "approved"` or `decision: "rejected"`, with optional `notes`. Rejection requires nonempty notes. Notes are limited to 2,000 characters. A previously reviewed registration returns a conflict instead of being reviewed again as pending.

## Responses and errors

Successful endpoints return JSON, except logout returns HTTP 204. Sign-in sets a protected cookie; it does not return a bearer token in the response body. Private session/workspace responses use `Cache-Control: no-store`.

| Status | Meaning |
| --- | --- |
| 200 / 201 | Successful read/action or new registration |
| 204 | Logout completed |
| 400 | Invalid input; registration may include field-specific errors |
| 401 | Sign-in required, expired session, or incorrect login credentials/role |
| 403 | Role, approval, or origin restrictions deny the request |
| 404 | Unknown, unpublished, or wrong-portal route/resource |
| 409 | Duplicate registration or review conflict |
| 429 | Temporary request-rate limit; follow `Retry-After` |
| 503 | Service or database temporarily unavailable |

Most errors use an `error` message, with `fields` where relevant. `/health` uses its status/database readiness structure. Clinic setup, availability, creation, and request-review APIs above are development-preview features. GCash and Pay at clinic endpoints are described below. Gateway callbacks, cash collection, refund actions, appointment-change, completion, and password-reset APIs are not delivered.

## Booking request contract (development preview)

`POST /workspaces/patient/appointments` accepts `clinicId`, `serviceId`, `dentistId`, `date` (YYYY-MM-DD), `time` (HH:MM), `phone`, `notes` (up to 2,000 characters), `requestKey` (UUID), `expectedPrice` (decimal string), and `expectedDuration` (integer minutes). Each request contains one treatment. The patient identity, registered account email, stored price, duration, and initial `pending_review` status are assigned by the server. The request body does not need `email`; a supplied email is ignored. Creating a new request requires a valid email on the account (otherwise 400), including owner accounts. Existing identical retries retain the originally saved email. A changed quote or unavailable time returns 409.

Generate a new request key for a new request and reuse it for an identical retry. A saved identical retry returns HTTP 200 with the same appointment; initial creation returns 201. Reusing a key with changed details returns 409. The response includes `appointment` with its code, status, visit date/time, quoted total, clinic/dentist names, and service names.

Dates use Asia/Manila, today through 90 days ahead. Slots start every 15 minutes within a saved shift, fit the full treatment duration, and require 15 minutes of lead time. Pending, accepted, and confirmed reservations block overlapping times for the same dentist. The final check and inserts occur in one transaction under a clinic row lock shared with setup/review writes.

Dentist creates/updates accept optional `serviceIds`: up to 100 unique own-clinic service UUIDs. Omitting the field preserves existing assignments on updates; an empty array removes all assignments. Public booking uses active services and active dentists only.

The clinic review body uses `decision: "accepted"` or `decision: "declined"` and `notes` (string, up to 2,000 characters). Declining requires nonempty notes. Acceptance rechecks future time, active assignments, working hours, and conflicts. Reviewer/time/notes are saved. The response includes `pendingAppointments` for the workspace count. A stale decision returns 409.

Owner clinic sessions must supply `clinicId` on every clinic-tool read/write. Ordinary staff cannot use a clinic selector. Administrator portal routes and patient/clinic roles remain separate.

## GCash and Pay at clinic (development preview)

All reads require the relevant server-validated role/session; mutations also require the existing origin/CSRF checks. No public callback or browser success flag can mark payments paid.

| Method | Path under `/api` | Behavior |
| --- | --- | --- |
| PUT | `/workspaces/clinic/manage/deposit-policy` | Save `gcashEnabled`, `walkInEnabled`, `percentage`, `refundTerms`, `gcashAccountName`, `gcashNumber`; GCash requires a valid explicit policy and recipient |
| GET | `/workspaces/patient/appointments/:id/payment` | Own appointment, server quote, allowed choices, and latest payment state |
| POST | `/workspaces/patient/appointments/:id/payment-choice` | `channel: gcash or walk_in`, UUID `requestKey`; GCash also requires current `quoteHash` and `acceptTerms: true` |
| POST | `/workspaces/patient/appointments/:id/payment-reference` | Submit `reference` for an own pending GCash choice; no paid status is accepted |
| GET | `/workspaces/clinic/manage/payments?status=all` | Latest 100 own-clinic records; pending/paid/failed/needs_review filters |
| POST | `/workspaces/clinic/manage/payments/:id/review` | `decision: verify`, `confirm_walk_in`, or `reject`; verify requires `receivedAmount`, exact `matchedReference`, and `checkedAccount: true`; rejection requires `notes` |
| GET | `/workspaces/patient/payments/:id/receipt` | Own verified deposit receipt |
| GET | `/workspaces/clinic/manage/payments/:id/receipt` | Owning clinic’s verified receipt |

Clinic owner selectors retain `clinicId` on all clinic payment requests. All payment choices/reviews lock the clinic and appointment in a transaction. Payment choice keys, active choices, receipt codes, and verified GCash references have database uniqueness protection. The server computes deposits with integer centavo rounding and snapshots terms/recipient before a transfer. Pay at clinic stores the estimated amount due with pending status; it never creates a received-payment receipt.

## Appointment change endpoints (live)

Patient session/ownership is required for `GET /api/workspaces/patient/appointments/:id/changes`, `GET .../:id/reschedule-availability?date=YYYY-MM-DD`, `POST .../:id/cancel`, `POST .../:id/reschedule`, and `POST .../:id/changes/:changeId/withdraw`. Mutations require the existing request header and origin checks. Cancellation/reschedule submissions include `reason`, `requestKey`, and the reviewed `policyHash`; rescheduling also includes `date` and `time`.

Approved owning clinics use `PUT /api/workspaces/clinic/manage/appointment-policy`, `GET .../appointments/:id/changes`, `POST .../appointments/:id/cancel`, and `POST .../appointments/:id/changes/:changeId/review`. Policy fields are `cancelEnabled`, `cancelNoticeHours`, `rescheduleEnabled`, `rescheduleNoticeHours`, and `terms`. Review fields are `decision` (`approved`/`declined`) and required `notes`. Staff cancellation requires `reason` and `requestKey`. Owner access retains the explicit clinic selector. The inbox supports `status=reschedule_requests`. Administrator listeners do not expose these routes.

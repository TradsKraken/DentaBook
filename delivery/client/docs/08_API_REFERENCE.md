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
| GET | `/workspaces/clinic` | Approved clinic owner/member’s saved clinic details and counts |
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

Most errors use an `error` message, with `fields` where relevant. `/health` uses its status/database readiness structure. Clinic setup, availability, creation, and request-review APIs above are live. GCash and Pay at clinic endpoints are described below. Gateway callbacks, cash collection, refund actions, completion, and password-reset APIs are not delivered.

## Booking request contract (live)

`POST /workspaces/patient/appointments` accepts `clinicId`, `serviceId`, `dentistId`, `date` (YYYY-MM-DD), `time` (HH:MM), `phone`, `notes` (up to 2,000 characters), `requestKey` (UUID), `expectedPrice` (decimal string), and `expectedDuration` (integer minutes). Each request contains one treatment. The patient identity, stored price/duration, and initial `pending_review` status are assigned by the server. The request accepts a valid appointment contact `email`, prefilled from the account when available. Accounts without email enter the appointment address manually. This never changes the account email or grants account access. Existing identical retries retain the originally saved email. A changed quote or unavailable time returns 409.

Generate a new request key for a new request and reuse it for an identical retry. A saved identical retry returns HTTP 200 with the same appointment; initial creation returns 201. Reusing a key with changed details returns 409. The response includes `appointment` with its code, status, visit date/time, quoted total, clinic/dentist names, and service names.

Dates use Asia/Manila, today through 90 days ahead. Slots start every 15 minutes within a saved shift, fit the full treatment duration, and require 15 minutes of lead time. Pending, accepted, and confirmed reservations block overlapping times for the same dentist. The final check and inserts occur in one transaction under a clinic row lock shared with setup/review writes.

Dentist creates/updates accept optional `serviceIds`: up to 100 unique own-clinic service UUIDs. Omitting the field preserves existing assignments on updates; an empty array removes all assignments. Public booking uses active services and active dentists only.

The clinic review body uses `decision: "accepted"` or `decision: "declined"` and `notes` (string, up to 2,000 characters). Declining requires nonempty notes. Acceptance rechecks future time, active assignments, working hours, and conflicts. Reviewer/time/notes are saved. The response includes `pendingAppointments` for the workspace count. A stale decision returns 409.

Owner clinic sessions must supply `clinicId` on every clinic-tool read/write. Ordinary staff cannot use a clinic selector. Administrator portal routes and patient/clinic roles remain separate.

## GCash and Pay at clinic (live)

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

## Intake, profiles, staff, and easier hours (live 5 November 2026)

| Method | Path under `/api` | Access and behavior |
| --- | --- | --- |
| PUT | `/auth/patient/profile` | Patient session; edit `name` and `phone`, preserving account identity and existing booking contacts |
| PUT | `/auth/patient/password` | Ordinary patient session; verify `currentPassword`, set `password`, revoke all sessions |
| POST | `/auth/staff-invitation/details` | Private invitation `token`; read valid invitation details without consuming it |
| POST | `/auth/staff-invitation/accept` | Single-use token, invited `email`, `password`, and new-account `name`; creates/reactivates authorized clinic membership |
| GET/PUT | `/workspaces/clinic/manage/intake-settings` | Owner/manager; versioned `enabled`, `purpose`, `retention`, and clinic-configured `questions` |
| GET/PUT | `/workspaces/patient/appointments/:id/intake` | Owning patient; read settings/history or save `version`, UUID `requestKey`, `consent: true`, and `answers` |
| GET | `/workspaces/clinic/manage/appointments/:id/intake` | Authorized clinic staff; private submissions and follow-up |
| POST | `/workspaces/clinic/manage/appointments/:id/followups` | Authorized clinic staff; save `question` and UUID `requestKey` |
| POST | `/workspaces/patient/appointments/:id/followups/:followupId/reply` | Owning patient; save one `response` on an active visit |
| GET | `/workspaces/clinic/manage/staff` | Owner only; memberships, invitations (without tokens), and access events |
| POST | `/workspaces/clinic/manage/staff/invitations` | Owner only; invited `email` and `role` (`manager` or `appointments`); returns token once |
| DELETE | `/workspaces/clinic/manage/staff/invitations/:id` | Owner only; revoke an unused invitation |
| PUT/DELETE | `/workspaces/clinic/manage/staff/members/:id` | Owner only; change `role` or revoke membership and clinic sessions |
| POST | `/workspaces/clinic/manage/schedules/bulk` | Authorized staff; `dentistIds`, `days` (0–6), `shifts` (`start`/`end`); atomically add hours, reject overlaps, return `added`/`skipped` |
| PUT | `/workspaces/clinic/manage/schedules/:id` | Authorized staff; edit `day`, `start`, `end` for an active own-clinic dentist without moving appointments |

Question objects contain UUID `id`, `label`, `type` (`text`/`yes_no`), boolean `required`, and `serviceId` (own-clinic service UUID or null). Up to 30 questions are supported; answers contain `questionId` and `value`. Submission records preserve question/policy snapshots and consent. Clinic settings use optimistic version checks; retries with changed content return conflict.

Membership/approval is rechecked on clinic requests. Managers can use setup/payment tools but cannot administer staff; appointment staff can use appointments/intake/follow-up and working hours only. Platform-owner selectors retain `clinicId`; ordinary members cannot select another clinic. The earlier client-only `/schedules/weekly` endpoint is superseded by bulk assignment and individual editing in the current live release.

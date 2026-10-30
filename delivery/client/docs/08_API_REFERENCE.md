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
| GET | `/workspaces/clinic` | Approved clinic owner's saved clinic details and counts |

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

Most errors use an `error` message, with `fields` where relevant. `/health` uses its status/database readiness structure. No appointment-creation, payment, scheduling, or password-reset API is delivered in this snapshot.

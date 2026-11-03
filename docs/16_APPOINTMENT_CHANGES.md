# Cancellation and rescheduling

Status: released on production and verified on 3 November 2026. The existing clinic setup, booking, editable contact email, GCash verification, and unpaid Pay at clinic confirmation were released on 3 November 2026.

## Configure a clinic

An approved clinic opens **Appointment policies** in its own workspace. It can separately enable patient cancellation and patient reschedule requests, enter a whole-hour notice period from 0 to 2,160 hours for each enabled action, and supply its own terms. Zero permits an action until the visit starts. No patient action, deadline, or refund promise is enabled automatically.

The server checks the visit start in Philippine time and the applicable notice period again when saving an action. Patients outside the deadline must contact the clinic. Approved owning clinic staff can cancel an upcoming pending, accepted, or confirmed visit with a recorded reason, including when patient actions are disabled. Past, declined, completed, and cancelled visits cannot be cancelled again as a new action.

New bookings preserve the enabled change policy shown during booking; stale policy quotes are rejected. Patients can refresh clinic booking options to review changed terms. Older bookings without a saved policy use the current clinic policy until their first change, which saves that policy. Later policy edits do not overwrite saved booking policies. Deposit/refund terms already agreed for a payment remain preserved separately.

## Patient cancellation

Open **My appointments → Manage appointment → Cancel appointment**, enter a reason, and confirm. The server validates ownership, clinic approval, current status, the reviewed policy, and the deadline inside a transaction. Cancellation releases the reserved time and records the requester, role, reason, policy, original visit, and timestamp. An identical retry returns success without another cancellation record.

Pending reschedule requests become superseded. Received payments and receipts stay intact. Paid records and pending GCash claims are flagged for clinic payment/refund review; cancellation does not record a refund, forfeit, or collection. GCash received and verified after cancellation is still recorded with a receipt and needs-review status; it cannot reconfirm the cancelled visit. Pay at clinic remains unpaid.

## Rescheduling

Open **My appointments → Manage appointment → Request reschedule**, choose a date and available time, enter a reason, and submit. The same clinic, dentist, treatment, saved treatment duration, quoted cost, appointment reference, and payment records remain attached to the visit. Changing dentist, clinic, or treatment requires a separate booking workflow.

The original visit remains reserved while a request is pending. The requested time is not held. Patients can withdraw their own pending request without changing the original visit. Only one pending request per appointment is allowed.

Clinic staff select **Reschedule requests** in the appointment inbox, open the visit, and choose **Review reschedule**. Approval and decline require a patient-visible note. Approval rechecks current publication/assignment, working hours, lead time, original visit eligibility, and replacement availability while holding the same clinic lock used by booking, schedule changes, cancellation, and payment review. If the time was taken, the approval fails and the original reservation remains intact. Declining also preserves the original visit.

Successful approval updates the same appointment atomically and keeps its pending/accepted/confirmed status. It does not invent a new payment or imply that an unpaid visit is paid. Change history records the original and requested date/time, requester, reviewer, policy, decision, and notes. Deposit receipts keep the original details as issued and show the current appointment status. Patients refresh appointments/changes to see staff decisions; notifications remain future work.

## Access and API

Every patient endpoint requires the patient role and session-owned appointment. Staff endpoints require approved owning clinic access, or an explicitly selected owner clinic. Administrator listeners do not expose either set of actions. Mutations require the existing origin/request-header checks.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/workspaces/patient/appointments/:id/changes` | Policy, permitted actions, and latest 50 change records |
| GET | `/api/workspaces/patient/appointments/:id/reschedule-availability?date=YYYY-MM-DD` | Replacement times for the original treatment/dentist and saved duration |
| POST | `/api/workspaces/patient/appointments/:id/cancel` | Cancel with `reason`, `requestKey`, and reviewed `policyHash` |
| POST | `/api/workspaces/patient/appointments/:id/reschedule` | Request with `reason`, `requestKey`, `policyHash`, `date`, and `time` |
| POST | `/api/workspaces/patient/appointments/:id/changes/:changeId/withdraw` | Withdraw an own pending request |
| PUT | `/api/workspaces/clinic/manage/appointment-policy` | Save enabled actions, deadlines, and clinic terms |
| GET | `/api/workspaces/clinic/manage/appointments/:id/changes` | Read an owning clinic appointment's policy/history |
| POST | `/api/workspaces/clinic/manage/appointments/:id/cancel` | Staff cancellation with `reason` and `requestKey` |
| POST | `/api/workspaces/clinic/manage/appointments/:id/changes/:changeId/review` | Review with `decision` (`approved`/`declined`) and `notes` |

The inbox also supports `status=reschedule_requests`. Availability remains bounded by the existing 90-day horizon and 15-minute lead time. Special-date closures, automatic reservation expiry, different-treatment rescheduling, automated refunds, and notifications are later increments.

## Release and recovery

Migration `006_appointment_changes.sql` is additive. It preserves existing appointment and payment rows, creates change history, and starts clinic patient actions disabled. The server operator running `scripts/releases.py` owns the release/restore process on this installation. The release manager saves running images and a verified database archive before replacing the website, retaining the five newest verified restore points. Image rollback preserves current customer data and leaves additive tables/columns in place. Off-host backups and recurring restore drills remain checklist item 13.

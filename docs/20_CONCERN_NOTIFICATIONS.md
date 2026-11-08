# Concern notifications

Live in production, released 8 November 2026.

Patients have `/patient/notifications`, accessible from the header bell, appointment navigation, and footer. Clinic staff and linked dentists have a Notifications tab in the clinic workspace.

New concerns notify their selected clinic. Patient replies notify the clinic; clinic replies and saved concern-management events notify the patient. Assignment/status events also notify other authorized clinic staff. The actor's own clinic notifications are excluded. Titles contain no symptom/message excerpts. Existing concerns are not backfilled; notifications begin with new events after migration 010.

Database triggers save notifications in the same transaction as the concern or message. Failed writes roll back both; idempotent concern/message retries create no additional events. Read status is saved separately for each user. One staff member reading an event does not mark it read for colleagues. Mark all as read covers only currently authorized notifications.

Patient ownership, clinic membership/approval and active linked-dentist access are checked by the API. Dentists see unassigned open concerns and their own assigned concerns; reassignment removes access to former concerns' notifications and read actions. Owner clinic selection is preserved. Generic concern links reopen the relevant private thread and still require authorized access.

The notification list has pagination, read/unread state, explicit refresh/retry, single-item read actions and mark-all-as-read. Header/sidebar counts and open lists refresh every 30 seconds while visible and on focus; local concern/read actions refresh the badge immediately. Failed count requests show no count rather than falsely claiming zero. Loading, empty and failure states are separate.

These are saved in-app concern notifications. Email, SMS, device push, appointment notifications and reminders are not included in this increment.

## Verification

Available in the rebuilt development preview at `http://10.10.1.113:3013`; migration 010 is applied there. Production was not deployed.

The backend regression run passed 92 checks, with six existing environment-specific checks skipped. All 13 feature-suite checks passed on disposable PostgreSQL, including notification ownership, per-user reads, transactional duplicate protection, current dentist visibility, pagination boundaries and mark-all-read across pages. Existing browser regressions passed 34 checks after correcting and rerunning the phone-header layout check; eight environment-specific journeys were skipped. Two Nginx navigation/security checks passed against the built development preview.

The real API/PostgreSQL notification browser journey passed clinic and patient notification lists, individual/all read actions, read-state persistence after reload, and links to the correct private concern. Interfaces passed at 390px, 320px, 768px and 1440px; patient phone screenshots were visually reviewed. All test records stayed in disposable databases.

Production release: 8 November 2026. Application commit `618b34d`; migrations 008–010 applied through the restore-point release manager. Current customer data was retained. Earlier development-only verification notes above describe the original test stage.

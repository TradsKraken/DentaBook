# Clinic concern conversations

Live in production, released 8 November 2026.

Patients choose an approved clinic and submit a private reason for consultation. One open conversation per patient per clinic; at most three new conversations per rolling 24 hours across clinics. Patient account locks serialize submissions and retries. Messages require retry keys and are limited to five per minute per author. Limits are enforced on the server, not browser storage.

Active linked dentists see the unassigned queue and their own assigned threads. Explicit accommodation atomically assigns the first dentist; reading or marking spam does not assign anyone. Clinic staff can triage and reply; owners/managers may reassign to an active dentist with a required reason. Patients see the assigned name. Concern assignment does not reserve a slot or confirm a visit; booking remains a separate workflow.

Staff can close, mark spam, or reopen a thread. Owners/managers can restrict patient messages to their clinic for 24 hours, or remove that restriction. Reasons, author and time are retained as patient-visible events, making correction transparent. Restriction never blocks booking or other clinics. Reopening respects the one-open-thread rule. Dentists can manage only their assigned threads, except claiming unassigned concerns. No email delivery or verification is claimed.

## Verification and availability

Available on the development preview at `http://10.10.1.113:3013`, not deployed to production. Migration 009 creates persisted conversations, messages, and clinic-specific restrictions.

Backend regression checks: 91 passed, six existing environment-specific checks skipped. The real PostgreSQL feature suite passed all 12 checks, including competing dentist claims, clinic/patient isolation, message retries, burst limits, daily limits, reassignment and reversible restrictions. Browser regressions: 34 passed, seven environment-specific journeys skipped; Nginx security checks separately passed on the development preview. The new real API/PostgreSQL browser journey passed clinic selection through sign-in, concern submission, duplicate-draft preservation, dentist accommodation, private replies, and restriction/spam reversal. Layout and controls passed at 390px, 320px, 768px and 1440px; phone screenshots were visually inspected. No customer records were created by these tests.

Account-creation abuse protections such as verified email and adaptive verification challenges remain future work. These controls reduce spam from signed-in accounts; they do not claim to eliminate all abuse.

Production release: 8 November 2026. Application commit `618b34d`; migrations 008–010 applied through the restore-point release manager. Current customer data was retained. Earlier development-only verification notes above describe the original test stage.

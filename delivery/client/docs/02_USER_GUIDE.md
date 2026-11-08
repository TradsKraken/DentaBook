# User guide

**Current through the live release of 8 November 2026.**

For a visual walkthrough, see the [patient, clinic, and administrator workflows](11_DIAGRAMS_AND_WORKFLOWS.md).

## Browsing without an account

1. Open https://dentabook.forgroup.space.
2. Choose **Find a clinic** to open the directory.
3. Search by the clinic, service, dentist, or location information available in the saved records.
4. Open a clinic to view its public contact details, active services, and active dentist information.
5. Use **Cost calculator** to select a clinic and its published treatments.
6. Contact the clinic to confirm suitability, availability, and the final price.

If no clinics are listed, approved records have not been published yet. If an error message appears, use the retry action. An empty directory is not the same as a connection error.

## Creating a patient account

1. Open **Patient registration** at `/patient/register`.
2. Enter your name, email address, phone number, and password.
3. Confirm the same password and submit the form.
4. After the account-ready message, continue to patient sign-in.
5. Sign in with the email address and password you registered.

Passwords must contain at least 12 characters and no more than 72 UTF-8 bytes. Some symbols use more than one byte; an ordinary longer passphrase can meet the minimum without using complex symbols.

Patient registration does not grant clinic or administrator access. Password recovery and email verification are not yet implemented. If you forget your password, contact the designated website operator; there is no self-service reset link in this release.

## Using patient pages

**My account** shows the signed-in patient's saved information. **My appointments** shows appointments already associated with that account, or an empty message when none exist. Other patients' information is not available through these pages.

Opening a personal page while signed out leads to patient sign-in. After a successful sign-in, the website returns to the requested patient page. To request a visit:

1. Open **Book an appointment** or a clinic’s **Request an appointment** link.
2. Select a clinic, treatment, assigned dentist, and date.
3. Choose an available time and check the estimated cost. Your account email is filled when available; you may enter a different appointment contact email without changing your account email or appointment ownership. Check your phone number and add optional visit notes.
4. Answer the clinic’s applicable intake questions and explicitly agree to share your answers. Required answers and booking save together; refresh options if the questions changed. Submit once and read the saved request code. The initial status is **pending review**.
5. Open **My appointments** and use **Refresh appointments** to see the clinic’s decision and note.

Accounts without an email can enter a valid appointment contact email. An appointment contact email never grants access to the account.

All times use Philippine time. Requests cover one treatment, today through 90 days ahead, with 15 minutes of lead time. If a time or quote changes, refresh and choose from the current options. A saved pending request reserves the time while the clinic reviews it. Identical submission retries return the same saved request.

**Accepted** means the clinic accepted the request. Open **Deposit & payment details** to see the clinic’s enabled GCash and Pay at clinic options. GCash requires agreeing to the saved deposit/refund terms, transferring in your own GCash app to the displayed clinic account, then submitting the transaction reference. Never provide your PIN or OTP. Staff check their actual account before verifying payment; an eligible accepted visit is then confirmed and a deposit receipt is available to you. Pay at clinic requires staff confirmation and remains unpaid without a receipt. If no method is enabled, contact the clinic. A declined request shows the clinic’s reason. Use **Manage appointment** for cancellation or reschedule requests when enabled by the clinic. The clinic sets notice deadlines and terms; the original reservation remains until a requested replacement is approved. Cancellation preserves payments/receipts and may require refund review; it does not return money automatically.

## Registering a clinic

1. Open `/clinic/register` on the main website.
2. Enter the authorized account holder's name, account email, and password.
3. Enter the clinic's name, address, public phone, public email, and registration or license reference.
4. Confirm that you are authorized to register and manage the clinic.
5. Submit the registration.
6. Sign in at `/clinic/sign-in` to check the result.

The account email is used for sign-in. The public clinic email is contact information intended for the clinic's public listing. Submitting a registration does not automatically publish the clinic or approve its credentials.

## Clinic review results

| Status | Meaning and next step |
| --- | --- |
| Pending review | An administrator has not yet approved or rejected the submission |
| Approved | The clinic can appear in the public directory and the owner can access its workspace |
| Rejected | The clinic remains unpublished; read the review notes and contact the operator about correction |
| Suspended | The clinic workspace is unavailable while the suspension remains in place |

For owners and managers, the approved-clinic workspace opens on **Overview**, showing pending requests, published service/dentist counts, and a four-step booking setup checklist. Use the sidebar on a desktop or the **clinic navigation menu** on a phone. Each section has its own page and supports refresh/back navigation.

The workspace provides these tools:

1. **Clinic profile:** save the public name, description, address, phone, and contact email. Account sign-in email remains separate.
2. **Services & prices:** search or filter the saved service list. Choose **Add a service** or **Edit service** to open a focused form panel for categories, descriptions, estimated PHP prices, durations, and publication. Unpublish a service to hide it while retaining its details/history.
3. **Dentists:** search/filter the team list, then choose **Add a dentist** or **Edit dentist**. In the panel, edit accurate details, publication, and assigned treatments. A profile does not create a staff account.
4. **Working hours:** view shifts grouped by weekday or filter them by dentist. Choose **Add working hours**, choose one or more published dentists and days (or use **Monday–Friday**/**Every day**), enter shifts, check the preview, then **Save working hours**. Choose **Add split shift** for a lunch break or other gap. Use **Edit hours** on a saved shift to change its day/times. The whole batch is rejected if any shift overlaps; identical saved shifts are kept on retry. Hours recur in Philippine time. Existing appointments retain their saved times after hours change.
5. **Appointments:** search loaded requests, choose a status, or refresh the inbox. Choose **Review request** to open the patient/visit details, then **Accept request** or **Decline request** and confirm your decision. Declining requires a reason the patient can read. Reviewed records have **View details**. An accepted request proceeds to the clinic’s enabled payment choices. Use **Deposits & payments** to review submitted references or Pay at clinic requests.

Editor and review panels keep the current list in context. **Close panel**, **Cancel editing**, or Escape dismisses an idle panel. A failed save keeps the entered fields so you can correct or retry it.

Keep the inbox current: pending requests reserve the dentist’s time until reviewed and do not expire automatically. Acceptance rechecks current assignments, working hours, publication, and conflicts. Existing decisions cannot be overwritten through the pending-request review action. The current administrator interface approves or rejects pending clinics; it does not provide a complete suspension-management workflow.

### Deposits & payments

Enable only the methods your clinic accepts. For GCash, save your actual account name and 11-digit mobile number, an explicit deposit percentage, and cancellation/refund terms. Pay at clinic may be enabled without a deposit percentage. Existing GCash choices retain their saved amount, terms, and recipient when settings change.

In payment records, choose **Review payment choice**. For GCash, open your clinic’s actual GCash transaction history, match the incoming reference and exact amount, then enter both and acknowledge the account check. A patient-submitted reference is only a claim. Verification records the reviewer/time and creates a deposit receipt; future accepted visits are confirmed. Payments verified after a visit becomes unavailable are recorded for follow-up without confirming the visit. Rejecting a choice requires a patient-visible reason. Verified references cannot be reused.

For Pay at clinic, confirm the visit while leaving payment unpaid. No cash payment or receipt is invented. Cash collection recording and automatic refunds are future work. Receipts are payment acknowledgements, not tax invoices.

## Patient profile and private intake

On **My account**, edit your full name/phone and choose **Save profile**. Saved appointments keep their original contact details. To change your password, supply the current password, enter/confirm the new password, and save; all devices are signed out. Account-email changes remain unavailable until verified email delivery is implemented.

On **My appointments**, open **Intake & clinic follow-up**. If the clinic enabled questions for this treatment, read its purpose/retention statements, answer required/optional questions, agree to share, and choose **Save intake answers**. Saved versions retain the original questions. If the clinic requests information, enter **Your response** and choose **Send response**. Check the portal for updates; email/SMS messages are not yet sent. Closed visits retain their saved information but do not accept new answers or requests.

## Clinic intake and staff access

Owners/managers open **Patient intake** to add questions, choose written or yes/no/unsure answers, make an answer required, and apply a question to all treatments or one saved clinic service. Enter the collection purpose and your actual record-retention policy before enabling intake. Saving a policy does not schedule record deletion. In **Appointment inbox → View details**, authorized staff read submissions and use **Request information from patient**; the request and patient's reply retain their authors/times without changing visit or payment status.

Only owners use **Staff access**. Enter a staff email, choose **Manager** or **Appointment staff**, and create an invitation. Copy the private link and share it directly with that person; it is shown once and expires after 48 hours. Replacing an invitation invalidates the earlier link. A new staff member enters their name and chooses a password; an existing clinic-staff account uses its invited email and existing password. Patient/admin identities cannot be converted into staff accounts.

Owners can change roles, revoke unused invitations, remove active access, and review access history. Revocation invalidates clinic sessions immediately. Managers manage setup, intake, appointments, hours, and payments but cannot grant staff access. Appointment staff handle appointments/intake/follow-up and working hours; other setup/payment tools remain restricted. Dentist profiles alone never grant sign-in access. Dentist-specific sign-in and MFA remain planned.

## Reviewing clinics as an administrator

1. Open https://dentabook-admin.forgroup.space/admin/sign-in.
2. Sign in with an administrator account provided through the operator setup process.
3. Open the list of pending clinic registrations.
4. Review the submitted details and reference information using the organization's review procedure.
5. Choose approve or reject and complete the confirmation step.
6. Provide a reason when rejecting a registration.
7. Confirm that the updated result appears in the appropriate list.

A review records the decision, reviewer, time, and notes. Approval is an application publishing decision; the software does not independently verify a professional license. There is no public administrator registration or default administrator password.

## Signing out and switching accounts

Choose **Sign out** before using a shared device or changing between patient and clinic accounts. Those two roles share the main website's browser session. Administrator access has its own hostname and session. Administrator sessions last one hour; patient and clinic sessions last eight hours unless revoked earlier.

If sign-in expires, sign in again. Changing a password or account role through an authorized maintenance process revokes existing sessions.

## Ask your chosen clinic before booking

Open a clinic profile and choose **Ask about a concern**, or open **My clinic concerns**. Sign in, choose the clinic, and describe your symptoms and reason for a check-up (10–4,000 characters). Only this clinic receives it. One open concern is allowed per clinic; another draft moves to the existing conversation’s reply field. Up to three new concerns are allowed in 24 hours and five messages per minute per author.

An active owner-invited dentist opens **Patient concerns**, reads an unassigned conversation and selects **Accommodate patient**. Only the first successful claim assigns the dentist. The patient sees the assigned dentist’s name. Dentists see their own assigned concerns and the unassigned queue, while authorized clinic staff can triage concerns. Owners/managers may reassign to an active dentist with a reason. Replies and management history stay private to the patient and authorized clinic.

Staff can close, mark spam or reopen a concern. Owners/managers can impose a clinic-specific 24-hour restriction or remove it, with patient-visible reasons. These actions do not restrict appointment booking at other clinics. Accommodating a concern does not reserve a time or confirm an appointment; use **Book an appointment with this clinic** when ready.

## Notification tabs

Patients use the header bell or **Notifications** link. Clinics and dentists use **Notifications** in the workspace menu. New concerns and patient replies notify the chosen clinic; clinic replies, assignment and management updates notify the patient. Notifications respect current access, refresh every 30 seconds while visible and on focus, and link to the related concern. Use **Mark as read** or **Mark all as read**; each person has their own saved read state. Previous/Next controls reach older notifications. Email/SMS, device push, and appointment reminders are not enabled.

## Dentist access, completed visits and feedback

Owners choose **Staff access**, invite a **Dentist**, and link an active dentist profile from their clinic. The dentist accepts the private single-use invitation and signs in at `/clinic/sign-in`. A public profile alone grants no account access. Dentists review only assigned appointments and see their private intake/follow-up. They cannot manage staff, payments, clinic setup, or appointment changes. Removing access, hiding the profile or suspending the clinic removes access on subsequent requests.

After a confirmed visit’s scheduled end, authorized staff or the assigned dentist can confirm attendance and select **Mark visit completed**. Resolve pending appointment changes first. Completion records the staff member/time; it does not collect payment or change unpaid status. The patient then opens **My appointments**, chooses a rating (1–5), and submits optional feedback once. Feedback is private to the patient and authorized clinic staff; no public rating is published.

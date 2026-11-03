# User guide

**The clinic setup and booking instructions below apply to the development preview and supplied source. Production has not been updated with these increments.**

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

Opening a personal page while signed out leads to patient sign-in. After a successful sign-in, the website returns to the requested patient page. To request a visit in the preview:

1. Open **Book an appointment** or a clinic’s **Request an appointment** link.
2. Select a clinic, treatment, assigned dentist, and date.
3. Choose an available time and check the estimated cost. Your registered email is filled automatically and cannot be changed in booking. Check your phone number and add optional visit notes.
4. Submit once and read the saved request code. The initial status is **pending review**.
5. Open **My appointments** and use **Refresh appointments** to see the clinic’s decision and note.

An account without an email cannot create a new request. Sign out and use a patient account registered with an email address; the development owner login has no email by default.

All times use Philippine time. Requests cover one treatment, today through 90 days ahead, with 15 minutes of lead time. If a time or quote changes, refresh and choose from the current options. A saved pending request reserves the time while the clinic reviews it. Identical submission retries return the same saved request.

**Accepted** means the clinic accepted the request. Arrange payment and final confirmation directly with the clinic; online payments are not available. A declined request shows the clinic’s reason. Patient cancellation and rescheduling controls remain planned.

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

In the development preview, the approved-clinic workspace opens on **Overview**, showing pending requests, published service/dentist counts, and a four-step booking setup checklist. Use the sidebar on a desktop or the **clinic navigation menu** on a phone. Each section has its own page and supports refresh/back navigation.

The workspace provides these tools:

1. **Clinic profile:** save the public name, description, address, phone, and contact email. Account sign-in email remains separate.
2. **Services & prices:** search or filter the saved service list. Choose **Add a service** or **Edit service** to open a focused form panel for categories, descriptions, estimated PHP prices, durations, and publication. Unpublish a service to hide it while retaining its details/history.
3. **Dentists:** search/filter the team list, then choose **Add a dentist** or **Edit dentist**. In the panel, edit accurate details, publication, and assigned treatments. A profile does not create a staff account.
4. **Working hours:** view shifts grouped by weekday or filter them by dentist. Choose **Add working hours**, select a published dentist, weekday, start/end time, then **Save working hours**. Split shifts are supported; overlaps are rejected. Hours recur in Philippine time. Existing appointments retain their saved times after hours change.
5. **Appointments:** search loaded requests, choose a status, or refresh the inbox. Choose **Review request** to open the patient/visit details, then **Accept request** or **Decline request** and confirm your decision. Declining requires a reason the patient can read. Reviewed records have **View details**. An accepted request still needs payment/final confirmation arranged separately.

Editor and review panels keep the current list in context. **Close panel**, **Cancel editing**, or Escape dismisses an idle panel. A failed save keeps the entered fields so you can correct or retry it.

Keep the inbox current: pending requests reserve the dentist’s time until reviewed and do not expire automatically. Acceptance rechecks current assignments, working hours, publication, and conflicts. Existing decisions cannot be overwritten through the pending-request review action. The current administrator interface approves or rejects pending clinics; it does not provide a complete suspension-management workflow.

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

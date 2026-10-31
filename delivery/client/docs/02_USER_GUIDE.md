# User guide

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

Opening a personal page while signed out leads to patient sign-in. After a successful sign-in, the website returns to the requested patient page. Online booking submission remains unavailable; signing in does not create an appointment.

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

The approved-clinic workspace displays saved clinic information and available database counts. Editing services, dentist information, schedules, and appointments is planned work. The current administrator interface approves or rejects pending clinics; it does not provide a complete suspension-management workflow.

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

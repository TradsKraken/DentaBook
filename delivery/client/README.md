<img src="client/public/branding/dentabook-logo.jpg" alt="DentaBook logo" width="240" />

# DentaBook

**Book your smile, know your cost.**

DentaBook connects patients with dental clinics. Patients can explore services and estimated costs, ask their chosen clinic a question, request appointments, and follow their care. Clinics manage their services, dentists, schedules, patient concerns, and bookings. Platform administrators review clinic registrations through a separate administration website.

**Live website:** [Open DentaBook](https://dentabook.forgroup.space) · **Guide updated:** 8 November 2026

## Choose your guide

| I am a… | Start here | Sign in |
| --- | --- | --- |
| Patient | [Patient guide](#patient-guide) | [Patient sign-in](https://dentabook.forgroup.space/patient/sign-in) |
| Clinic owner, staff member, or dentist | [Clinic guide](#clinic-guide) | [Clinic sign-in](https://dentabook.forgroup.space/clinic/sign-in) |
| Platform administrator | [Administrator guide](#administrator-guide) | [Administrator sign-in](https://dentabook-admin.forgroup.space/admin/sign-in) |

You can browse clinics, services, and the cost calculator without an account. Booking, clinic questions, personal records, and notifications require patient sign-in.

**About the pictures:** these are screenshots of the actual website interface with clearly labelled, test-only records. Example names, prices, addresses, dates, and messages illustrate the controls; they are not real clinics, credentials, prices, patients, or appointments. No customer records or passwords appear in the guide. Click an image to view it at full size. On a phone, clinic tools are inside the clinic navigation menu.

## Patient guide

### 1. Find a clinic and explore its services

1. Open [DentaBook](https://dentabook.forgroup.space) and choose **Find a clinic**.
2. Search by clinic, location, dentist, or treatment. Open a clinic to see its published information, services, and dentists.
3. Use **Estimate my cost** or **Cost calculator** to choose treatments and see an estimated total. Final treatment and cost depend on the clinic's assessment.

<img src="docs/screenshots/patient-01-find-clinic.png" alt="Step 1: clinic directory with search and a labelled documentation-only clinic record" width="800" />

### 2. Create your patient account and sign in

1. Open [Patient registration](https://dentabook.forgroup.space/patient/register).
2. Enter your name, email, phone number, password, and matching password confirmation. Follow the password requirements shown on the form.
3. Submit the form, continue to [Patient sign-in](https://dentabook.forgroup.space/patient/sign-in), and sign in with your own account.
4. When sign-in was requested while opening a private page, DentaBook returns you to that page.

<img src="docs/screenshots/patient-02-register.png" alt="Step 2: patient registration form; no account credentials are filled in" width="800" />

### 3. Ask your chosen clinic a question — optional

1. Open the clinic's profile and choose **Ask about a concern**, or open [My clinic concerns](https://dentabook.forgroup.space/patient/concerns).
2. Choose the clinic you want to contact. Describe what you are feeling, when it started if relevant, and why you would like a check-up.
3. Choose **Send concern**. The concern goes only to that clinic. It shows **Waiting for a dentist** until a dentist accommodates it.
4. Once assigned, the dentist's name appears. Open the conversation to read notes and use **Send reply** to continue.

There is one open conversation per patient per clinic. If you start another concern with the same clinic, continue the existing conversation; your additional draft is kept in its reply field. New concerns are limited to three per 24 hours, with five messages per minute per author. **A concern conversation does not reserve a time or confirm an appointment.**

<img src="docs/screenshots/patient-03-ask-clinic.png" alt="Step 3: selected clinic and a written reason for requesting a check-up, using test-only text" width="800" />

### 4. Request an appointment

1. Choose **Request an appointment** on a clinic profile or open [Book a visit](https://dentabook.forgroup.space/patient/book).
2. Select the clinic, treatment, dentist, visit date, and an available time.
3. Check the estimated cost and contact details. The contact email may differ from your account email; changing it here does not change your account.
4. Answer the clinic's required intake questions, if enabled, and agree to share those answers.
5. Review the details and choose **Send appointment request**. Read and retain the saved appointment reference.

The first status is **pending review**, not confirmed. One request covers one treatment and dentist. Times use Philippine time; availability can change before the request is saved. If a selected time is taken, refresh the available times and choose another.

<img src="docs/screenshots/patient-04-book-visit.png" alt="Step 4: appointment booking controls for treatment, dentist, date, time and patient details; all records and the displayed estimate are illustrative" width="800" />

### 5. Track the request and follow the clinic's payment instructions

1. Open [My appointments](https://dentabook.forgroup.space/patient/appointments). Use **Refresh appointments** to see the clinic's saved decision and notes.
2. If accepted, open **Deposit & payment details**. Choose only a payment method enabled by that clinic.
3. For **GCash**, review the deposit and terms, transfer in your own GCash app to the clinic's displayed account, and submit the transaction reference. The clinic must check the actual transfer before recording payment.
4. For **Pay at clinic**, choose that option and wait for the clinic's confirmation. A confirmed Pay at clinic visit is still **unpaid**.
5. Check the appointment status again. **Accepted** and **confirmed** are different stages.

Use **Manage appointment** for cancellation or rescheduling when the clinic's policy permits it. Read the policy and notice deadline. A reschedule request keeps the original visit until the replacement is approved; cancellation does not automatically refund money. Open **Intake & clinic follow-up** for additional clinic questions.

<img src="docs/screenshots/patient-05-payment.png" alt="Step 5: payment details for a test appointment showing the Pay at clinic choice; available methods depend on the real clinic's configuration" width="800" />

### 6. Read your notifications

1. Choose the **bell** in the header or open [Notifications](https://dentabook.forgroup.space/patient/notifications).
2. Read concern replies and assignment/status updates. Choose **Open concern** to return to the conversation.
3. Use **Mark as read**, **Mark all as read**, or **Refresh notifications**. Read status stays saved after you sign out.

Notifications refresh every 30 seconds while the page is visible and on focus. These notifications are inside DentaBook; email, SMS, device push, and appointment reminders are not enabled.

<img src="docs/screenshots/patient-06-notifications.png" alt="Step 6: mobile patient notification inbox with an unread concern reply and links to the conversation" width="340" />

### 7. Leave private feedback after your visit

1. After the clinic records your confirmed visit as completed, open **My appointments**.
2. In **Your visit feedback**, choose a rating and optionally write a comment.
3. Choose **Submit feedback** once. Feedback is private to you and authorized clinic staff; it is not a public rating.

You can also open **My account** to edit your name/phone or change your password using your current password. A password change signs out all sessions. Existing appointment contact details stay as originally booked.

<img src="docs/screenshots/patient-07-feedback.png" alt="Step 7: private feedback form for an example completed visit" width="800" />

## Clinic guide

### 1. Register the clinic and wait for approval

1. An authorized clinic representative opens [Clinic registration](https://dentabook.forgroup.space/clinic/register).
2. Enter the account holder's details and the clinic's real name, address, public contacts, and registration/license reference.
3. Submit the application. Sign in at [Clinic sign-in](https://dentabook.forgroup.space/clinic/sign-in) to check its status and review notes.
4. Wait for administrator approval before accessing clinic management. A submitted application is not automatically approved or published.

Invited staff and dentists should accept the owner's private invitation instead of registering another clinic.

<img src="docs/screenshots/clinic-01-register.png" alt="Clinic step 1: clinic account and registration form with blank credential fields" width="800" />

### 2. Sign in and complete your booking setup

1. After approval, sign in and open **Overview**.
2. Follow the booking setup checklist. On phones, expand the clinic navigation menu to reach each tool.
3. Open **Clinic profile** and save your actual background, location, and contact information.

<img src="docs/screenshots/clinic-02-overview.png" alt="Clinic step 2: approved clinic overview, task navigation, real-record setup checklist and pending request count illustrated with test records" width="800" />

### 3. Add services and assign dentists

1. Open **Services & prices → Add a service**. Enter the treatment name, category, description, estimated price, and duration; publish it when ready.
2. Open **Dentists → Add a dentist**, enter accurate profile information, and select that dentist's treatments. Existing profiles can be edited.
3. Publish the dentist when the information is ready. A public dentist profile by itself does not create sign-in access.

<img src="docs/screenshots/clinic-03-services.png" alt="Clinic step 3a: focused service editor for a procedure's description, price and duration" width="800" />

<details>
<summary>See dentist profiles and treatment assignment</summary>

<img src="docs/screenshots/clinic-04-dentists.png" alt="Clinic step 3b: dentist profile editor with treatment assignments; profile details are test-only" width="800" />

</details>

### 4. Set working hours, payment options, and clinic policies

1. Open **Working hours → Add working hours**. Select dentists and days; use **Monday–Friday** or **Every day** where appropriate.
2. Enter the start/end times. Use **Add split shift** for a lunch break or other gap, review the preview, then **Save working hours**.
3. Open **Deposits & payments** and explicitly enable the methods your clinic accepts. Configure actual GCash recipient/deposit terms if using GCash, or enable Pay at clinic.
4. Open **Appointment policies** to configure patient cancellation/rescheduling permissions, notice deadlines, and terms.
5. Under **Patient intake**, write the questions, explain purpose/retention, choose required/optional answers, and enable intake when ready.

Working hours recur weekly. Schedule edits do not move existing appointments; conflicting batches are rejected rather than partly saved. Payment methods and patient change actions remain unavailable until the clinic enables them.

<img src="docs/screenshots/clinic-05-hours.png" alt="Clinic step 4: multi-dentist and weekday working-hours controls with a save preview" width="800" />

### 5. Review appointments, follow up, and verify payment

1. Open **Appointments**. Choose a status or search the loaded requests.
2. Open a request and read the visit details, contact information, intake answers, and notes.
3. Choose **Accept request** or **Decline request**, add the appropriate note/reason, and confirm the decision. Use private follow-up questions when information is missing.
4. After acceptance, review the patient's payment choice under **Deposits & payments**. Match actual GCash funds, reference, and exact amount before verifying. Review Pay at clinic separately; confirmation does not record payment received.
5. Review cancellation/rescheduling actions under the saved policy. Resolve conflicts before approving another time.

<img src="docs/screenshots/clinic-06-appointments.png" alt="Clinic step 5: appointment details and accept/decline actions for a documentation-only request" width="800" />

### 6. Accommodate concerns and use notifications

1. Open **Patient concerns** to find patients who chose your clinic.
2. A linked dentist opens an unassigned conversation and selects **Accommodate patient**. The first successful claim assigns that dentist; simply opening the conversation does not.
3. Read the concern and send patient-visible replies. **Notifications** shows new concerns, patient replies, and eligible updates, with individual read status.
4. Staff may close, mark spam, or reopen concerns. Owners/managers can reassign to an active dentist or apply/remove a clinic-specific 24-hour restriction, with a recorded reason.

Dentists see unassigned concerns and their own assigned conversations. Appointment assignment/confirmation remains a separate booking process.

<img src="docs/screenshots/clinic-07-accommodate.png" alt="Clinic step 6: linked dentist viewing an unassigned private concern with the Accommodate patient action" width="800" />

### 7. Give each team member the right access

1. The owner opens **Staff access**, enters the person's email, and chooses **Manager**, **Appointment staff**, or **Dentist**.
2. For dentist access, link an active dentist profile from this clinic.
3. Create the invitation and share its private link directly with the intended person. It expires after 48 hours and can be accepted once; do not publish invitation links or passwords.
4. The recipient accepts the invitation and uses **Clinic sign-in**. Owners can change roles, reassign linked dentist access, revoke membership, and inspect access history.

Managers handle clinic setup and payments but cannot manage staff. Appointment staff handle appointments, hours, concerns, and notifications. Dentists are limited to their assigned appointments/concerns and the unassigned concern queue.

### 8. Record completed visits

After a confirmed visit's scheduled end, open its details, resolve any pending appointment changes, confirm that the visit took place, and choose **Mark visit completed**. The system records who completed it and when. Completion does not collect money or change payment status. The patient can then submit private feedback, visible in the visit details.

## Administrator guide

### 1. Use the separate administrator website

1. Open [Administrator sign-in](https://dentabook-admin.forgroup.space/admin/sign-in).
2. Sign in with the administrator account supplied privately by the website operator. There is no public administrator registration or default password in this guide.
3. Patient and clinic accounts cannot enter the administrator portal.

<img src="docs/screenshots/admin-01-sign-in.png" alt="Administrator step 1: separate administrator sign-in page with blank credential fields" width="800" />

### 2. Review clinic registrations

1. Open the registration review page and select **Awaiting review** under **Registration status**.
2. Inspect the submitted clinic details, owner contact, and registration reference. Perform your organization's verification before deciding.
3. Select **Approve clinic** or **Reject clinic** to open the decision confirmation.

<img src="docs/screenshots/admin-02-review.png" alt="Administrator step 2: awaiting-review clinic registration with owner/contact and reference information, all test-only" width="800" />

### 3. Confirm the decision and check the result

1. Read the confirmation screen. Add review notes; a rejection requires a reason.
2. Choose **Confirm decision**. Approval publishes the clinic and unlocks its workspace; rejection keeps it unpublished and shows the clinic your notes.
3. Select **Approved** or **Rejected** in the status filter to find the reviewed record. Sign out when finished.

The current administrator interface reviews pending registrations. It does not provide a complete suspension-management workflow, patient clinical workspace, or clinic payment workspace.

<img src="docs/screenshots/admin-03-decision.png" alt="Administrator step 3: approval confirmation with review notes and Confirm decision button; no decision is submitted during screenshot capture" width="800" />

## More information

| Looking for… | Open |
| --- | --- |
| Full user instructions | [User guide](docs/02_USER_GUIDE.md) |
| Live features, limitations, next work and website addresses | [Feature and release status](docs/FEATURE_STATUS.md) |
| Short website release notes | [Website updates](CHANGELOG.md) |
| Full website history | [Website history](docs/12_DEVELOPMENT_HISTORY.md) |
| Printable handbook | [PDF](https://github.com/TradsKraken/DentaBook_Client/blob/main/CLIENT_GUIDE.pdf) · [HTML](CLIENT_GUIDE.html) |
| Setup, operations, API and security references | [Documentation library](docs/README.md) |
| Source and release verification | [Verification record](docs/VERIFICATION.md) |

This guide documents live features released through **8 November 2026**. Screenshots are explanatory test fixtures, not clinic recommendations or price quotations. Reading this repository does not require a technical setup; use the live website links above. Installation instructions are available separately for the website operator.

# Website update history

**Reviewed through 31 October 2026.** This history records changes to DentaBook's pages, features, account access, and website behavior. Dates use Philippine time (UTC+8). Earlier dates identify recorded feature changes; they do not establish the exact production launch date of each feature.

## 31 October 2026 — Public website access fixed

- Fixed the repeated redirects that prevented some visitors from opening the website.
- The patient homepage and clinic sign-in now open successfully.
- Opening the administrator website takes the user to administrator sign-in without a redirect loop.

**Status:** confirmed on the live website.

## 30 October 2026 — Patient accounts

- Added patient registration, sign-in, sign-out, and account information pages.
- Protected booking and personal pages so visitors must sign in with a patient account.
- Added an appointment list that reads only records linked to the signed-in patient, with an empty state when there are no records.
- Returned patients to their intended personal page after sign-in, while rejecting unsafe return addresses.

The appointment list remains read-only. Creating, cancelling, and rescheduling appointments are not yet available.

## 30 October 2026 — Separate access and stronger account protection

- Separated patient, clinic, and administrator sign-in and workspace access.
- Kept administrator tools on their own website, without an administrator sign-in link in public navigation.
- Prevented ordinary accounts from entering another account role's workspace or reading another patient's appointment list.
- Required a fresh sign-in after password or account-role changes and shortened administrator sessions.
- Kept patient and clinic access together on the main website while administration uses its own hostname.

These are changes to website access and account protection. The current [status and development plan](06_STATUS_AND_DEVELOPMENT_PLAN.md) describes what each workspace provides.

## 30 October 2026 — Phone usability and page presentation

- Improved form readability and touch targets on phones.
- Improved links and redirects so they keep the correct website address.
- Added page transitions and content-reveal effects that respect reduced-motion preferences and keep content accessible without animations.

## 29 October 2026 — Public pages and clinic discovery

- Added the branded homepage, about page, treatment information, and phone-first navigation.
- Added a searchable approved-clinic directory and public clinic profiles.
- Displayed saved clinic details, active services, and active dentist information from the database.
- Added clear loading, empty, and unavailable states instead of invented listings.
- Added treatment-cost estimates using the selected clinic's published prices.

The calculator provides an estimate; it does not submit an appointment or collect payment.

## 29 October 2026 — Clinic registration and review

- Added clinic/staff registration and sign-in.
- Showed registration status and review notes to the clinic account.
- Added administrator approval and rejection of pending clinic registrations, with a reason required for rejection.
- Made approved clinics eligible for public listing and access to their own workspace.
- Added a read-only clinic workspace showing saved contact details and counts for dentists, published services, and pending appointments.

Clinic profile, service/price, dentist, and schedule editing are still planned.

## Development preview — awaiting production release

The development website now supports an operator-created owner account that can sign in separately to the patient, clinic, and administrator portals. In the clinic portal, the owner can select an existing clinic to read its workspace. Patient access still reads only that account's own appointment records, and ordinary accounts retain their usual restrictions.

**Status: development preview only.** This capability has not been deployed to production and is implemented in the supplied source for development use. No preview credentials are part of this history. Review and release are required before presenting it as a live feature.

## Next planned website update

Clinic content management is the next planned increment: authorized clinics maintaining their own profile, service prices, and dentist information. Scheduling, appointment creation/review, payments, appointment changes, notifications, feedback, and account recovery remain later planned phases.

See the [current status and development plan](06_STATUS_AND_DEVELOPMENT_PLAN.md) for scope and completion criteria. Future entries should describe what changed on the website, who can use it, and whether it is live, in development preview, or planned. Requirements drafting, documentation edits, repository setup, and other project administration are not website-update entries.

# Project guide

## Purpose

DentaBook brings clinic information, treatment information, and account access into one website. A visitor can compare available clinic information and understand published treatment prices before contacting a clinic.

The supplied source includes clinic setup and patient requests with clinic review in the development preview. Direct GCash deposits, staff verification, authenticated receipts, and unpaid Pay at clinic confirmation are also available in the preview. Appointment changes, reminders, completion, and feedback remain future work. The development plan distinguishes the preview from the unchanged production release.

## Who uses the website

| Person | What the current release allows |
| --- | --- |
| Visitor | Browse clinics and treatments, view public profiles, search, and estimate costs without an account |
| Patient | Register/sign in, view account details, and use preview booking and own appointment status tracking |
| Clinic representative | Register/check review status and, in the preview, manage approved clinic content, assignments/hours, and requests |
| Platform administrator | Review clinic submissions and approve or reject pending registrations |

Each account is assigned a role. Registering as a patient cannot create a clinic or administrator account. Clinics appear publicly only after administrator approval. A clinic representative cannot enter the administrator workspace.

## What a visitor sees

The homepage introduces the service and provides access to clinic discovery, treatment information, the calculator, and patient account pages. Clinic listings come from approved records saved in the database. The site shows a clear empty message when no clinics have been published, and a separate error message if information cannot be loaded.

The calculator uses a selected clinic's saved service prices. It does not make a reservation, accept money, or guarantee a final treatment bill. The clinic confirms the treatment and final cost directly with the patient.

## Current delivery boundaries

The development preview and supplied source include editable approved-clinic profiles, service prices/durations, dentist profiles, treatment assignments, and weekly working hours. Only the owning approved clinic can use those tools; published records update discovery and cost estimates. Production remains on its existing release until separately deployed.

The development preview and supplied source now include real available times, signed-in patient appointment requests, and clinic acceptance/decline. Patients can refresh their account-scoped appointments to see the saved decision. Clinic setup and these booking tools have not been deployed to production. The preview also includes direct-to-clinic GCash deposits and staff verification, plus unpaid Pay at clinic confirmation. Gateways, automatic refunds, appointment changes, reminders, and reviews remain planned.

## Design approach

The interface uses DentaBook's supplied logo and a blue-and-white theme. Layouts begin with narrow phone screens, with additional arrangements for tablets and desktop computers. Forms stack vertically on phones. Form text is at least 16px, and buttons and navigation actions are designed for touch.

Operational information is presented as loading, empty, error, or unavailable states as appropriate. The application does not invent clinics, ratings, prices, or successful appointment confirmations.

## What this handoff contains

The source code, database initialization and migrations, configuration templates, automated tests, asset notices, and documentation are included. Live data, passwords, account recovery secrets, certificates, and private hosting credentials are transferred separately through the operator's agreed access process.

Use the [user guide](02_USER_GUIDE.md) for step-by-step tasks and the [development plan](06_STATUS_AND_DEVELOPMENT_PLAN.md) to review the remaining scope.

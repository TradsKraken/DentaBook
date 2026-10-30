# Project guide

## Purpose

DentaBook brings clinic information, treatment information, and account access into one website. A visitor can compare available clinic information and understand published treatment prices before contacting a clinic.

The longer-term product includes appointment requests, clinic review of those requests, deposits, appointment tracking, and completed-visit feedback. Those later steps are listed separately in the development plan because they are not available in the current release.

## Who uses the website

| Person | What the current release allows |
| --- | --- |
| Visitor | Browse clinics and treatments, view public profiles, search, and estimate costs without an account |
| Patient | Register, sign in, view account details, and view appointments already linked to that account |
| Clinic representative | Register a clinic, check review status, read review notes, and access the approved-clinic workspace |
| Platform administrator | Review clinic submissions and approve or reject pending registrations |

Each account is assigned a role. Registering as a patient cannot create a clinic or administrator account. Clinics appear publicly only after administrator approval. A clinic representative cannot enter the administrator workspace.

## What a visitor sees

The homepage introduces the service and provides access to clinic discovery, treatment information, the calculator, and patient account pages. Clinic listings come from approved records saved in the database. The site shows a clear empty message when no clinics have been published, and a separate error message if information cannot be loaded.

The calculator uses a selected clinic's saved service prices. It does not make a reservation, accept money, or guarantee a final treatment bill. The clinic confirms the treatment and final cost directly with the patient.

## Current delivery boundaries

This release supports discovery and account administration. A new clinic can register and be approved, but editing clinic descriptions, dentist records, prices, and schedules through the clinic dashboard is a later increment. Until that increment is delivered, an authorized operator must arrange data updates through a controlled maintenance process.

Patient appointment pages can display existing account-linked records. The website does not yet create new appointment requests or available time slots. A signed-in patient sees a clear notice where online booking is unavailable.

## Design approach

The interface uses DentaBook's supplied logo and a blue-and-white theme. Layouts begin with narrow phone screens, with additional arrangements for tablets and desktop computers. Forms stack vertically on phones. Form text is at least 16px, and buttons and navigation actions are designed for touch.

Operational information is presented as loading, empty, error, or unavailable states as appropriate. The application does not invent clinics, ratings, prices, or successful appointment confirmations.

## What this handoff contains

The source code, database initialization and migrations, configuration templates, automated tests, asset notices, and documentation are included. Live data, passwords, account recovery secrets, certificates, and private hosting credentials are transferred separately through the operator's agreed access process.

Use the [user guide](02_USER_GUIDE.md) for step-by-step tasks and the [development plan](06_STATUS_AND_DEVELOPMENT_PLAN.md) to review the remaining scope.

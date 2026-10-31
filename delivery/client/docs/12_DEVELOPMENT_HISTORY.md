# Development history

**Reviewed through 31 October 2026.** This history follows the earliest recorded project work through the current client delivery. It explains how the website developed and what each stage contributed.

Dates use **Philippine time (Asia/Manila, UTC+8)** and refer to recorded development changes. They do not establish when a feature first became available on the live website. Related changes are grouped into milestones. Work completed before the first recorded entry cannot be dated from the available records.

## 29 October 2026 — Requirements and website foundation

### 1. Project purpose and requirements

The first recorded work defined DentaBook's purpose: help patients discover dental clinics, understand treatments, and estimate costs. The initial requirements outlined the intended patient, clinic, and administrator responsibilities.

**Result:** a written starting brief. Features described in the brief were requirements, not completed website functions.

### 2. Workflows, feature scope, and architecture planning

Project documentation expanded the proposed user journeys, feature scope, and development roadmap. Architecture documents described the intended relationship between the browser interface, application server, and database.

**Result:** a plan for building the system in stages. Future booking, payment, and other proposed workflows remained design work at this point. The current [technical overview](03_TECHNICAL_OVERVIEW.md) describes the technology actually delivered.

### 3. Application and database setup

The project gained its initial React interface, Node.js/Express server, PostgreSQL database initialization, and Docker configuration.

**Result:** the initial development environment and application structure. This setup was a technical foundation; it did not establish a complete appointment workflow or a production launch.

### 4. Public website, clinic discovery, and cost estimates

The public interface expanded to include the homepage, clinic directory and profiles, treatment information, about page, and treatment-cost calculator. DentaBook branding, phone-first page layouts, local fonts and assets, and shared navigation were added. Clinic information was connected to server/database reads, with loading, empty, and error states. Backend and browser checks were introduced alongside this work.

**Result:** visitors could browse the public website and use available clinic information. Cost estimates used published clinic prices and did not create appointments or collect payments.

### 5. Clinic registration and administrator review

Clinic/staff registration, sign-in, registration status, and guarded workspaces were introduced. Registration saved an account and an unpublished clinic for review. Administrator functions supported approval or rejection with recorded review details. Account validation, password hashing, database-backed sessions, migrations, and account/access tests accompanied the work.

**Result:** clinic onboarding and review were implemented. The approved-clinic workspace provided saved information; clinic profile, service, price, and dentist editing were still future work.

## 30 October 2026 — Patient access, security, and production preparation

### 6. Patient accounts and protected personal pages

Patient registration, sign-in/out, account pages, and patient-only access checks were added. Appointment reads were restricted to records belonging to the signed-in patient. Sign-in navigation could return a patient to an appropriate protected page. Local startup instructions and scripts were also expanded.

**Result:** patients could create accounts and read their own existing appointment records. This did not introduce online appointment creation, cancellation, or rescheduling.

### 7. Portal separation and session protection

Patient, clinic, and administrator routes were separated more clearly. Server checks enforced the required account role. Sessions were tied to the account's role, revoked after password or role changes, and given defined expiry periods, including a shorter administrator session. Session creation was strengthened against concurrent credential changes. Production cookie settings, browser security headers, and container/database isolation were also improved, with corresponding access and security checks.

**Result:** stronger access boundaries and session handling. The later production configuration added separate public and administrator hosting processes; unfinished account-recovery and verification features remained planned.

### 8. Local environment configuration

Environment configuration and local HTTP testing support were made explicit while retaining the production HTTPS defaults.

**Result:** developers could run the application locally with the correct website origin and environment settings, then prepare production configuration separately.

### 9. Page motion and usability refinement

Progressive page-reveal and transition effects were added, including asynchronously loaded content. The effects respected reduced-motion preferences and kept content usable when animation support was unavailable.

**Result:** smoother page presentation while retaining access to the content and controls.

### 10. Production deployment and separate administration

Production Docker configuration separated the public/patient-and-clinic website from the administrator website and API process. Portal restrictions, allowed-origin handling, cookie separation, and navigation between the configured website addresses were strengthened. Phone-readable form controls and navigation targets were also refined. The deployment setup kept development and production environments separate.

**Result:** a production configuration with patients and clinics sharing the main website and administration using its own hostname and port. This was deployment and access-control work; it did not complete scheduling, booking, or payment features.

## 31 October 2026 — Client handoff, documentation, and hosting correction

### 11. Initial client delivery

A separate client repository was prepared with application source, configuration templates, user guidance, technical and operations documentation, testing instructions, and a remaining-development plan. A printable handbook and source-integrity checks supported the handoff.

**Result:** the client received a documented release snapshot and instructions for continuing and operating the project.

### 12. Workflow diagrams and visible development status

Twelve diagrams were added to explain user journeys, architecture, sessions, database relationships, estimates, release operations, and the future roadmap. The README was expanded with delivered/read-only capabilities, recent changes, current limitations, and the next planned increment. Diagrams and the handbook were checked on phone and desktop sizes and for print layout.

**Result:** clients could understand the current website, its structure, and the remaining work without reading application code. Planned booking diagrams were explicitly labeled as future workflows.

### 13. Public redirect-loop resolution

The production proxy settings were corrected after a public redirect loop. The operator confirmed **Force SSL off** and **HTTP/2 Support on** in Nginx Proxy Manager for this deployment. Instructions were updated to match. Public-path checks recorded successful patient and clinic page responses, with one expected sign-in redirect from the administrator root.

**Result:** the public redirect issue was resolved. This was a hosting configuration correction; application features were unchanged. The settings describe the current proxy arrangement and should be reviewed if that arrangement changes.

### 14. Historical update record

The earlier recorded work was organized into this dated timeline and a shorter README overview. Delivery notes were extended to cover the website's foundation and subsequent development, rather than beginning only at the client handoff. The historical record was included in the HTML/PDF handbook.

**Result:** the client can follow the project from its first recorded requirements through the current release and see how earlier changes relate to today's status.

## Current position and next work

The delivered foundation covers public clinic discovery, published-price estimates, patient accounts, clinic onboarding, administrator review, and protected access. Patient appointment lists and the approved-clinic workspace have the read-only limits described in the [current status](06_STATUS_AND_DEVELOPMENT_PLAN.md).

**The next planned increment is clinic content management:** authorized clinics maintaining their own profile, services/prices, and dentist information. Scheduling, appointment creation and review, payments, appointment changes, notifications, feedback, and account/operational improvements remain later planned phases. Their presence in early requirements or diagrams does not mean they are implemented.

Use the [status and development plan](06_STATUS_AND_DEVELOPMENT_PLAN.md) for present capabilities and acceptance criteria, the [delivery notes](../CHANGELOG.md) for release summaries, and the [verification record](VERIFICATION.md) for the checks recorded for the current delivery. Future releases should extend this history when reviewed work is delivered.

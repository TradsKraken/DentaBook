# Delivery notes

## Historical development updates — 31 October 2026

Added a client-facing [development history](docs/12_DEVELOPMENT_HISTORY.md) from the first recorded requirements on 29 October 2026, with a concise README timeline. Earlier milestones below distinguish planning, implemented website changes, and deployment preparation. Dates are normalized to Philippine time (UTC+8); they record development changes, not individual production launch dates. The refreshed handbook includes the timeline. This release updates documentation only.

## Public redirect-loop resolution — 31 October 2026

Recorded the confirmed Nginx Proxy Manager settings for this deployment: Force SSL off and HTTP/2 Support on. Replaced the earlier Force SSL instruction in the setup guide and added public-versus-LAN redirect checks to operations/testing guidance. Public patient and clinic pages return HTTP 200 without redirects; the administrator root follows one expected sign-in redirect to HTTP 200. This resolves a hosting configuration issue without changing application features.

## Client development-status summary — 31 October 2026

Expanded the README with the delivered website status, read-only capabilities, website improvements included in the handoff, recent documentation updates, current limitations, the next planned clinic-management increment, and later development phases. Added links to verification, diagrams, and the handbook. This is a documentation update; application behavior is unchanged.

## Workflow and system diagrams — 31 October 2026

Added 12 diagrams covering the system architecture, patient/clinic/admin journeys, session checks, account/clinic data, appointment data foundations, planned booking, cost estimates, release operations, and the remaining roadmap. Each diagram includes a vector SVG and editable Mermaid source. Current behavior and planned features are labeled separately. The diagram guide and printable handbook now include these visuals.

## Initial client handoff — 31 October 2026

This snapshot includes:

- Public clinic discovery and profiles backed by approved database records.
- Treatment information and clinic-price cost estimation.
- Patient accounts and protected personal pages.
- Clinic registration, registration status, and approved-clinic workspace access.
- Administrator clinic review through a separate administration host.
- Database migrations, account-role checks, secure sessions, and origin checks.
- Docker deployment configuration and automated backend/browser checks.
- User, technical, operations, and remaining-development documentation.

The [status and development plan](docs/06_STATUS_AND_DEVELOPMENT_PLAN.md) is the reference for unfinished product features. This handoff does not represent completion of the full appointment and payment workflow.

## Earlier development — 30 October 2026

The following changes predate the separate client delivery repository:

- **Patient accounts:** registration, sign-in/out, protected personal pages, safe return navigation, and account-scoped reading of existing appointment records. Appointment submission and changes remained unavailable.
- **Portal and session protection:** clearer role-specific routing, server-side access checks, role-bound sessions, expiry policies, credential/role-change revocation, concurrent credential-change protection, production cookie settings, security headers, and container/database isolation.
- **Local configuration:** explicit environment and website-origin configuration, with local HTTP testing support and production HTTPS defaults retained.
- **Presentation:** progressive page motion and transitions respecting reduced-motion preferences and retaining usable content without animation support.
- **Production preparation:** separate development/production setup, separate public/clinic and administrator hosting/API processes, portal/origin restrictions, and phone control/navigation refinements.

These are recorded development milestones. They are not claims that every change was deployed publicly on the same date.

## Earlier development — 29 October 2026

- **Requirements and planning:** the first recorded project brief, intended patient/clinic/administrator workflows, feature specifications, roadmap, and proposed architecture. Proposed workflows were not yet working features.
- **Application foundation:** React interface, Node.js/Express server, PostgreSQL initialization, and Docker development configuration.
- **Public website:** branded phone-first homepage, about and treatment pages, clinic directory and profiles, database-backed clinic reads, loading/empty/error handling, and published-price cost estimates; backend and browser checks introduced alongside the implementation.
- **Clinic onboarding and review:** clinic/staff registration and sign-in, saved pending-clinic submissions, registration/review status, guarded workspaces, and administrator approval or rejection with recorded details. Password hashing, database-backed sessions, validation, migrations, and account tests accompanied the work.

The workspace and appointment foundations did not include clinic content editing, online booking creation, or payments. See the [full history](docs/12_DEVELOPMENT_HISTORY.md) for the sequence and the [current development plan](docs/06_STATUS_AND_DEVELOPMENT_PLAN.md) for unfinished scope.

# Delivery notes

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

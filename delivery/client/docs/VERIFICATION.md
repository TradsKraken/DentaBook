# Delivery verification

Latest application verification: **3 November 2026**. Clinic setup and booking/request review are development-preview features; production was not updated. Earlier delivery checks below remain historical records.

## Clinic setup and appointment requests — 3 November 2026

| Check | Result |
| --- | --- |
| Source export | 89 tracked source/configuration files checked against the source snapshot; local Markdown links resolved and private paths excluded |
| Default backend suite | 61 passed; two native concurrency cases are intentionally skipped by the isolated PGlite run |
| Real PostgreSQL booking suite | 12 passed, including concurrent overlapping submissions and identical retry races |
| Browser regression suite | 24 passed; five environment-specific checks intentionally skipped in that run (the real booking and development-preview checks are run separately) |
| Real-API browser workflow | Staff treatment assignments and working hours, patient requests, clinic acceptance and decline, patient-visible notes/status, and reload persistence verified in isolated PostgreSQL |
| Required layouts | Booking, clinic inbox, and patient appointments checked at 390px first, then 320px, 768px, and 1440px |
| Development-preview smoke test | Real patient/clinic/administrator sign-ins and new booking role/route checks passed at all four widths without creating customer records |
| Handbook | Phone/desktop overflow, loaded images, 44px contents navigation, A4 print width, and refreshed PDF generation passed |
| Failure states | Booking option/slot load retry, preserved contact input, stale-slot rejection, and clinics without bookable assignments checked |
| Ownership/portal checks | Ordinary clinic ownership, owner-selected clinic query parameters, patient record scope, current approval, origin verification, and separate administrator routes checked |

Requests retain server identity, price, duration, and new treatment-name snapshots. Clinic decisions record reviewer, timestamp, and patient-visible notes. Pending/accepted reservations block overlapping slots; declining releases time. Identical retries return the saved appointment. Tests do not claim payment processing, final confirmation, cancellations/rescheduling, notifications, or production deployment.

All created clinic, patient, schedule, and appointment test records were confined to disposable test databases. No records were inserted into production or the development-preview database for test display. The development stack was rebuilt separately. Source delivery excludes private runtime configuration, backups, test reports, and internal development history.

## Earlier foundation verification — 31 October 2026

| Check | Result |
| --- | --- |
| Exported application source | 68 source/configuration files matched the supplied source snapshot |
| Backend integration suite | 33 passed, using isolated test databases |
| Production browser checks | 2 passed through the actual public and administrator HTTPS domains |
| Browser widths | 390px first, followed by 320px, 768px, and 1440px |
| Local and production Compose templates | Both configuration checks passed |
| Documentation links | All local Markdown links resolved |
| Handbook layout | Checked at the same four widths; no page overflow and 44px navigation targets |
| Source archive review | Private runtime configuration, backups, unrelated internal records, and development Git history excluded |

The browser checks read deployed information without creating production accounts or clinic records. Real-account sign-in was not repeated for this documentation delivery. Online appointment submission, payment processing, and other unfinished workflows are outside the implemented release. These checks are not an independent security assessment.

## Workflow diagram update — 31 October 2026

The documentation now includes 12 editable Mermaid sources and 12 corresponding SVG diagrams. The HTML/PDF handbook embeds the diagrams, with current behavior and planned workflows labeled separately. Diagram checks cover image loading, phone-contained scrolling, 44px contents navigation, A4 print bounds and text sizing, and database relationship-label contrast. Screens were checked at 390px first, then 320px, 768px, and 1440px. Application source and runtime configuration remain unchanged from the previously tested delivery; this update changes documentation and diagrams only.

## README development-status update — 31 October 2026

The README now presents delivered and read-only capabilities, recent website/delivery updates, current limitations, and the next planned clinic-management increment. The later roadmap remains explicitly planned. Local documentation links and README section links were checked, and the handbook phone/desktop and print checks passed after refreshing the release notes. Application source is unchanged, so the previously recorded backend and production journey results continue to describe the delivered application.

## Public redirect regression check — 31 October 2026

The operator confirmed that NPM Force SSL must be off and HTTP/2 Support on for the current deployment. After that change, checks pinned to the public Cloudflare address returned HTTP 200 with zero redirects for the patient homepage and clinic sign-in. The administrator root returned HTTP 200 after one expected redirect to `/admin/sign-in`. These checks exercise the public route separately from LAN DNS. Application source, production cookies, and role checks are unchanged; origin-hop encryption was not determined by these redirect checks.

## Historical update documentation — 31 October 2026

The historical timeline was checked against the recorded development changes, including the underlying feature/security changes rather than commit titles alone. Dates use Asia/Manila (UTC+8), with related changes grouped into client-readable milestones. Earlier requirements and proposed workflows are labeled as planning. Local documentation and README section links were checked, and the refreshed HTML/PDF handbook passed phone-first checks at 390px, 320px, 768px, and 1440px plus print checks. Exported application source remains identical to the previously tested delivery; no application test results or production deployment claims are added by this documentation update.

## Website history review — 31 October 2026

Website update entries now describe user-visible features, access changes, usability improvements, and fixes. Requirements drafting, documentation changes, repository setup, and handoff tasks were removed from the website timeline. Dates retain the recorded feature-date limitation, and the newer owner access is explicitly marked as development-preview-only and outside this delivered source snapshot. Local links, README anchors, and the regenerated handbook layouts/print output were checked. Application files in this client release remain unchanged.

## Release version tooling checks — 31 October 2026

Fifteen isolated release-management tests passed, including five-version retention, sixth-save oldest deletion, backup/build/deployment failures, integrity checks, locking, unrelated-image protection, and database-preserving rollback behavior. The first production restore point was saved and checked: PostgreSQL archive inspection passed, the Docker image archive loaded successfully, and the restore Compose configuration validated. Production container IDs, image IDs, and start times remained unchanged. A live production deployment or rollback was not performed for this tooling update. The client application source remains unchanged.

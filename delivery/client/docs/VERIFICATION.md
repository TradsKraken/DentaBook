# Delivery verification

Latest application verification: **8 November 2026**. Clinic concerns, in-app notifications, restricted dentist access, intake during booking, visit completion and private patient feedback are live. Earlier sections below describe historical releases.

## 8 November 2026 — Live concerns, notifications, dentist access and visit feedback

- Runtime application source: `618b34d`. Migrations 008, 009 and 010 are applied in production. Release used the version-saving manager and retained the current database; five verified restore points are retained. The pre-release restore point is `20261108T073434221646Z-58962be0`.
- Previous isolated validation passed 92 backend regression checks (six environment-specific checks skipped), all 13 real-PostgreSQL feature-suite checks, and the real notification/concern browser journey. Private access, competing claims, duplicate handling, intake rollback, completion/payment separation, feedback, persistent read states, pagination and spam controls were exercised without customer data.
- Existing browser regressions passed 34 applicable checks after fixing/rechecking the phone header. Eight environment-specific journeys were skipped. The real concern/notification journeys checked 390px first, then 320px, 768px and 1440px; phone screenshots were visually reviewed.
- Five post-deployment checks passed through the actual HTTPS public and administration origins: portal separation; protected concern/notification APIs and sign-in destinations; public/admin pages and controls at all four widths; legacy patient redirects; and first-party CSP/security headers with blocked inline script execution. Edge-injected third-party telemetry is outside the application-owned asset header check. No production account, clinic, concern, message, appointment or payment records were created.
- The release-manager safeguard suite passed all 20 checks. These checks do not claim email/SMS/push delivery, public review moderation, MFA, an independent security audit, or off-host disaster recovery.

## Intake, staff, profiles, and easier hours — 5 November 2026 (live)

- Final backend regression: 88 passed; six native-only checks skipped in the PGlite run. The isolated real-PostgreSQL feature suite passed all nine checks, including competing schedule batches, consent/question snapshots, private patient/clinic boundaries, invitation expiry/reuse, scoped permissions, role changes/revocation, and password-session invalidation.
- The real PostgreSQL/browser journey passed clinic questions, patient consent/submission, clinic information requests, saved patient replies, profile/password editing, staff invitation acceptance, manager/appointment-staff access, role changes, revocation, and batch/edited working hours. The final focused browser run passed seven checks, including the hidden-dentist filter case and failed-save input retention. All test records were confined to disposable databases.
- The existing real booking, GCash/private-receipt, unpaid Pay at clinic, cancellation, and reviewed rescheduling regression passed. The HTTP development payment request-key compatibility issue was corrected. Broader browser regression passed 34 applicable checks; four environment-specific checks were skipped. The Nginx-only header/CSP case was run separately against the real preview and passed with the development portal checks.
- Forms/actions were checked at 390px first, then 320px, 768px, and 1440px for page/dialog containment, 16px control text, and 44px touch targets. Screenshots were inspected; final settings spacing and invitation fieldsets were reviewed.
- The tested application commit `d87cb9a` was released using the required release manager. The previous live images/configuration and database backup were saved as verified restore point `20261105T003533848314Z-103fc223`. The existing production database container/data were retained, and migration `007_intake_and_staff.sql` was applied. Four restore points are currently retained under the five-version policy.
- Ten checks passed through the deployed HTTPS origins: four real public/admin portal/security journeys and six clinic interface journeys using test-only intercepted APIs. Both live APIs report connected databases; protected redirects, portal isolation, CSP/security headers, readable controls, touch targets, and phone/tablet/desktop layouts passed. No production clinic, account, appointment, intake, or staff records were created by verification.
- Email/SMS delivery, verified account-email changes, self-service recovery, dentist-specific sign-in/MFA, off-host disaster recovery, and recurring restore drills remain outside this release. Client guides/HTML/PDF describe the current live behavior and preserve the earlier client source-release history.

## Cancellation, rescheduling, and baseline release — 3 November 2026

- Full backend regression: 84 passed; one separate native-payment-choice case skipped. The suite used real PostgreSQL for booking and appointment changes, covering competing reservations/approvals, identical retries, cancellation/payment races, Philippine-time deadlines, policy snapshots, role/ownership boundaries, and preserved paid receipts. The focused PGlite appointment-change suite also passed all eight original applicable behavior groups; its two native-only concurrency groups were skipped.
- Browser regression: all 34 applicable journeys passed across the full run and the corrected legacy inbox fixture rerun; four deployment-specific checks were skipped in the local harness. These include the real PostgreSQL/browser journey for clinic setup, editable contact email, GCash verification and private receipts, unpaid Pay at clinic, explicit clinic change policy, approved rescheduling, patient cancellation, and staff cancellation. Test data exists only in a disposable database.
- Phone-first layout/control checks passed at 390px, 320px, 768px, and 1440px, including policy setup, patient replacement selection, clinic approval, cancellation confirmation, and history. Phone screenshots were reviewed. Issued patient/clinic receipts remain printable.
- The existing preview was released with the required version-saving manager. Four real HTTPS portal/security checks passed at all required widths without creating production records. The previous running website was saved as verified restore point `20261103T125319228146Z-2a39d811`.
- Release safeguard suite: 20 passed, including exact manifest recovery, refusal to substitute newer images, temporary image pin cleanup, failed builds/backups, retention, and data-preserving rollback.
- The final optimized frontend build and whitespace checks passed. Clinic defaults keep patient changes and payment methods disabled until explicitly configured. Cancellation never claims a refund; reschedule approval never claims an unpaid visit was paid.
- The development rebuild passed four additional checks: three appointment-change UI journeys against the built preview with test-only APIs, and the real development owner sign-in/workspace/logout journey at all four widths. No clinic policies or customer records were changed. The new release passed seven checks against the deployed HTTPS website: four real portal/security journeys and three appointment-change interface journeys using test-only APIs. Production migration `006_appointment_changes.sql`, disabled default actions, and absence of test change records were verified. Restore point `20261103T132446813168Z-5ce6c7a9` preserves the previous running booking/payment website, and all three retained restore points passed integrity checks. Off-host recovery and recurring restore drills remain future work.

## Simplified weekly hours — 4 November 2026

- Full backend suite: 70 passed; three existing native-only concurrency checks skipped in the PGlite run.
- Five clinic interface journeys passed, including the revised editor at 320, 390, 768 and 1440px, readable controls, touch targets and page containment.
- Weekly saves validate all time periods before replacing schedules in one transaction. Backend checks cover invalid days, overlapping periods, patient/foreign-clinic denial and unchanged saved hours after a rejected request.
- The production client build passed. Existing booking, task navigation, treatment assignments and payment source were retained from the prior client release.
- The real PostgreSQL browser journey passed with weekly setup and lunch breaks, patient booking, clinic acceptance/decline and saved patient outcomes. No production records were created.
- The updated HTML handbook passed layout checks at 320/390/768/1440px and its PDF was refreshed.
- Production deployment is a separate step and is not claimed by these source verification results.

## GCash and Pay at clinic — 3 November 2026

- Full backend suite: 69 passed; three native concurrency checks intentionally skipped in PGlite. The final focused payment suite passed seven applicable checks, with its native concurrency case skipped.
- Native PostgreSQL payment suite: eight passed, including simultaneous payment choices returning one saved record.
- Browser regression: 28 passed, five environment-specific skips. Two additional payment safety journeys passed, covering private sign-in return, load-error recovery, disabled methods, and forged success query parameters.
- Real PostgreSQL browser journey: clinic account/policy setup, accepted patient GCash choice, saved instructions, reference submission, exact amount/reference verification, patient and clinic receipts, and unpaid Pay at clinic confirmation passed. All API calls use the real isolated backend/database.
- Layout checks: phone-first at 390px, then 320/768/1440px, including payment settings, GCash instructions, verified receipts, touch targets, control text size, and page overflow. Screenshots were reviewed. Patient and clinic deposit receipts each print to one A4 page for the tested record.
- Real development preview: patient, clinic, and administrator sign-ins, payment settings and own-clinic ledger reads, role restrictions, and separate administrator access passed at all four widths. No customer records were created or payment settings changed by this smoke test.
- Final frontend production build and source whitespace checks passed. Production container IDs, images, and start times matched before/after the development rebuild.

Tests verify server-computed centavo amounts, stale-term rejection, saved recipient/policy snapshots, retries, reused references, patient/clinic receipt ownership, origin/CSRF boundaries, explicit configuration, rejected claims, and unavailable visits. A reference alone never marks payment paid; no gateway or real GCash transfer is simulated in the running application. Test claims and recipients exist only in disposable test databases. The temporary PostgreSQL database and network were removed after testing.

Earlier verification records below describe their own increment and do not limit the payment features tested above.

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

## Automatic booking email — 3 November 2026

The focused booking API suite passed 11 checks; its two native concurrency checks are unchanged and intentionally skipped in this focused PGlite run. Five browser checks passed, covering registered-email auto-fill/read-only behavior at 390/320/768/1440px, missing emails, booking load/slot errors, and clinic selection. New requests use the email read from the database even if a different or missing email is sent in the body. Accounts without an email are rejected for new requests. Older saved request hashes/emails continue to support safe identical retries.

The real-API patient-to-clinic journey passed separately against disposable PostgreSQL, including the automatically filled email and the same registered email shown in the clinic inbox. The development preview is rebuilt for this change; production is unchanged.

## Clinic workspace redesign — 3 November 2026

The clinic interface now uses a desktop sidebar/phone menu, a task-focused overview, searchable and publication-filtered service/dentist lists, focused add/edit panels, weekday-grouped working hours, and an appointment-details/review panel. The overview’s booking checklist reads saved publication, assignment, and usable-hours information.

Twenty-eight applicable browser journeys passed across the regression run and a focused public-layout rerun using the normal timeout. Five environment-specific checks were skipped in that regression run; the full real-API booking workflow and development-preview portal checks run separately. The real PostgreSQL browser journey passed with the redesigned staff controls, including assignments, working hours, acceptance/decline, and patient-visible outcomes. API authorization, persistence, patient email, and booking rules are unchanged.

Screenshots were inspected at 390px first and at desktop width. Layout, readable form controls, and 44px action targets were checked at 390px, 320px, 768px, and 1440px. Checks also cover catalog search/status filters, booking setup guidance, section history/refresh, failed-save input retention, Escape cancellation, and request-details panels. Modal editors constrain wide content and keep the background page inert.

Only isolated test databases contain the verification clinic/patient/request records. The development preview is rebuilt separately; production is unchanged. This snapshot adds two source/helper files to the prior delivery, for 91 exported source/configuration files.

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

## Illustrated README review — 8 November 2026

The repository introduction now leads into patient, clinic and administrator walkthroughs. Seventeen screenshots show the actual deployed interface using clearly labelled documentation-only records. Every API request during capture was intercepted; no customer records were read and no website mutations were submitted. Credential fields remain blank. Example names, prices, addresses and messages are not live listings or quotations.

All 18 README images (17 screenshots plus the supplied logo), local links and role-section anchors were checked. The rendered README preview loaded every image without page overflow at 390px, 320px, 768px and 1440px. Screenshot framing and the phone introduction were visually inspected. Detailed feature/release information remains available in `FEATURE_STATUS.md`. This documentation update does not change the live application or add a website release-history entry.

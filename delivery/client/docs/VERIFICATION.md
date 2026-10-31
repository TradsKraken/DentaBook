# Delivery verification

Reviewed on 31 October 2026.

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

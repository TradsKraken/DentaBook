# Documentation library

The documents are arranged so business readers can begin without technical knowledge, while operators and future developers can find the detailed instructions they need.

| Reader | Recommended order |
| --- | --- |
| Project owner or client representative | [Project guide](01_PROJECT_GUIDE.md), [user guide](02_USER_GUIDE.md), [status and plan](06_STATUS_AND_DEVELOPMENT_PLAN.md), [handover checklist](10_HANDOVER_CHECKLIST.md) |
| Website administrator | [User guide](02_USER_GUIDE.md), [operations manual](05_OPERATIONS_MANUAL.md), [data and security](09_DATA_AND_SECURITY.md) |
| Hosting operator | [Technical overview](03_TECHNICAL_OVERVIEW.md), [deployment](04_SETUP_AND_DEPLOYMENT.md), [operations](05_OPERATIONS_MANUAL.md), [testing](07_TESTING_AND_ACCEPTANCE.md) |
| Developer continuing the work | [Technical overview](03_TECHNICAL_OVERVIEW.md), [status and plan](06_STATUS_AND_DEVELOPMENT_PLAN.md), [API reference](08_API_REFERENCE.md), [data and security](09_DATA_AND_SECURITY.md) |

The [diagram guide](11_DIAGRAMS_AND_WORKFLOWS.md) explains patient, clinic, and administrator journeys, system architecture, sessions, database relationships, cost estimates, releases, and the remaining roadmap. Each diagram has a full-size SVG and an editable Mermaid source.

The [development history](12_DEVELOPMENT_HISTORY.md) follows the recorded work from the initial requirements through the current handoff. It explains each milestone in plain language and distinguishes completed features from planning. For the latest release summaries, see the [delivery notes](../CHANGELOG.md).

## Terms used in these documents

| Term | Plain-language meaning |
| --- | --- |
| Frontend | The pages and controls a person sees in a web browser |
| Backend or API | The server that validates requests, checks permissions, and works with saved information |
| Database | The structured storage for accounts, clinics, services, and other records |
| Portal | The area intended for a particular type of account |
| Session | The server-validated sign-in state of a browser |
| Migration | A versioned change to the database structure |
| Deployment | Installing a tested release on the live server |
| DNS | The service that directs a website name to its hosting address |
| HTTPS | An encrypted connection between a browser and the website's entry server |
| Backup | A separate recoverable copy of saved data |

Documents describe the delivered snapshot. Update the status, release notes, and affected instructions whenever a later release changes the behavior.

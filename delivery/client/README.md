# DentaBook

**Book your smile, know your cost.**

DentaBook helps people find approved dental clinics, explore treatments, and estimate costs using a clinic's published prices. It also provides patient accounts, clinic registration, and an administrator review process.

This delivery contains the application source and the information needed to understand, operate, and continue the project. The current release is the **clinic discovery and account foundation**. Online appointment submission and payments are future development phases.

Open the [printable client handbook](CLIENT_GUIDE.html) in a browser to read the complete guide in one document or print it. The individual documents below are also readable directly in this repository.

## Start here

| What you need | Where to read |
| --- | --- |
| A plain-language introduction | [Project guide](docs/01_PROJECT_GUIDE.md) |
| Instructions for patients, clinics, and administrators | [User guide](docs/02_USER_GUIDE.md) |
| What works now and what comes next | [Status and development plan](docs/06_STATUS_AND_DEVELOPMENT_PLAN.md) |
| How the website was built and which technologies it uses | [Technical overview](docs/03_TECHNICAL_OVERVIEW.md) |
| Installation and domain configuration | [Setup and deployment](docs/04_SETUP_AND_DEPLOYMENT.md) |
| Backups, updates, and troubleshooting | [Operations manual](docs/05_OPERATIONS_MANUAL.md) |
| Test procedures and review checklist | [Testing and acceptance](docs/07_TESTING_AND_ACCEPTANCE.md) |
| Technical interfaces and stored information | [API reference](docs/08_API_REFERENCE.md), [data and security](docs/09_DATA_AND_SECURITY.md) |
| Transfer of access and ongoing responsibility | [Handover checklist](docs/10_HANDOVER_CHECKLIST.md) |

## Website addresses

| Area | Address |
| --- | --- |
| Public and patient website | https://dentabook.forgroup.space |
| Patient registration | https://dentabook.forgroup.space/patient/register |
| Clinic sign-in | https://dentabook.forgroup.space/clinic/sign-in |
| Clinic registration | https://dentabook.forgroup.space/clinic/register |
| Administrator sign-in | https://dentabook-admin.forgroup.space/admin/sign-in |

Patients and clinics share the main website, with different account permissions. Administration uses a separate hostname, port, and API process. There is no public administrator registration or administrator link in the public navigation.

## Current capabilities

Available features include clinic discovery, saved clinic profiles, treatment information, published-price estimates, patient registration and sign-in, clinic registration and status tracking, and administrator approval or rejection. Account and clinic information is stored in PostgreSQL.

Appointments can be read when records are already linked to the signed-in patient. Creating an online booking, choosing live appointment slots, paying a deposit, and managing cancellations are not yet available. The interface explains unavailable features instead of creating temporary browser records.

## Source layout

```text
client/                         Website interface, branding, styles, and browser tests
server/                         API, account permissions, database schema, and tests
docs/                           Client and technical documentation
docker-compose.yml              Local development services
docker-compose.production.yml   Production public/admin separation
.env.example                    Local configuration template
.env.production.example         Production configuration template
CHANGELOG.md                    Delivery notes
```

The setup guide provides the complete startup procedure. Actual passwords, database backups, and server configuration values must be supplied privately by the operator.

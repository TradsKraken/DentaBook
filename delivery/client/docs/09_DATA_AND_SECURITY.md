# Data and security

The [diagram guide](11_DIAGRAMS_AND_WORKFLOWS.md) includes the current session-check sequence and simplified database relationships, with future management workflows labeled separately.

## Stored information

| Record group | Current use |
| --- | --- |
| Users | Name, email, phone where collected, password hash, and assigned role |
| Clinics | Ownership, clinic contact details, description, approval status, submitted reference, and review information |
| Dentists and services | Active public profile information and clinic service prices when records are provisioned |
| Sessions | Token hash, user, sign-in role, creation time, and expiry |
| Schema migrations | Database updates already applied |
| Appointments and appointment services | Existing patient-linked records can be read; website booking creation is not implemented |
| Schedules, assignments, payments, reviews | Schema foundations for later workflows; their complete management features are not available |

Database relationships link clinics to their owners, dentists/services to clinics, and appointments to patients and clinics. The API uses the session's account identity for private data rather than trusting a patient or clinic identifier supplied by the browser.

## Account protection

Passwords are hashed with bcrypt at cost 12. They are not stored as readable passwords. Sign-in issues a random 256-bit opaque session token; only its SHA-256 hash is stored in the database. The token is sent in a protected browser cookie and checked against a valid database session on private requests.

Sessions are bound to the account's role. Password-hash or role changes revoke existing sessions through a database trigger. Re-login rotates the presented browser session, logout revokes it, and expiration is enforced on the server. Administrator sessions last one hour; patient/clinic sessions last eight hours.

Production uses separate public and administrator host-only cookies with `Secure`, `HttpOnly`, and `SameSite=Strict`. The `__Host-` cookie prefix, a root path, and the absence of a Domain attribute limit cookie scope. Cookies are not isolated by port alone; separate hostnames and cookie names provide administrator session separation.

## Server and browser controls

The APIs validate inputs, enforce roles and clinic approval, parameterize data queries, check request origins, and reject unsupported portal endpoints. Nginx sends content-type, framing, referrer, permissions, and content-security headers. Private workspace and session responses are not cached.

API processes run as a non-root account with a read-only container filesystem, temporary storage, removed Linux capabilities, and no privilege escalation. PostgreSQL uses an internal Docker network. The production configuration publishes website ports 3003 and 3005, not direct API/database ports.

## Limits and continuing work

Public browser HTTPS has been verified. For this deployment, NPM Force SSL is off and HTTP/2 Support is on; forcing a redirect at NPM caused a public redirect loop. The Force SSL switch is a redirect setting, not proof of encryption on every connection. Cloudflare-to-NPM transport depends on its separate origin/TLS configuration and was not established by these redirect checks. The NPM-to-application LAN hop and application-to-database Docker hop are not encrypted by the current setup. Database-volume and backup encryption are not automatically configured.

MFA, self-service password recovery, email verification, durable shared request throttling, and a full security audit trail are future work. Current request limits are stored in each API process's memory and reset with that process. The project has automated access-control tests; it has not undergone an independent penetration assessment.

Operators with host or database access can access stored records. Control access to hosting, database backups, source repositories, and configuration separately. Agree data retention, account support, and recovery responsibilities with the project owner before collecting additional information in later features.

## Configuration and backups

Actual database passwords belong in a private `.env`, not in source control. Keep backup files private and outside release archives. Preserve included dependency and asset notices. Transfer access through the agreed private process and rotate credentials when access responsibility changes.

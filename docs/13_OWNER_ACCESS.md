# Owner access to all three portals

An operator can explicitly create an owner account that uses one username and password at the patient, clinic, and administrator sign-in pages. Ordinary accounts retain their existing permissions. Accounts are not created automatically at startup or by public registration.

## Requested development account

This account is intended for the development computer at **10.10.1.116**:

| Setting | Value |
| --- | --- |
| Username | `admin` |
| Password | `admin123` |
| Patient sign-in | `/patient/sign-in` |
| Clinic sign-in | `/clinic/sign-in` |
| Administrator sign-in | `/admin/sign-in` |

Use these paths on the development website's configured address and port. The native Windows setup uses `http://localhost:3000`. The development account cannot sign in to an API running in production mode.

## Install and create the account

Install the updated source on the development computer and start its existing database. Keep the database and private environment files. The API must use **NODE_ENV=development** and its development database.

For the native Windows setup, open a terminal in the project folder:

```powershell
cd server
npm.cmd run create-owner -- --development
```

This reads the existing `server/.env`, which the native setup configures for development. Restart the development API after installing the updated server source. Close its old development process before using the normal [local startup procedure](10_LOCAL_TESTING.md). Vite reloads the updated interface; a built preview needs rebuilding and restarting.

For a Docker development installation, use its own development `.env`, database, and correct development `CLIENT_URL`. From the project folder:

```sh
docker compose -f docker-compose.yml up -d --build
docker compose -f docker-compose.yml exec -T api npm run create-owner -- --development
```

Run the creation command once. It stores a bcrypt password hash and a development-only flag. It refuses a production environment and never overwrites an existing username or email. If `admin` already exists, review that identity rather than deleting or promoting it blindly. The earlier email-based administrator is not changed.

## Using each portal

1. Enter `admin` and the development password on the desired sign-in page.
2. In the clinic portal, select an existing clinic. Pending, approved, rejected, and suspended records are available to this owner. Selection does not change the clinic's owner, review status, or public visibility. An empty database shows an empty state.
3. In the patient portal, the account reads only appointments linked to its own account ID. It does not impersonate patients or expose another patient's appointment list.
4. In the administrator portal, use the implemented clinic-review functions.
5. Sign in on another portal to change the active role. Patients and clinics share one browser session on their common host; switching rotates it. The production administrator host has its own cookie. Owner sessions expire after one hour.

The clinic workspace is still read-only. Clinic editing, scheduling, appointment creation, and payments remain future increments.

## Production owner access

The deployment computer is **10.10.1.113**. Do not use the development-account command there. To deliberately provision a production owner after deploying this update:

```sh
docker compose exec api npm run create-owner
```

The interactive command asks for a username, full name, optional email, and a strong password of at least 12 characters and at most 72 UTF-8 bytes. Password entry is hidden and confirmed. Use a unique generated password and transfer it privately. No existing administrator is changed.

Development-only accounts are rejected during login and session validation in production. Copying a development database or cookie into production does not enable them.

## Access controls

Sessions retain the effective role selected at sign-in. Cross-role login requires a database account with the system administrator role and an explicit owner-access grant. Every workspace still enforces its required session role. The public API rejects administrator endpoints; the administrator API rejects patient/clinic endpoints. Public registration ignores requested usernames, owner flags, and privileged roles.

Only a clinic-role owner session can list/select clinics. Ordinary clinic staff still require ownership and approval and cannot select other clinics. Changing the owner grant, development-only flag, username, password, or account role revokes sessions. Credential and grant changes are rechecked during session issuance.

The regression suites cover migration, all three logins, role isolation, clinic selection, ordinary-account restrictions, production rejection of development credentials, grant revocation, and concurrent grant changes. Browser checks cover portal switching, selector empty/error states, and layouts at 390px, 320px, 768px, and 1440px. Test clinic records stay in isolated test databases or browser fixtures.

## Installation status

Source preparation and isolated tests do not create an account on a different computer or deploy production. Run the account-creation command against the intended development database after installing the updated source there.

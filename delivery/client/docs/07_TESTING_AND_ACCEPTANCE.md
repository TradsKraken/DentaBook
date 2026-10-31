# Testing and acceptance

## Automated backend checks

With Node.js 22 installed, from `server/`:

```bash
npm ci
node --test --test-concurrency=1 tests/*.test.js
```

These tests check database behavior, registration, approval, roles, record ownership, sessions, origin checks, cookie settings, and public/admin separation. Account integration tests use isolated PostgreSQL-compatible databases through PGlite. Test accounts belong to the test environment, not the live website.

## Frontend checks

From `client/`:

```bash
npm ci
npx playwright install chromium
npm run build
npm test
```

The standard browser suite starts its own local frontend and uses controlled API responses for interaction tests. Checks that require deployed hosts are skipped until their URLs are supplied. A skipped deployment check is not evidence that production was tested.

For the production public/admin journey checks:

```bash
PLAYWRIGHT_BASE_URL=https://dentabook.forgroup.space PLAYWRIGHT_ADMIN_URL=https://dentabook-admin.forgroup.space npm test -- portals.spec.js
```

Use the intended test hostnames if checking another installation; public-link assertions can be configured with `PLAYWRIGHT_PATIENT_PUBLIC_URL`. A different installed browser can be selected through `PLAYWRIGHT_CHANNEL` or `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

Browser checks use the test machine's DNS resolver, which can point a public hostname directly to a LAN proxy. Also verify from an external connection or resolve the hostname through public DNS and test that address explicitly. Confirm no repeated same-URL redirects on the public patient/clinic host; the admin root has one expected sign-in redirect.

The deployed-listener checks read real APIs without creating live account records. They do not replace a controlled real-account registration and sign-in check before handover.

## Client review checklist

| Journey | Expected result |
| --- | --- |
| Browse signed out | Homepage, clinic discovery, treatments, and calculator are reachable |
| Empty directory | A clear empty message, with no fabricated clinic records |
| Patient registration/sign-in | A saved patient account; private pages require its valid session |
| Clinic registration | A pending, unpublished clinic and staff account |
| Pending clinic access | Review status is visible; the approved workspace remains restricted |
| Administrator review | Only an administrator can approve/reject; a rejection requires a reason |
| Approved clinic access | The clinic owner sees its own saved information and counts |
| Wrong role | Patient, clinic, and administrator permissions remain distinct |
| Online booking | A clear unavailable notice until booking submission is implemented |
| Logout | The server session is revoked; private requests fail afterward |
| Main-host admin URL | Administration routes are blocked on the public hostname |
| Administrator root | The redirect preserves its HTTPS hostname or LAN port 3005 |

Use authorized test accounts in a test installation for workflows that create or change records. Use real production credentials only with the account owner's agreement, and remove temporary verification data through the operator's process.

## Screen sizes

Check a phone first. Review 320px, 390px, 768px, and 1440px widths. Pages must avoid horizontal overflow, text fields must be at least 16px, and buttons/navigation actions must have at least a 44 by 44px target. Review registration, sign-in, public navigation, empty/error states, and private workspace layouts.

Record the release, environment, date, checks run, results, and unresolved issues with each handover. Automated checks reduce regressions; they are not an independent penetration test or a promise that every browser condition has been examined.

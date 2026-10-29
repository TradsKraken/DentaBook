# DentaBook development requirements

- Build and review every interface mobile-first. Default CSS must work on narrow phones; add tablet and desktop layouts with `min-width` media queries.
- Keep all actions reachable on phones. Use at least 44 by 44 CSS pixel touch targets for buttons and navigation actions, and at least 16px text in form controls to avoid mobile input zoom.
- Use stacked forms and cards on phones. Contain wide tables in their own scrolling region; do not allow page-level horizontal overflow.
- Keep the supplied DentaBook branding and blue-and-white theme. Build production features incrementally. Do not include demonstration workflows, invented clinics, ratings, credentials, prices, or browser-only appointment records in the application. Use backend data and honest loading, empty, error, and unavailable states until each feature is implemented.
- Keep administrator access separate from public/patient and clinic access: `/admin/sign-in` and `/admin` use the administration layout, while clinic staff use `/clinic/sign-in` and `/clinic`. Do not add administrator sign-in links to public navigation. Enforce the portal's required role on the server, not just in the interface.
- Patients can browse the homepage, clinics, services, and calculator without signing in. Patient accounts use `/patient/register` and `/patient/sign-in`; booking, personal appointments, and account pages require a server-validated patient session. Keep this patient-access requirement even though the original brief did not explicitly require customer accounts.
- Verify changed journeys on a phone viewport first. Check layouts at 320px, 390px, 768px, and 1440px, along with relevant functional tests.

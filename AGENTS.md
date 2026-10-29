# DentaBook development requirements

- Build and review every interface mobile-first. Default CSS must work on narrow phones; add tablet and desktop layouts with `min-width` media queries.
- Keep all actions reachable on phones. Use at least 44 by 44 CSS pixel touch targets for buttons and navigation actions, and at least 16px text in form controls to avoid mobile input zoom.
- Use stacked forms and cards on phones. Contain wide tables in their own scrolling region; do not allow page-level horizontal overflow.
- Keep the supplied DentaBook branding and blue-and-white theme. Build production features incrementally. Do not include demonstration workflows, invented clinics, ratings, credentials, prices, or browser-only appointment records in the application. Use backend data and honest loading, empty, error, and unavailable states until each feature is implemented.
- Verify changed journeys on a phone viewport first. Check layouts at 320px, 390px, 768px, and 1440px, along with relevant functional tests.

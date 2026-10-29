# DentaBook brand and interface direction

## Source assets

The supplied images are preserved without image edits:

- [DentaBook logo](../client/public/branding/dentabook-logo.jpg)
- [Interface and theme reference](design/interface-reference.jpg)

The logo lives in the frontend public branding folder and can be served at `/branding/dentabook-logo.jpg`. The interface collage is documentation for future design work.

## Brand

Use **DentaBook** and the tagline **Book your smile, know your cost.** The original logo combines a blue tooth outline, bold black lettering, and a white background. Keep its proportions and avoid cropping the wordmark or tagline. The JPG has a white background; it is not transparent.

## Visual direction

The reference uses white cards on pale blue backgrounds, blue primary actions, dark headings, muted secondary text, thin borders, modest corner rounding, and generous spacing. Clinic and dentist photography supports discovery. Small outline icons identify services and appointment actions.

Suggested colors are visual approximations, not extracted brand specifications:

| Purpose | Suggested color |
| --- | --- |
| Brand blue | `#2178B5` |
| Primary action | `#027FB5` |
| Page background | `#F1F8FC` |
| Card surface | `#FFFFFF` |
| Main text | `#172B36` |
| Secondary text | `#627583` |
| Borders | `#DFEAF0` |

Check text and control contrast during implementation. Use a readable sans-serif font, clear labels, visible keyboard focus, and touch-friendly controls. Stack columns on phones and contain wide dashboard tables within their own scrolling region.

Mobile-first is a project requirement. Default styles target narrow phones, with `min-width` enhancements for tablets and desktops. Keep form controls at least 16px and primary controls/navigation at least 44 by 44 CSS pixels. Validate at 320px and 390px before larger viewports; keep every booking action available on phones.

## Screens in the reference

| Screen | Main elements |
| --- | --- |
| Homepage | Hero, search, quick actions, featured clinics, popular services |
| Clinic directory | Location and service filters, clinic cards, ratings |
| Clinic profile | Photos, contacts, map, hours, tabs, booking action |
| Dentist profile | Photo, credentials, services, available times, reviews |
| Cost calculator | Clinic selection, treatment checkboxes, estimate and deposit summary |
| Booking | Service and dentist selection, date and time, patient details, progress steps |
| Follow-up questions | Medical history and treatment-related intake fields |
| Confirmation and payment | Booking reference, appointment details, deposit information |
| Contact | Contact channels and inquiry form |
| Administrator dashboard | Sidebar, overview counts, clinic registrations, appointments |

Use the patient and clinic workflow specifications for behavior. Submitting a booking creates a request; confirmation follows dentist acceptance and the applicable deposit requirements. The reference's confirmation screen must respect that sequence.

## Sample content and open decisions

The collage uses **DentalLink**, sample clinics, prices, dates, and people. Replace these with DentaBook branding and appropriate application data. Example deposit rates are not a fixed policy: use each clinic's configured rate. The references do not select a payment provider, notification provider, font family, or final production photography.

The frontend implements this direction for the public homepage, API-backed clinic directory and profiles, informational services, published-price estimates, and about/FAQ page. Booking and appointment tracking remain unavailable until implemented with their backend requirements. Do not add invented clinic records, ratings, prices, credentials, browser-only bookings, or public staff controls.

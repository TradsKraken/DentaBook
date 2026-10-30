# Handover checklist

Use this list when reviewing a client release. Record the named owners and acceptance date in the agreed project record; do not place passwords in this file.

## Delivery review

- [ ] Confirm the delivered release and source-code archive.
- [ ] Read the current feature/status table and agree which remaining phases are in scope.
- [ ] Confirm that the patient and clinic host is accessible over HTTPS.
- [ ] Confirm that the separate administrator host is accessible over HTTPS.
- [ ] Review the website on phone, tablet, and desktop.
- [ ] Complete the agreed account and clinic-review acceptance checks.
- [ ] Review known limitations, especially booking, payments, password recovery, and operational automation.

## Access and responsibility

- [ ] Assign the website owner and day-to-day administrator.
- [ ] Assign the hosting, DNS, certificate, and database operator.
- [ ] Provide the first intended administrator account through a private process.
- [ ] Confirm repository access and who approves future releases.
- [ ] Transfer necessary hosting and DNS access privately.
- [ ] Agree where problems and change requests are reported.
- [ ] Agree backup frequency, retention, protection, and who verifies recovery.
- [ ] Confirm that accounts belonging to previous operators are removed or reviewed when responsibility changes.

## Ongoing development

Keep this client repository as a reviewed release record. Development takes place in its separate working repository and environment. An approved delivery copies the application and updated documentation into this repository without bringing unrelated internal records into the release.

For each later release, update `CHANGELOG.md`, the status/development plan, any changed user/API instructions, and the verification record. The client should be able to identify the delivered behavior and outstanding work from those documents without reading development discussions.

## Review record

| Item | To be recorded by the responsible parties |
| --- | --- |
| Release accepted | Branch, tag, or commit of the client release |
| Acceptance date | Date the review is completed |
| Accepted by | Authorized client representative |
| Operations owner | Hosting/database responsible person |
| Support contact | Agreed reporting channel |
| Open items | Links to the agreed remaining-work list |
| Next review | Agreed review point |

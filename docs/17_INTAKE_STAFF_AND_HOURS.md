# Intake, staff access, and working hours

Development specification, 5 November 2026. These changes are not yet released.

Clinics configure their own intake questions, including any medical/allergy questions. Each question is optional or required and may apply to every visit or one clinic service. Answers retain the question text and are visible only to the owning patient and the approved clinic's authorized staff. Patients explicitly agree to share answers for the appointment. No answers are added to public clinic information, receipts, or emails. Records remain with the appointment for clinic follow-up; there is no automatic deletion or invented retention promise. Clinics must describe their purpose and retention policy before enabling intake. Changing questions does not rewrite submitted answers.

Clinic staff can request information on an appointment; its patient can reply. Requests and replies retain their authors and times without changing appointment or payment status. Follow-up is in the signed-in portals; email/SMS delivery is not yet available.

Patients can edit their name and phone and change their password using the current password. Existing appointments keep their saved contact details. Account-email changes remain unavailable until verified email delivery exists; alternate appointment email never grants account access. Password changes revoke all sessions.

Clinic owners control staff invitations and revocation. Managers manage clinic setup, intake, scheduling, appointments, and payments; appointment staff access appointments, intake/follow-up, and working hours, without payment administration or profile/service/dentist editing. Neither can grant access. Invitations use a private, expiring, single-use link that owners share directly. Acceptance requires the invited email and creates a clinic-staff account; existing clinic-staff accounts must sign in with the invited address. Patient/admin accounts cannot be converted. Membership and approval are rechecked on every clinic action. Revocation removes active clinic access immediately; audit history is retained. Staff cannot select another clinic. Dentist profiles do not create dentist logins. Dentist-specific access and MFA remain separately planned; no MFA claim is made for these password-authenticated roles.

Working hours support selecting multiple dentists and days with one or more shifts. The entire batch saves atomically, rejects overlaps, and skips identical saved shifts on retry. Individual shifts can be edited. Existing appointment reservations and quotes are preserved.

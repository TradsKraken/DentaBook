CREATE TABLE clinic_memberships (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  access_role VARCHAR(20) NOT NULL CHECK (access_role IN ('manager','appointments')),
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX clinic_memberships_clinic ON clinic_memberships(clinic_id);
CREATE TABLE clinic_staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  access_role VARCHAR(20) NOT NULL CHECK (access_role IN ('manager','appointments')),
  token_hash CHAR(64) UNIQUE NOT NULL,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX clinic_staff_invitations_clinic ON clinic_staff_invitations(clinic_id);
CREATE TABLE clinic_staff_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES users(id) ON DELETE SET NULL,
  invitation_id UUID REFERENCES clinic_staff_invitations(id) ON DELETE SET NULL,
  action VARCHAR(30) NOT NULL CHECK (action IN ('invited','invitation_revoked','joined','role_changed','access_revoked')),
  access_role VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX clinic_staff_events_clinic ON clinic_staff_events(clinic_id,created_at);
CREATE TABLE clinic_intake_settings (
  clinic_id UUID PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  purpose TEXT NOT NULL,
  retention TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE appointment_intake_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  request_key UUID NOT NULL,
  template_version INTEGER NOT NULL,
  purpose TEXT NOT NULL,
  retention TEXT NOT NULL,
  answers JSONB NOT NULL,
  consent BOOLEAN NOT NULL DEFAULT TRUE CHECK (consent),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(appointment_id,request_key)
);
CREATE INDEX appointment_intake_appointment ON appointment_intake_submissions(appointment_id,submitted_at);
CREATE TABLE appointment_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  request_key UUID NOT NULL,
  question TEXT NOT NULL,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  response TEXT,
  responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  UNIQUE(appointment_id,request_key)
);
CREATE INDEX appointment_followups_appointment ON appointment_followups(appointment_id,requested_at);

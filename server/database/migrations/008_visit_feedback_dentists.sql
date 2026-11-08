ALTER TABLE appointments ADD COLUMN completed_at TIMESTAMPTZ, ADD COLUMN completed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE clinic_memberships DROP CONSTRAINT clinic_memberships_access_role_check;
ALTER TABLE clinic_memberships ADD CHECK (access_role IN ('manager','appointments','dentist'));
ALTER TABLE clinic_memberships ADD COLUMN dentist_id UUID REFERENCES dentists(id);
ALTER TABLE clinic_memberships ADD CHECK ((access_role='dentist') = (dentist_id IS NOT NULL));
ALTER TABLE clinic_staff_invitations DROP CONSTRAINT clinic_staff_invitations_access_role_check;
ALTER TABLE clinic_staff_invitations ADD CHECK (access_role IN ('manager','appointments','dentist'));
ALTER TABLE clinic_staff_invitations ADD COLUMN dentist_id UUID REFERENCES dentists(id);
ALTER TABLE clinic_staff_invitations ADD CHECK ((access_role='dentist') = (dentist_id IS NOT NULL));

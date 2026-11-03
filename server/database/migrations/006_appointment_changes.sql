-- Clinics explicitly opt in to patient actions; no deadline or refund promise is seeded.
ALTER TABLE clinics ADD COLUMN patient_cancellation_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE clinics ADD COLUMN cancellation_notice_hours INTEGER CHECK (cancellation_notice_hours BETWEEN 0 AND 2160);
ALTER TABLE clinics ADD COLUMN patient_rescheduling_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE clinics ADD COLUMN reschedule_notice_hours INTEGER CHECK (reschedule_notice_hours BETWEEN 0 AND 2160);
ALTER TABLE clinics ADD COLUMN appointment_change_terms TEXT;
ALTER TABLE clinics ADD COLUMN change_policy_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clinics ADD CONSTRAINT clinic_change_policy_complete CHECK (
  (NOT patient_cancellation_enabled OR cancellation_notice_hours IS NOT NULL)
  AND (NOT patient_rescheduling_enabled OR reschedule_notice_hours IS NOT NULL)
  AND (NOT (patient_cancellation_enabled OR patient_rescheduling_enabled)
    OR (appointment_change_terms IS NOT NULL AND length(trim(appointment_change_terms)) BETWEEN 1 AND 5000))
);
ALTER TABLE appointments ADD COLUMN change_policy_snapshot JSONB;
ALTER TABLE appointments ADD COLUMN refund_review_required BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE appointment_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('cancel','reschedule')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending','approved','declined','withdrawn','superseded')),
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  requester_role VARCHAR(20) NOT NULL CHECK (requester_role IN ('patient','clinic_staff')),
  request_key UUID NOT NULL,
  request_hash CHAR(64) NOT NULL,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 2000),
  policy_snapshot JSONB NOT NULL,
  original_date DATE NOT NULL,
  original_start TIME NOT NULL,
  original_end TIME NOT NULL,
  requested_date DATE,
  requested_start TIME,
  requested_end TIME,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  UNIQUE (requested_by,request_key),
  CHECK ((kind='cancel' AND requested_date IS NULL AND requested_start IS NULL AND requested_end IS NULL)
    OR (kind='reschedule' AND requested_date IS NOT NULL AND requested_start IS NOT NULL AND requested_end IS NOT NULL AND requested_start < requested_end))
);
CREATE UNIQUE INDEX appointment_changes_one_pending ON appointment_changes(appointment_id) WHERE status='pending';
CREATE INDEX appointment_changes_history ON appointment_changes(appointment_id,requested_at DESC,id DESC);

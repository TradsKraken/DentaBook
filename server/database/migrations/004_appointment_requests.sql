-- Add request/review metadata without changing existing customer records.
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booking_request_key UUID;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booking_request_hash CHAR(64);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE appointment_services ADD COLUMN IF NOT EXISTS service_name VARCHAR(200);
CREATE UNIQUE INDEX IF NOT EXISTS appointments_patient_request_key
  ON appointments(patient_user_id, booking_request_key) WHERE booking_request_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS appointments_reserved_slots
  ON appointments(clinic_id, dentist_id, appointment_date)
  WHERE status IN ('pending_review', 'accepted', 'confirmed');
-- Old imported records are retained; new writes must use a valid time range.
ALTER TABLE appointments ADD CONSTRAINT appointments_request_time_order
  CHECK (start_time < end_time) NOT VALID;

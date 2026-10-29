CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (LOWER(email));
ALTER TABLE clinics DROP CONSTRAINT IF EXISTS clinics_status_check;
ALTER TABLE clinics ADD CONSTRAINT clinics_status_check CHECK (status IN ('pending_review', 'approved', 'rejected', 'suspended'));
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS registration_reference VARCHAR(200);
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT TRUE;

-- System update: existing patient accounts are marked unverified so they can choose to verify their existing email or change to a new one
UPDATE users SET is_email_verified = TRUE WHERE role != 'patient' OR owner_access = TRUE;
UPDATE users SET is_email_verified = FALSE WHERE role = 'patient' AND NOT owner_access;

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    code_hash VARCHAR(64),
    purpose VARCHAR(32) NOT NULL CHECK(purpose IN ('verify_email', 'reset_password')),
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS verification_tokens_lookup ON verification_tokens(user_id, purpose, expires_at);
CREATE INDEX IF NOT EXISTS verification_tokens_token ON verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS verification_tokens_code ON verification_tokens(code_hash);

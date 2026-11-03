-- Existing clinics must explicitly choose their policy and payment channels.
-- The historical 20% default does not constitute a published deposit policy.
ALTER TABLE clinics ADD COLUMN deposit_policy_configured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE clinics ADD COLUMN deposit_refund_terms TEXT;
ALTER TABLE clinics ADD COLUMN deposit_policy_updated_at TIMESTAMPTZ;
ALTER TABLE clinics ADD COLUMN gcash_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE clinics ADD COLUMN gcash_account_name VARCHAR(150);
ALTER TABLE clinics ADD COLUMN gcash_number VARCHAR(11);
ALTER TABLE clinics ADD COLUMN walk_in_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE clinics ADD CONSTRAINT clinics_configured_deposit_policy CHECK (
  NOT deposit_policy_configured OR (deposit_percentage IS NOT NULL AND deposit_percentage > 0 AND deposit_percentage <= 100
    AND deposit_refund_terms IS NOT NULL AND length(trim(deposit_refund_terms)) BETWEEN 1 AND 5000)
) NOT VALID;
ALTER TABLE clinics ADD CONSTRAINT clinics_gcash_details CHECK (
  NOT gcash_enabled OR (deposit_policy_configured AND gcash_account_name IS NOT NULL AND length(trim(gcash_account_name)) > 0
    AND gcash_number IS NOT NULL AND gcash_number ~ '^09[0-9]{9}$')
) NOT VALID;
ALTER TABLE appointments ADD COLUMN deposit_percentage_snapshot NUMERIC(5,2);
ALTER TABLE appointments ADD COLUMN deposit_terms_snapshot TEXT;
ALTER TABLE appointments ADD COLUMN deposit_quote_hash CHAR(64);
ALTER TABLE appointments ADD COLUMN confirmed_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN confirmation_source VARCHAR(50);

-- Manual GCash submissions are claims until an authorized clinic staff member
-- checks the actual transfer. Pay-at-clinic choices remain pending and unpaid.
ALTER TABLE payments ADD COLUMN channel VARCHAR(20) CHECK (channel IN ('gcash','walk_in'));
ALTER TABLE payments ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'PHP';
ALTER TABLE payments ADD COLUMN request_key UUID;
ALTER TABLE payments ADD COLUMN quote_hash CHAR(64);
ALTER TABLE payments ADD COLUMN recipient_name VARCHAR(150);
ALTER TABLE payments ADD COLUMN recipient_number VARCHAR(11);
ALTER TABLE payments ADD COLUMN claimed_reference VARCHAR(100);
ALTER TABLE payments ADD COLUMN claim_submitted_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN verification_status VARCHAR(30) NOT NULL DEFAULT 'unverified'
  CHECK (verification_status IN ('unverified','verified','needs_review'));
ALTER TABLE payments ADD COLUMN review_notes TEXT;
ALTER TABLE payments ADD COLUMN reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN reviewed_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN verified_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN receipt_code VARCHAR(30);
ALTER TABLE payments ADD COLUMN receipt_snapshot JSONB;
ALTER TABLE payments ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX payments_request_key_unique ON payments(request_key) WHERE request_key IS NOT NULL;
CREATE UNIQUE INDEX payments_receipt_code_unique ON payments(receipt_code) WHERE receipt_code IS NOT NULL;
CREATE UNIQUE INDEX payments_verified_gcash_reference_unique ON payments(transaction_reference)
  WHERE channel='gcash' AND verified_at IS NOT NULL;
CREATE UNIQUE INDEX payments_active_choice_unique ON payments(appointment_id)
  WHERE channel IS NOT NULL AND payment_status IN ('pending','paid');
CREATE INDEX payments_appointment_index ON payments(appointment_id,created_at DESC);

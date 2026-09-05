-- ============================================================
-- Authentication Migration: users & user_otps
-- ============================================================

-- Add authentication columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure demo user has a username and is marked verified
UPDATE users
SET username = 'demouser', email_verified = TRUE
WHERE id = 1 AND (username IS NULL OR email_verified = FALSE);

-- Table for storing hashed OTPs
CREATE TABLE IF NOT EXISTS user_otps (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash    VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_otps_user_id ON user_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_user_otps_lookup ON user_otps(user_id, verified_at, expires_at);

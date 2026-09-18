-- =============================================================
-- FundedWealth Terminal OS — Broker Credentials Migration
-- Target: Terminal Supabase #2 (fundedwealth-terminal)
-- Project ref: zxqwtqlbrlegwdodjhiq
-- =============================================================
-- Run this AFTER the base schema.sql has been applied.
-- NEVER run against Main Site Supabase #1.
-- =============================================================

-- Enable pgcrypto for AES encryption of credentials
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================
-- BROKER CREDENTIALS
-- Stores encrypted broker API credentials server-side.
-- Raw credentials are NEVER returned in API responses.
-- Encryption uses AES-256 via pgcrypto pgp_sym_encrypt.
-- The encryption passphrase comes from BROKER_ENCRYPTION_KEY
-- server environment variable — never stored in the DB.
-- =============================================================
CREATE TABLE IF NOT EXISTS broker_credentials (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Which broker this config belongs to
  broker_id         TEXT NOT NULL
                      CHECK (broker_id IN (
                        'dhan',
                        'zerodha',
                        'angel_one',
                        'upstox',
                        'fivepaisa',
                        'fyers',
                        'alice_blue'
                      )),

  -- Human label for this credential set (e.g. "Main Account", "Paper")
  label             TEXT NOT NULL DEFAULT 'Default',

  -- AES-256 encrypted JSON blob of credentials
  -- Encrypted with pgp_sym_encrypt(creds_json, $BROKER_ENCRYPTION_KEY)
  -- NEVER store plaintext here
  encrypted_credentials  TEXT NOT NULL,

  -- Whether this is the currently active broker for live trading
  is_active         BOOLEAN NOT NULL DEFAULT false,

  -- Whether the last connection test passed
  is_connected      BOOLEAN NOT NULL DEFAULT false,

  -- When the last connection test was performed
  last_tested_at    TIMESTAMPTZ,

  -- Result message from last connection test (safe/non-secret)
  last_test_result  TEXT,

  -- Environment: production | paper | sandbox
  environment       TEXT NOT NULL DEFAULT 'production',

  -- Which admin employee created/last-updated this record
  created_by        UUID REFERENCES employees(id),
  updated_by        UUID REFERENCES employees(id),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active broker at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_broker_credentials_one_active
  ON broker_credentials (is_active)
  WHERE is_active = true;

-- Fast lookup by broker
CREATE INDEX IF NOT EXISTS idx_broker_credentials_broker_id
  ON broker_credentials (broker_id);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
ALTER TABLE broker_credentials ENABLE ROW LEVEL SECURITY;
-- Service role bypasses RLS — anon key has no access by default.

-- =============================================================
-- HELPER: Safely deactivate all brokers before setting a new one
-- (called from application layer, documented here for reference)
-- =============================================================
-- UPDATE broker_credentials SET is_active = false;
-- UPDATE broker_credentials SET is_active = true WHERE id = $1;

-- =============================================================
-- NOTES ON ENCRYPTION
-- =============================================================
-- To encrypt when inserting (done in application layer, not SQL):
--   pgp_sym_encrypt('{"client_id":"...","access_token":"..."}', $KEY)
--
-- To decrypt when reading (done in application layer, not SQL):
--   pgp_sym_decrypt(encrypted_credentials::bytea, $KEY)
--
-- The $KEY is process.env.BROKER_ENCRYPTION_KEY — 32+ chars.
-- It is NEVER stored in the database.
-- =============================================================

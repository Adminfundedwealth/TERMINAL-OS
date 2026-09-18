-- =============================================================
-- pgcrypto RPC functions for broker credential encryption
-- Run against Terminal Supabase #2 AFTER enabling pgcrypto
-- =============================================================

-- Encrypt plaintext using AES via pgcrypto symmetric encryption
CREATE OR REPLACE FUNCTION encrypt_broker_credentials(
  plaintext  TEXT,
  passphrase TEXT
)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT encode(
    pgp_sym_encrypt(plaintext, passphrase),
    'base64'
  );
$$;

-- Decrypt ciphertext using AES via pgcrypto
CREATE OR REPLACE FUNCTION decrypt_broker_credentials(
  ciphertext TEXT,
  passphrase TEXT
)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pgp_sym_decrypt(
    decode(ciphertext, 'base64'),
    passphrase
  );
$$;

-- Revoke public access — only service role can call these
REVOKE ALL ON FUNCTION encrypt_broker_credentials(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION decrypt_broker_credentials(TEXT, TEXT) FROM PUBLIC;

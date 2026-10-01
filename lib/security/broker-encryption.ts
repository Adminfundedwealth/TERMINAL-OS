/**
 * Broker credential encryption/decryption utilities.
 * Uses AES-256 symmetric encryption via the pgcrypto extension
 * (pgp_sym_encrypt / pgp_sym_decrypt) through the Supabase/Postgres
 * RPC interface, so the raw key never leaves the server process.
 *
 * The BROKER_ENCRYPTION_KEY env var is the passphrase — never
 * stored in the database, never sent to the client.
 *
 * SECURITY REQUIREMENTS:
 *  - Raw credentials are NEVER logged
 *  - Raw credentials are NEVER returned in API responses
 *  - Masked values (e.g. "••••••••abc1") are safe to return
 */
import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type BrokerCredentialMap = Record<string, string>;

/** Returns true if the encryption key env var is configured */
export function isEncryptionAvailable(): boolean {
  const key = process.env.BROKER_ENCRYPTION_KEY ?? "";
  return key.length >= 16;
}

/**
 * Encrypts a credential map to a base64 string using pgcrypto.
 * Throws if BROKER_ENCRYPTION_KEY is not set.
 */
export async function encryptCredentials(
  credentials: BrokerCredentialMap
): Promise<string> {
  const key = process.env.BROKER_ENCRYPTION_KEY;
  if (!key || key.length < 16) {
    throw new Error(
      "[Terminal OS] BROKER_ENCRYPTION_KEY is not set or too short (min 16 chars). " +
        "Add it to .env.local before storing broker credentials."
    );
  }

  const plaintext = JSON.stringify(credentials);

  // Use pgcrypto pgp_sym_encrypt via Supabase RPC
  const db = createServerSupabaseClient();
  const { data, error } = await db.rpc("encrypt_broker_credentials", {
    plaintext,
    passphrase: key,
  });

  if (error || !data) {
    throw new Error(
      "[Terminal OS] Failed to encrypt broker credentials. Ensure pgcrypto and its encryption RPC are configured."
    );
  }

  return data as string;
}

/**
 * Decrypts an encrypted credential string back to a map.
 * Never call this in a context that returns data to the client.
 */
export async function decryptCredentials(
  encrypted: string
): Promise<BrokerCredentialMap> {
  const key = process.env.BROKER_ENCRYPTION_KEY;
  if (!key || key.length < 16) {
    throw new Error("[Terminal OS] BROKER_ENCRYPTION_KEY is not configured.");
  }

  const db = createServerSupabaseClient();
  const { data, error } = await db.rpc("decrypt_broker_credentials", {
    ciphertext: encrypted,
    passphrase: key,
  });

  if (error || !data) {
    throw new Error("[Terminal OS] Failed to decrypt broker credentials.");
  }

  return JSON.parse(data as string) as BrokerCredentialMap;
}

/**
 * Returns a masked version of a credential value safe to display in the UI.
 * e.g. "eyJh...xyz123" → "••••••••xyz123"
 * Never returns the full value.
 */
export function maskCredential(value: string): string {
  if (!value || value.length === 0) return "";
  if (value.length <= 8) return "••••••••";
  const tail = value.slice(-6);
  return `••••••••${tail}`;
}

/**
 * Returns a safe credential summary — all values masked.
 * Safe to include in API responses.
 */
export function maskCredentialMap(
  credentials: BrokerCredentialMap
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(credentials).map(([k, v]) => [k, maskCredential(v)])
  );
}

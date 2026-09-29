/**
 * Environment variable validation for FundedWealth Terminal OS.
 *
 * Call validateServerEnv() at startup (e.g., in next.config.ts or a
 * server-only initializer) to catch missing variables early.
 *
 * NEVER import CANONICAL_TERMINAL_SUPABASE_SECRET_KEY in client code.
 * This file is server-side only.
 */

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/** Required on the server — never exposed to browser */
const REQUIRED_SERVER_VARS = [
  "CANONICAL_TERMINAL_SUPABASE_URL",
  "CANONICAL_TERMINAL_SUPABASE_SECRET_KEY",
  "SESSION_SECRET",
] as const;

/** Required on the client (NEXT_PUBLIC_ prefix, safe to expose) */
const REQUIRED_PUBLIC_VARS = [
  "NEXT_PUBLIC_CANONICAL_SUPABASE_URL",
  "NEXT_PUBLIC_CANONICAL_SUPABASE_PUBLISHABLE_KEY",
] as const;

/** Variables that must NEVER be present in this project */
const FORBIDDEN_VARS = [
  "MAIN_SITE_SUPABASE_URL",
  "MAIN_SITE_SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_MAIN_SITE_SUPABASE_URL",
] as const;

export function validateServerEnv(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required server vars
  for (const key of REQUIRED_SERVER_VARS) {
    if (!process.env[key]) missing.push(key);
  }

  // Check required public vars
  for (const key of REQUIRED_PUBLIC_VARS) {
    if (!process.env[key]) missing.push(key);
  }

  // Warn on forbidden vars (Main Site credentials must never be here)
  for (const key of FORBIDDEN_VARS) {
    if (process.env[key]) {
      warnings.push(
        `SECURITY: ${key} should not be present in Terminal OS. ` +
          "This project must only connect to Terminal Supabase #2."
      );
    }
  }

  // Warn if SESSION_SECRET is too short
  const sessionSecret = process.env.SESSION_SECRET ?? "";
  if (sessionSecret && sessionSecret.length < 32) {
    warnings.push("SESSION_SECRET is shorter than 32 characters — use a stronger secret.");
  }

  // Warn if anon key looks like a service role key (starts with eyJ and is very long)
  const anonKey = process.env.NEXT_PUBLIC_CANONICAL_SUPABASE_PUBLISHABLE_KEY ?? "";
  if (anonKey && anonKey.length > 500) {
    warnings.push(
      "NEXT_PUBLIC_CANONICAL_SUPABASE_PUBLISHABLE_KEY appears to be a service role key " +
        "(too long). Never expose the service role key to the browser."
    );
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/** Throws on startup if required env vars are missing */
export function assertServerEnv(): void {
  const result = validateServerEnv();

  for (const warning of result.warnings) {
    console.warn(`[Terminal OS] ENV WARNING: ${warning}`);
  }

  if (!result.valid) {
    throw new Error(
      `[Terminal OS] Missing required environment variables:\n` +
        result.missing.map((k) => `  - ${k}`).join("\n") +
        `\n\nCopy .env.example to .env.local and fill in the values.`
    );
  }
}

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { assertCanonicalSupabaseUrl } from "@/lib/supabase/project";

export function createCanonicalAdminClient() {
  const url = process.env.CANONICAL_TERMINAL_SUPABASE_URL;
  const secret = process.env.CANONICAL_TERMINAL_SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error("Canonical Supabase admin credentials are not configured");
  }
  assertCanonicalSupabaseUrl(url);

  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
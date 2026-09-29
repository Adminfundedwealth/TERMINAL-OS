/**
 * Browser-side Supabase client — uses the ANON/PUBLISHABLE key only.
 * Safe to use in client components.
 * Row-Level Security (RLS) must be configured on Terminal Supabase #2
 * to protect data at the database layer.
 */
"use client";

import { createBrowserClient } from "@supabase/ssr";
import { assertCanonicalSupabaseUrl } from "@/lib/supabase/project";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: ReturnType<typeof createBrowserClient<any>> | null = null;

/**
 * Returns a singleton browser Supabase client.
 * Uses only the public anon key — never the service role secret.
 */
export function createClientSupabaseClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_CANONICAL_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_CANONICAL_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "[Terminal OS] NEXT_PUBLIC_CANONICAL_SUPABASE_URL or " +
        "NEXT_PUBLIC_CANONICAL_SUPABASE_PUBLISHABLE_KEY is missing. " +
        "Check your .env.local file."
    );
  }

  assertCanonicalSupabaseUrl(url);
  client = createBrowserClient(url, key);
  return client;
}

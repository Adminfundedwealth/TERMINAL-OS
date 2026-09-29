import "server-only";
import { createClient } from "@supabase/supabase-js";
import { assertCanonicalSupabaseUrl } from "@/lib/supabase/project";

export function createServerSupabaseClient() {
  const url = process.env.CANONICAL_TERMINAL_SUPABASE_URL;
  const secret = process.env.CANONICAL_TERMINAL_SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error("Canonical Terminal OS Supabase server credentials are not configured");
  }
  assertCanonicalSupabaseUrl(url);

  // In dev mode with placeholder values, return a dummy client that won't crash
  if (!url || url.includes("placeholder") || !secret || secret.includes("placeholder")) {
    // Return a no-op client stub in dev mode
    const stub = {
      from: () => ({
        select: () => ({ data: null, error: { message: "DEV_MODE: No Supabase connected" }, count: 0,
          eq: () => ({ data: null, error: null, single: () => ({ data: null, error: null }) }),
          single: () => ({ data: null, error: null }),
          order: () => ({ data: [], error: null, range: () => ({ data: [], error: null, count: 0 }) }),
          limit: () => ({ data: [], error: null }),
          maybeSingle: () => ({ data: null, error: null }),
        }),
        insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
        update: () => ({ eq: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }) }),
        in: () => ({ order: () => ({ range: () => ({ data: [], error: null, count: 0 }) }) }),
        not: () => ({ select: () => ({ count: 0, error: null }) }),
        gte: () => ({ select: () => ({ count: 0, error: null }), lte: () => ({ data: [], error: null }) }),
      }),
      auth: {
        admin: {
          inviteUserByEmail: async () => ({ data: { user: null }, error: new Error("DEV_MODE") }),
        },
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return stub as any;
  }

  return createClient(url, secret, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

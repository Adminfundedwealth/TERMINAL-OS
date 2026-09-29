/**
 * Supabase client for use inside Next.js Route Handlers (API routes).
 * Uses @supabase/ssr createServerClient with cookie handling.
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { assertCanonicalSupabaseUrl } from "@/lib/supabase/project";

export async function createRouteHandlerSupabaseClient(accessToken?: string) {
  const url = process.env.NEXT_PUBLIC_CANONICAL_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_CANONICAL_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("[Terminal OS] Supabase env vars missing in route handler.");
  }

  assertCanonicalSupabaseUrl(url);
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll called from a Server Component — cookies are read-only
        }
      },
    },
  });
}

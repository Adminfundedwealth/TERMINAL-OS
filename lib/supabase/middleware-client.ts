/**
 * Supabase client for use inside Next.js middleware.
 * Uses @supabase/ssr createServerClient with cookie handling.
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { assertCanonicalSupabaseUrl } from "@/lib/supabase/project";

export function createMiddlewareSupabaseClient(
  request: NextRequest,
  response: NextResponse
) {
  const url = process.env.NEXT_PUBLIC_CANONICAL_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_CANONICAL_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("[Terminal OS] Supabase env vars missing in middleware.");
  }

  assertCanonicalSupabaseUrl(url);
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });
}

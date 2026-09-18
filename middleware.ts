import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/forgot-password"];
const API_PREFIX = "/api/";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through API routes, Next.js internals, static files
  if (
    pathname.startsWith(API_PREFIX) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // ── DEV MODE: use simple cookie session ───────────────────
  if (process.env.DEV_MODE === "true") {
    const devSession = request.cookies.get("dev_session");
    const isLoggedIn = devSession?.value === "active";

    if (!isLoggedIn && !isPublicRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isLoggedIn && isPublicRoute) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  // ── PRODUCTION: Supabase session refresh ──────────────────
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  try {
    const { createMiddlewareSupabaseClient } = await import(
      "@/lib/supabase/middleware-client"
    );
    const supabase = createMiddlewareSupabaseClient(request, response);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user && !isPublicRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (user && isPublicRoute) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return response;
  } catch {
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

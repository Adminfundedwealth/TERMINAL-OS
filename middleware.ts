import { NextResponse, type NextRequest } from "next/server";
import { getTerminalOsAdminRole } from "@/lib/auth/admin-access";

const PUBLIC_ROUTES = ["/login", "/forgot-password"];
const API_PREFIX = "/api/";
const LOCAL_TRADER_ORIGINS = new Set([
  "http://localhost:4001",
  "http://127.0.0.1:4001",
]);

function applyApiCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get("origin");
  if (!origin) return response;
  const isMarketDataRoute = request.nextUrl.pathname === "/api/terminal/market-data";
  const configuredMarketDataOrigins = isMarketDataRoute
    ? (process.env.MAIN_TERMINAL_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean)
    : [];
  if (!LOCAL_TRADER_ORIGINS.has(origin) && !configuredMarketDataOrigins.includes(origin)) return response;

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Accept, Content-Type, Authorization");
  response.headers.append("Vary", "Origin");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through API routes, Next.js internals, static files
  if (pathname.startsWith(API_PREFIX)) {
    if (request.method === "OPTIONS") {
      return applyApiCors(request, new NextResponse(null, { status: 204 }));
    }
    return applyApiCors(request, NextResponse.next());
  }

  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  try {
    const { createMiddlewareSupabaseClient } = await import(
      "@/lib/supabase/middleware-client"
    );
    const supabase = createMiddlewareSupabaseClient(request, response);
    const { data: { user } } = await supabase.auth.getUser();
    const isAdmin = Boolean(user && getTerminalOsAdminRole(user.email));

    if (!isAdmin && !isPublicRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isAdmin && isPublicRoute) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return response;
  } catch {
    if (isPublicRoute) return response;
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

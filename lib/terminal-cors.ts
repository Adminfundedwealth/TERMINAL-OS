const PRODUCTION_TERMINAL_ORIGIN = "https://charts.fundedwealth.com";

export function allowedMainTerminalOrigins(): string[] {
  return [...new Set([
    PRODUCTION_TERMINAL_ORIGIN,
    ...(process.env.MAIN_TERMINAL_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean),
  ])];
}

export function mainTerminalCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && allowedMainTerminalOrigins().includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

export function mainTerminalOptionsResponse(req: Request, methods: string): Response {
  const origin = req.headers.get("origin");
  if (origin && !allowedMainTerminalOrigins().includes(origin)) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      ...mainTerminalCorsHeaders(req),
      "Access-Control-Allow-Methods": methods,
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedCustomerFromRequest } from "@/lib/auth/session";
import { mainTerminalCorsHeaders, mainTerminalOptionsResponse } from "@/lib/terminal-cors";
import { authorizeMarketDataAccount } from "@/server/services/market-data-access";
import { issueRealtimeTicket } from "@/server/brokers/realtime-ticket";

const RequestSchema = z.object({
  account_id: z.string().uuid(),
  provider: z.enum(["dhan", "kite"]),
  environment: z.enum(["production", "paper", "sandbox"]).default("production"),
}).strict();

function json(req: Request, body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      ...mainTerminalCorsHeaders(req),
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
  });
}

export async function OPTIONS(req: Request): Promise<Response> {
  return mainTerminalOptionsResponse(req, "POST, OPTIONS");
}

export async function POST(req: Request): Promise<NextResponse> {
  const customer = await getAuthenticatedCustomerFromRequest(req);
  if (!customer) return json(req, { error: { code: "UNAUTHENTICATED", message: "Authentication required." } }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: { code: "INVALID_REQUEST", message: "Invalid realtime ticket request." } }, 400);
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return json(req, { error: { code: "INVALID_REQUEST", message: "Invalid realtime ticket request." } }, 400);

  const secret = process.env.REALTIME_TICKET_SECRET;
  if (!secret) return json(req, { error: { code: "REALTIME_UNAVAILABLE", message: "Realtime ticket service is unavailable." } }, 503);

  try {
    await authorizeMarketDataAccount(customer.accessToken, customer.userId, parsed.data.account_id, parsed.data.provider);
    const { ticket, claims } = issueRealtimeTicket({
      sub: customer.userId,
      account_id: parsed.data.account_id,
      provider: parsed.data.provider,
      environment: parsed.data.environment,
    }, secret);
    return json(req, { data: { ticket, expires_at: new Date(claims.exp * 1000).toISOString() } });
  } catch {
    return json(req, { error: { code: "ACCOUNT_FORBIDDEN", message: "This account is not authorized for realtime data." } }, 403);
  }
}
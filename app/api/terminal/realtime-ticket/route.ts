import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedCustomerFromRequest } from "@/lib/auth/session";
import { authorizeMarketDataAccount } from "@/server/services/market-data-access";
import { issueRealtimeTicket } from "@/server/brokers/realtime-ticket";

const RequestSchema = z.object({
  account_id: z.string().uuid(),
  provider: z.enum(["dhan", "kite"]),
  environment: z.enum(["production", "paper", "sandbox"]).default("production"),
}).strict();

export async function POST(req: Request): Promise<NextResponse> {
  const customer = await getAuthenticatedCustomerFromRequest(req);
  if (!customer) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Authentication required." } }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Invalid realtime ticket request." } }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Invalid realtime ticket request." } }, { status: 400 });

  const secret = process.env.REALTIME_TICKET_SECRET;
  if (!secret) return NextResponse.json({ error: { code: "REALTIME_UNAVAILABLE", message: "Realtime ticket service is unavailable." } }, { status: 503 });

  try {
    await authorizeMarketDataAccount(customer.accessToken, customer.userId, parsed.data.account_id, parsed.data.provider);
    const { ticket, claims } = issueRealtimeTicket({
      sub: customer.userId,
      account_id: parsed.data.account_id,
      provider: parsed.data.provider,
      environment: parsed.data.environment,
    }, secret);
    return NextResponse.json({ data: { ticket, expires_at: new Date(claims.exp * 1000).toISOString() } }, {
      headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
    });
  } catch {
    return NextResponse.json({ error: { code: "ACCOUNT_FORBIDDEN", message: "This account is not authorized for realtime data." } }, { status: 403 });
  }
}
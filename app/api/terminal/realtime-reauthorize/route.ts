import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { verifyRealtimeTicket } from "@/server/brokers/realtime-ticket";
import { getMarketDataCredentials } from "@/server/services/broker-credentials";

const RequestSchema = z.object({ ticket: z.string().min(1).max(2048) }).strict();

export async function POST(req: Request): Promise<NextResponse> {
  const serviceSecret = process.env.REALTIME_SERVICE_AUTH_SECRET;
  if (!serviceSecret || req.headers.get("authorization") !== `Bearer ${serviceSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ticketSecret = process.env.REALTIME_TICKET_SECRET;
  if (!ticketSecret) return NextResponse.json({ error: "Realtime unavailable" }, { status: 503 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const claims = verifyRealtimeTicket(parsed.data.ticket, ticketSecret, { allowExpired: true });
    const db = createServerSupabaseClient();
    const { data, error } = await db.rpc("get_active_account_context", { requested_account_id: claims.account_id });
    const account = (data as { account?: { id?: string; owner_user_id?: string; status?: string; is_active?: boolean } } | null)?.account;
    if (error || account?.id !== claims.account_id || account.owner_user_id !== claims.sub ||
      account.status?.toLowerCase() !== "active" || account.is_active !== true) {
      return NextResponse.json({ authorized: false }, { status: 403 });
    }
    const credentials = await getMarketDataCredentials(claims.account_id, claims.provider, claims.environment);
    return NextResponse.json({ authorized: true, credentials }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ authorized: false }, { status: 403 });
  }
}
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, parsePagination } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getAuthenticatedCustomerFromRequest } from "@/lib/auth/session";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/route-handler-client";
import { serverLog } from "@/lib/logger";
import { getOrders } from "@/server/services/orders";

const OrderRequestSchema = z.object({
  account_id: z.string().uuid(),
  client_order_id: z.string().max(128).optional(),
  symbol: z.string().min(1).max(100),
  exchange: z.string().min(1).max(20),
  segment: z.string().max(30).optional(),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().int().positive(),
  order_type: z.enum(["MARKET", "LIMIT", "SL", "SL-M", "STOP", "STOP-LIMIT"]),
  price: z.number().positive().optional(),
  trigger_price: z.number().positive().optional(),
  stop_loss: z.number().positive().optional(),
  take_profit: z.number().positive().optional(),
  time_in_force: z.enum(["DAY", "IOC", "GTC"]).optional(),
  product: z.enum(["CNC", "MIS", "NRML"]).optional(),
  is_overnight: z.boolean().optional(),
  instrument: z.record(z.string(), z.unknown()).optional(),
});

function allowedOrigins(): string[] {
  return (process.env.MAIN_TERMINAL_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = { Vary: "Origin", "Cache-Control": "no-store" };
  if (origin && allowedOrigins().includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(req: Request, body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: corsHeaders(req) });
}

export async function OPTIONS(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().includes(origin)) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(req),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Accept, Content-Type, Authorization",
    },
  });
}

export const GET = withAuth(PERMISSIONS.ORDERS_VIEW, async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize } = parsePagination(searchParams);

  const { data, total } = await getOrders({
    trading_account_id: searchParams.get("account_id") ?? undefined,
    symbol: searchParams.get("symbol") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    side: searchParams.get("side") ?? undefined,
    order_type: searchParams.get("order_type") ?? undefined,
    date_from: searchParams.get("date_from") ?? undefined,
    date_to: searchParams.get("date_to") ?? undefined,
    page,
    page_size: pageSize,
  });

  return NextResponse.json({
    data,
    meta: { total, page, page_size: pageSize, has_more: page * pageSize < total },
  });
});

export async function POST(req: Request): Promise<NextResponse> {
  const customer = await getAuthenticatedCustomerFromRequest(req);
  if (!customer) return json(req, { error: { code: "UNAUTHENTICATED", message: "Authentication required." } }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: { code: "VALIDATION_ERROR", message: "Invalid order request." } }, 400);
  }
  const parsed = OrderRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(req, { error: { code: "VALIDATION_ERROR", message: "Invalid order request." } }, 400);
  }

  try {
    const client = await createRouteHandlerSupabaseClient(customer.accessToken);
    const { data: context, error: contextError } = await client.rpc("get_active_account_context", {
      requested_account_id: parsed.data.account_id,
    });
    const account = (context as { account?: { id: string; owner_user_id: string; status: string; is_active: boolean } } | null)?.account;
    if (contextError || !account || account.id !== parsed.data.account_id || account.owner_user_id !== customer.userId) {
      return json(req, { error: { code: "ACCOUNT_NOT_FOUND", message: "Trading account is unavailable." } }, 403);
    }
    if (account.status?.toLowerCase() !== "active" || account.is_active !== true) {
      return json(req, { error: { code: "ACCOUNT_INACTIVE", message: "Trading account is unavailable." } }, 403);
    }

    const instrument = parsed.data.instrument as { provider?: unknown; instrumentType?: unknown } | undefined;
    const isSimulatedKiteDerivative = parsed.data.product === "NRML" &&
      instrument?.provider === "zerodha" &&
      ["OPTIDX", "OPTSTK", "FUTIDX", "FUTSTK"].includes(String(instrument.instrumentType ?? "").toUpperCase());
    const { data, error } = await client.rpc(
      isSimulatedKiteDerivative ? "create_simulated_kite_order" : "create_order",
      { request: parsed.data },
    );
    if (error) {
      serverLog("error", "orders", "order_request_failed", { code: "ORDER_REQUEST_FAILED" });
      return json(req, { error: { code: "ORDER_REQUEST_FAILED", message: "Order request could not be processed." } }, 502);
    }

    const result = data as { ok?: boolean; error?: { code?: string; message?: string } } | null;
    if (!result?.ok) {
      return json(req, {
        error: {
          code: result?.error?.code ?? "ORDER_REJECTED",
          message: result?.error?.message ?? "Order was rejected by account or risk controls.",
        },
        data: result,
      }, 409);
    }
    return json(req, { data: result });
  } catch {
    serverLog("error", "orders", "order_request_failed", { code: "INTERNAL_ERROR" });
    return json(req, { error: { code: "INTERNAL_ERROR", message: "Order request could not be processed." } }, 500);
  }
}

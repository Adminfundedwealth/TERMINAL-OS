import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedCustomerFromRequest } from "@/lib/auth/session";
import { serverLog } from "@/lib/logger";
import { authorizeMarketDataAccount } from "@/server/services/market-data-access";
import { createStoredMarketDataProvider } from "@/server/brokers/provider-factory";
import { MarketDataProviderError } from "@/server/brokers/provider-error";
import { normalizeMarketQuote } from "@/server/brokers/normalization";
import type { MarketInstrument } from "@/server/brokers/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const StreamQuerySchema = z.object({
  account_id: z.string().uuid(),
  provider: z.enum(["dhan", "kite"]),
  environment: z.enum(["production", "paper", "sandbox"]).default("production"),
  symbols: z.string().min(1).max(1000).transform((value) => [...new Set(value.split(",").map((symbol) => symbol.trim()).filter(Boolean))]).refine((symbols) => symbols.length > 0 && symbols.length <= 25 && symbols.every((symbol) => symbol.length <= 100)),
});

function allowedOrigins(): string[] {
  return (process.env.MAIN_TERMINAL_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = { Vary: "Origin", "Cache-Control": "no-store" };
  if (origin && allowedOrigins().includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function errorResponse(req: Request, code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status, headers: corsHeaders(req) });
}

function frame(event: string, payload: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

export async function GET(req: Request): Promise<Response> {
  const customer = await getAuthenticatedCustomerFromRequest(req);
  if (!customer) return errorResponse(req, "UNAUTHENTICATED", "Authentication required.", 401);

  const parsed = StreamQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return errorResponse(req, "INVALID_REQUEST", "Realtime subscription is invalid.", 400);
  const subscription = parsed.data;

  try {
    await authorizeMarketDataAccount(customer.accessToken, customer.userId, subscription.account_id, subscription.provider);
    const provider = await createStoredMarketDataProvider(subscription.account_id, subscription.provider, subscription.environment);
    const instruments = (await Promise.all(subscription.symbols.map((symbol) => provider.searchInstruments(symbol))))
      .flat()
      .filter((instrument) => instrument.provider === subscription.provider);
    const instrumentBySymbol = new Map<string, MarketInstrument>();
    for (const symbol of subscription.symbols) {
      const normalizedSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const instrument = instruments.find((item) =>
        item.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "") === normalizedSymbol ||
        item.tradingSymbol.toUpperCase().replace(/[^A-Z0-9]/g, "") === normalizedSymbol
      );
      if (instrument) instrumentBySymbol.set(symbol, instrument);
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          try { controller.enqueue(frame(event, data)); } catch { /* Client disconnected. */ }
        };
        send("ready", { account_id: subscription.account_id, provider: subscription.provider, environment: subscription.environment, symbols: [...instrumentBySymbol.keys()] });

        while (!req.signal.aborted) {
          const timestamp = new Date().toISOString();
          const quotes = await Promise.allSettled([...instrumentBySymbol.entries()].map(async ([symbol, instrument]) => {
            const quote = await provider.getQuote(instrument);
            if (quote.provider !== subscription.provider) throw new MarketDataProviderError(subscription.provider, "INVALID_INSTRUMENT");
            return { account_id: subscription.account_id, provider: subscription.provider, environment: subscription.environment, symbol, quote: normalizeMarketQuote(quote) };
          }));
          for (const result of quotes) {
            if (result.status === "fulfilled") send("quote", result.value);
            else send("error", { code: "PROVIDER_ERROR", message: "A market-data quote is temporarily unavailable.", retryable: true });
          }
          send("heartbeat", { timestamp });
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, 5000);
            req.signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
          });
        }
        try { controller.close(); } catch { /* Client already disconnected. */ }
      },
      cancel() {},
    });

    return new Response(stream, {
      status: 200,
      headers: {
        ...corsHeaders(req),
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (error instanceof MarketDataProviderError) {
      const status = error.code === "ACCOUNT_INACTIVE" || error.code === "ACCOUNT_NOT_FOUND" ? 403 : error.code === "MISSING_CREDENTIALS" ? 424 : 502;
      return errorResponse(req, error.code, error.message, status);
    }
    serverLog("error", "market_data", "stream_setup_failed", { error_code: "INTERNAL_ERROR", result: subscription.provider });
    return errorResponse(req, "INTERNAL_ERROR", "Realtime market data is unavailable.", 500);
  }
}

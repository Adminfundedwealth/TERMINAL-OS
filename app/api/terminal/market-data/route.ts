import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedCustomerFromRequest } from "@/lib/auth/session";
import { serverLog } from "@/lib/logger";
import { authorizeMarketDataAccount } from "@/server/services/market-data-access";
import {
  getMarketDataCredentialStatus,
  recordMarketDataAuthentication,
} from "@/server/services/broker-credentials";
import { createStoredMarketDataProvider } from "@/server/brokers/provider-factory";
import { MarketDataProviderError } from "@/server/brokers/provider-error";
import type { MarketInstrument } from "@/server/brokers/types";

const InstrumentSchema = z.object({
  provider: z.enum(["dhan", "kite"]),
  providerInstrumentId: z.string().min(1).max(32),
  symbol: z.string().min(1).max(100),
  tradingSymbol: z.string().min(1).max(100),
  exchange: z.string().min(1).max(20),
  exchangeSegment: z.string().min(1).max(30),
  instrumentType: z.string().max(30),
  lotSize: z.number().optional(),
  tickSize: z.number().optional(),
  expiryDate: z.string().optional(),
  strikePrice: z.number().optional(),
  optionType: z.string().optional(),
});

const RequestSchema = z.discriminatedUnion("operation", [
  z.object({ account_id: z.string().uuid(), provider: z.enum(["dhan", "kite"]), environment: z.enum(["production", "paper", "sandbox"]).default("production"), operation: z.literal("authenticate") }),
  z.object({ account_id: z.string().uuid(), provider: z.enum(["dhan", "kite"]), environment: z.enum(["production", "paper", "sandbox"]).default("production"), operation: z.literal("searchInstruments"), query: z.string().trim().min(1).max(100) }),
  z.object({ account_id: z.string().uuid(), provider: z.enum(["dhan", "kite"]), environment: z.enum(["production", "paper", "sandbox"]).default("production"), operation: z.literal("getQuote"), instrument: InstrumentSchema }),
  z.object({
    account_id: z.string().uuid(),
    provider: z.enum(["dhan", "kite"]),
    environment: z.enum(["production", "paper", "sandbox"]).default("production"),
    operation: z.literal("getHistoricalCandles"),
    instrument: InstrumentSchema,
    interval: z.string().min(1).max(20),
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
]);

const StatusQuerySchema = z.object({
  account_id: z.string().uuid(),
  provider: z.enum(["dhan", "kite"]),
  environment: z.enum(["production", "paper", "sandbox"]).default("production"),
});

function allowedOrigins(): string[] {
  return (process.env.MAIN_TERMINAL_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && allowedOrigins().includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(req: Request, body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { ...corsHeaders(req), "Cache-Control": "no-store" },
  });
}

function errorStatus(error: MarketDataProviderError): number {
  if (error.code === "INVALID_CREDENTIALS") return 401;
  if (error.code === "MISSING_CREDENTIALS" || error.code === "CREDENTIAL_STORAGE_ERROR") return 424;
  if (error.code === "ACCOUNT_NOT_FOUND") return 403;
  if (error.code === "ACCOUNT_INACTIVE") return 403;
  if (error.code === "INVALID_REQUEST" || error.code === "INVALID_INSTRUMENT") return 400;
  if (error.code === "INVALID_PROVIDER_ACCOUNT") return 409;
  return 502;
}

export async function OPTIONS(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().includes(origin)) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(req),
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}

export async function GET(req: Request): Promise<NextResponse> {
  const customer = await getAuthenticatedCustomerFromRequest(req);
  if (!customer) return json(req, { error: { code: "UNAUTHENTICATED", message: "Authentication required." } }, 401);

  const parsed = StatusQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) {
    return json(req, { error: { code: "VALIDATION_ERROR", message: "Invalid request data." } }, 400);
  }

  try {
    await authorizeMarketDataAccount(
      customer.accessToken,
      customer.userId,
      parsed.data.account_id,
      parsed.data.provider
    );
    const status = await getMarketDataCredentialStatus(parsed.data.account_id, parsed.data.provider, parsed.data.environment);
    return json(req, { data: { account_id: parsed.data.account_id, provider: parsed.data.provider, environment: parsed.data.environment, ...status } });
  } catch (error) {
    if (error instanceof MarketDataProviderError) {
      serverLog("warn", "market_data", "status_request_failed", {
        error_code: error.code,
        result: parsed.data.provider,
        accountId: parsed.data.account_id,
      });
      return json(req, { error: { code: error.code, message: error.message } }, errorStatus(error));
    }
    serverLog("error", "market_data", "status_request_failed", {
      error_code: "INTERNAL_ERROR",
      result: parsed.data.provider,
    });
    return json(req, { error: { code: "INTERNAL_ERROR", message: "Market-data status is unavailable." } }, 500);
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const customer = await getAuthenticatedCustomerFromRequest(req);
  if (!customer) return json(req, { error: { code: "UNAUTHENTICATED", message: "Authentication required." } }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: { code: "VALIDATION_ERROR", message: "Invalid request data." } }, 400);
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(req, { error: { code: "VALIDATION_ERROR", message: "Invalid request data." } }, 400);
  }

  const request = parsed.data;
  if ("instrument" in request && request.instrument.provider !== request.provider) {
    return json(req, { error: { code: "INVALID_INSTRUMENT", message: "The requested instrument is invalid or unavailable." } }, 400);
  }

  try {
    await authorizeMarketDataAccount(customer.accessToken, customer.userId, request.account_id, request.provider);
    const provider = await createStoredMarketDataProvider(request.account_id, request.provider, request.environment);
    let data: unknown;
    switch (request.operation) {
      case "authenticate":
        data = await provider.authenticate();
        await recordMarketDataAuthentication(request.account_id, request.provider, request.environment, true, "Authentication successful.");
        break;
      case "searchInstruments":
        data = await provider.searchInstruments(request.query);
        break;
      case "getQuote":
        data = await provider.getQuote(request.instrument as MarketInstrument);
        break;
      case "getHistoricalCandles":
        if (request.fromDate > request.toDate) {
          return json(req, { error: { code: "INVALID_REQUEST", message: "The market-data request is invalid." } }, 400);
        }
        data = await provider.getHistoricalCandles(
          request.instrument as MarketInstrument,
          request.interval,
          request.fromDate,
          request.toDate
        );
        break;
    }
    return json(req, { data });
  } catch (error) {
    if (error instanceof MarketDataProviderError) {
      if (request.operation === "authenticate") {
        try {
          await recordMarketDataAuthentication(request.account_id, request.provider, request.environment, false, error.message);
        } catch {
          // Keep the normalized provider failure as the client-visible result.
        }
      }
      serverLog("warn", "market_data", "provider_request_failed", {
        error_code: error.code,
        result: error.provider,
        accountId: request.account_id,
      });
      return json(req,
        { error: { code: error.code, message: error.message } },
        errorStatus(error)
      );
    }
    serverLog("error", "market_data", "provider_request_failed", {
      error_code: "INTERNAL_ERROR",
      result: request.provider,
    });
    return json(req, { error: { code: "INTERNAL_ERROR", message: "Market data request failed." } }, 500);
  }
}
import { describe, expect, it } from "vitest";
import {
  RealtimeClientMessageSchema,
  RealtimeServerMessageSchema,
} from "../server/brokers/realtime-contract";

const accountId = "11111111-1111-4111-8111-111111111111";
const instrument = {
  providerInstrumentId: "13",
  symbol: "NIFTY",
  exchange: "NSE",
  segment: "IDX_I",
};

describe("persistent market-data WebSocket contract", () => {
  it("requires account/provider/environment on subscriptions", () => {
    expect(RealtimeClientMessageSchema.safeParse({
      type: "subscription",
      action: "subscribe",
      request_id: accountId,
      provider: "dhan",
      environment: "production",
      instruments: [instrument],
    }).success).toBe(false);

    expect(RealtimeClientMessageSchema.safeParse({
      type: "subscription",
      action: "subscribe",
      request_id: accountId,
      account_id: accountId,
      provider: "dhan",
      environment: "production",
      instruments: [instrument],
    }).success).toBe(true);
  });

  it("rejects credentials and broker tokens in client or server messages", () => {
    const connection = {
      type: "connection",
      action: "authenticate",
      ticket: "one-time-test-ticket",
      protocol_version: 1,
    };
    expect(RealtimeClientMessageSchema.safeParse({ ...connection, access_token: "must-not-be-present" }).success).toBe(false);

    const quote = {
      type: "quote",
      provider: "dhan",
      account_id: accountId,
      instrument,
      timestamp: "2026-09-30T00:00:00.000Z",
      ltp: 25000,
      change: 20,
      change_percent: 0.1,
      bid: null,
      ask: null,
      volume: 10,
    };
    expect(RealtimeServerMessageSchema.safeParse({ ...quote, credentials: { access_token: "must-not-be-present" } }).success).toBe(false);
    expect(JSON.stringify(RealtimeServerMessageSchema.parse(quote))).not.toContain("access_token");
  });

  it("defines connection, subscription, quote, index, error, heartbeat, and disconnect messages", () => {
    const messages = [
      { type: "connection", status: "ready" },
      { type: "subscription", status: "subscribed", request_id: accountId, account_id: accountId, provider: "dhan", environment: "production", instruments: [instrument] },
      { type: "quote", provider: "dhan", account_id: accountId, instrument, timestamp: "2026-09-30T00:00:00.000Z", ltp: 25000, change: null, change_percent: null, bid: null, ask: null, volume: null },
      { type: "index", provider: "dhan", account_id: accountId, instrument, timestamp: "2026-09-30T00:00:00.000Z", ltp: 25000, change: null, change_percent: null, bid: null, ask: null, volume: null },
      { type: "error", code: "PROVIDER_UNAVAILABLE", message: "Provider unavailable.", retryable: true },
      { type: "heartbeat", timestamp: "2026-09-30T00:00:00.000Z" },
      { type: "disconnect", code: "PROVIDER_DISCONNECTED", message: "Provider disconnected.", will_retry: true },
    ];
    for (const message of messages) expect(RealtimeServerMessageSchema.safeParse(message).success).toBe(true);
  });
});
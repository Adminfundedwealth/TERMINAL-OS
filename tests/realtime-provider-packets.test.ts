import { describe, expect, it } from "vitest";
import { parseDhanPacket, parseKitePackets, toRealtimeMarketEvent } from "../server/realtime/provider-packets";
import type { RealtimeTicketClaims } from "../server/brokers/realtime-ticket";

const claims: RealtimeTicketClaims = {
  iss: "terminal-os",
  sub: "11111111-1111-4111-8111-111111111111",
  account_id: "22222222-2222-4222-8222-222222222222",
  provider: "dhan",
  environment: "paper",
  jti: "33333333-3333-4333-8333-333333333333",
  iat: 1_790_884_800,
  exp: 1_790_884_890,
};
const instrument = { providerInstrumentId: "13", symbol: "NIFTY", exchange: "NSE", segment: "IDX_I" };

function dhanTicker(): Uint8Array {
  const bytes = new Uint8Array(16);
  const view = new DataView(bytes.buffer);
  view.setUint8(0, 2);
  view.setUint8(3, 0);
  view.setUint32(4, 13, true);
  view.setInt32(8, 2_500_000, true);
  view.setUint32(12, claims.iat, true);
  return bytes;
}

function kiteQuote(): Uint8Array {
  const bytes = new Uint8Array(68);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 1, false);
  view.setUint16(2, 64, false);
  view.setUint32(4, 13, false);
  view.setUint32(8, 2_500_000, false);
  view.setUint32(44, claims.iat, false);
  view.setUint32(64, claims.iat, false);
  return bytes;
}

describe("provider packet normalization", () => {
  it("parses Dhan binary ticker packets using provider timestamps", () => {
    const parsed = parseDhanPacket(dhanTicker());
    expect(parsed).toMatchObject({ providerInstrumentId: "13", segment: "IDX_I", ltp: 25000 });
    expect(Date.parse(parsed!.timestamp)).toBe(claims.iat * 1000);
    expect(toRealtimeMarketEvent("dhan", claims, instrument, parsed!)?.type).toBe("index");
  });

  it("parses Kite length-prefixed packets without inventing a timestamp", () => {
    const parsed = parseKitePackets(kiteQuote());
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ providerInstrumentId: "13", ltp: 25000 });
    expect(Date.parse(parsed[0].timestamp)).toBe(claims.iat * 1000);
  });

  it("rejects malformed packets, stale/mismatched instruments, and invalid timestamps", () => {
    expect(parseDhanPacket(new Uint8Array(8))).toBeNull();
    expect(parseDhanPacket(new Uint8Array(15))).toBeNull();
    expect(parseKitePackets(new Uint8Array([0, 1, 0, 64]))).toEqual([]);
    const parsed = parseDhanPacket(dhanTicker())!;
    expect(toRealtimeMarketEvent("dhan", claims, { ...instrument, providerInstrumentId: "25" }, parsed)).toBeNull();
    expect(toRealtimeMarketEvent("dhan", claims, instrument, { ...parsed, timestamp: "invalid" })).toBeNull();
  });
});
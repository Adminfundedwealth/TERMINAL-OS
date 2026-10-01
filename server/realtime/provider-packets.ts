import type { RealtimeServerMessage } from "../brokers/realtime-contract";
import type { RealtimeTicketClaims } from "../brokers/realtime-ticket";
import type { ProviderSubscription } from "./provider";

export interface ParsedProviderQuote {
  providerInstrumentId: string;
  segment?: string;
  timestamp: string;
  ltp: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  oi?: number;
  change?: number;
  changePercent?: number;
}

const DHAN_SEGMENTS: Record<number, string> = {
  0: "IDX_I", 1: "NSE_EQ", 2: "NSE_FNO", 3: "NSE_CUR", 4: "BSE_EQ",
  5: "MCX_COMM", 7: "BSE_CUR", 8: "BSE_FNO",
};

function viewOf(input: Uint8Array): DataView {
  return new DataView(input.buffer, input.byteOffset, input.byteLength);
}

function providerTimestamp(seconds: number): string | undefined {
  if (!Number.isSafeInteger(seconds) || seconds <= 0) return undefined;
  const milliseconds = seconds * 1000;
  if (!Number.isFinite(milliseconds)) return undefined;
  return new Date(milliseconds).toISOString();
}

export function parseDhanPacket(input: Uint8Array): ParsedProviderQuote | null {
  if (input.byteLength < 8) return null;
  const view = viewOf(input);
  const responseCode = view.getUint8(0);
  const segment = DHAN_SEGMENTS[view.getUint8(3)];
  const providerInstrumentId = String(view.getUint32(4, true));
  if (!segment) return null;

  if (responseCode === 2) {
    if (input.byteLength < 16) return null;
    const timestamp = providerTimestamp(view.getUint32(12, true));
    const ltp = view.getInt32(8, true) / 100;
    return timestamp && Number.isFinite(ltp) && ltp > 0 ? { providerInstrumentId, segment, timestamp, ltp } : null;
  }

  if (responseCode === 4 || responseCode === 8) {
    if (input.byteLength < (responseCode === 4 ? 50 : 62)) return null;
    const timestamp = providerTimestamp(view.getUint32(14, true));
    const ltp = view.getInt32(8, true) / 100;
    if (!timestamp || !Number.isFinite(ltp) || ltp <= 0) return null;
    const close = view.getInt32(38, true) / 100;
    const change = Number.isFinite(close) ? ltp - close : undefined;
    return {
      providerInstrumentId,
      segment,
      timestamp,
      ltp,
      volume: view.getUint32(22, true),
      open: view.getInt32(34, true) / 100,
      close,
      high: view.getInt32(42, true) / 100,
      low: view.getInt32(46, true) / 100,
      ...(change === undefined ? {} : { change, changePercent: close ? (change / close) * 100 : undefined }),
      ...(responseCode === 8 ? { oi: view.getUint32(50, true) } : {}),
    };
  }
  return null;
}

export function parseKitePackets(input: Uint8Array): ParsedProviderQuote[] {
  if (input.byteLength < 2) return [];
  const view = viewOf(input);
  const packetCount = view.getUint16(0, false);
  const packets: ParsedProviderQuote[] = [];
  let offset = 2;

  for (let index = 0; index < packetCount; index += 1) {
    if (offset + 2 > input.byteLength) return [];
    const packetLength = view.getUint16(offset, false);
    offset += 2;
    if (packetLength < 8 || offset + packetLength > input.byteLength) return [];
    const packet = new DataView(input.buffer, input.byteOffset + offset, packetLength);
    const providerInstrumentId = String(packet.getUint32(0, false));
    const ltp = packet.getUint32(4, false) / 100;
    if (Number.isFinite(ltp) && ltp > 0) {
      const timestampSeconds = packetLength >= 64 ? packet.getUint32(60, false) : packetLength >= 48 ? packet.getUint32(44, false) : 0;
      const timestamp = providerTimestamp(timestampSeconds);
      if (timestamp) {
        const close = packetLength >= 44 ? packet.getUint32(40, false) / 100 : undefined;
        const change = close === undefined ? undefined : ltp - close;
        packets.push({
          providerInstrumentId,
          timestamp,
          ltp,
          ...(packetLength >= 44 ? {
            volume: packet.getUint32(16, false),
            open: packet.getUint32(28, false) / 100,
            high: packet.getUint32(32, false) / 100,
            low: packet.getUint32(36, false) / 100,
            close,
            change,
            changePercent: close ? (change! / close) * 100 : undefined,
          } : {}),
          ...(packetLength >= 52 ? { oi: packet.getUint32(48, false) } : {}),
        });
      }
    }
    offset += packetLength;
  }
  return offset === input.byteLength ? packets : [];
}

export function toRealtimeMarketEvent(
  provider: "dhan" | "kite",
  claims: RealtimeTicketClaims,
  instrument: ProviderSubscription,
  packet: ParsedProviderQuote,
): RealtimeServerMessage | null {
  if (packet.providerInstrumentId !== instrument.providerInstrumentId ||
    (packet.segment && packet.segment !== instrument.segment) ||
    !Number.isFinite(packet.ltp) || packet.ltp <= 0 || !Number.isFinite(Date.parse(packet.timestamp))) return null;

  return {
    type: instrument.segment === "IDX_I" ? "index" : "quote",
    provider,
    account_id: claims.account_id,
    instrument,
    timestamp: new Date(packet.timestamp).toISOString(),
    ltp: packet.ltp,
    change: packet.change ?? null,
    change_percent: packet.changePercent ?? null,
    bid: null,
    ask: null,
    volume: packet.volume ?? null,
  };
}
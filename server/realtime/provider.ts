import { WebSocket } from "ws";
import type { RealtimeTicketClaims } from "../brokers/realtime-ticket";
import type { RealtimeServerMessage } from "../brokers/realtime-contract";
import { parseDhanPacket, toRealtimeMarketEvent } from "./provider-packets";

export type AuthorizedRealtimeScope = RealtimeTicketClaims & { authorizedAt: number };

export interface ProviderSubscription {
  providerInstrumentId: string;
  symbol: string;
  exchange: string;
  segment: string;
}

export interface RealtimeProvider {
  validateInstrument(instrument: ProviderSubscription): boolean;
  subscribe(scope: AuthorizedRealtimeScope, instrument: ProviderSubscription, credentials: Record<string, string>, emit: (event: RealtimeServerMessage) => void): Promise<() => void>;
}

export interface ProviderRegistry {
  get(provider: "dhan" | "kite", environment: "production" | "paper" | "sandbox"): RealtimeProvider;
}

type DhanSubscriber = {
  claims: RealtimeTicketClaims;
  instrument: ProviderSubscription;
  emit: (event: RealtimeServerMessage) => void;
};

type DhanFeed = {
  clientId: string;
  accessToken: string;
  socket: WebSocket | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  reconnectDelayMs: number;
  subscribers: Map<string, Set<DhanSubscriber>>;
};

const DHAN_SEGMENTS = new Set(["IDX_I", "NSE_EQ", "NSE_FNO", "NSE_CUR", "BSE_EQ", "MCX_COMM", "BSE_CUR", "BSE_FNO"]);

function subscriptionKey(instrument: ProviderSubscription): string {
  return `${instrument.segment}:${instrument.providerInstrumentId}`;
}

function providerBytes(data: Buffer | ArrayBuffer | Buffer[]): Uint8Array {
  if (Buffer.isBuffer(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  const buffer = Buffer.concat(data);
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

function dhanCredentials(credentials: Record<string, string>): { clientId: string; accessToken: string } {
  const clientId = credentials.client_id?.trim() || credentials.clientId?.trim() || "";
  const accessToken = credentials.access_token?.trim() || credentials.accessToken?.trim() || "";
  if (!clientId || !accessToken) throw new Error("Dhan realtime credentials are unavailable.");
  return { clientId, accessToken };
}

export class DhanRealtimeProvider implements RealtimeProvider {
  private readonly feeds = new Map<string, DhanFeed>();

  constructor(private readonly createSocket: (url: string) => WebSocket = (url) => new WebSocket(url)) {}

  validateInstrument(instrument: ProviderSubscription): boolean {
    return /^\d+$/.test(instrument.providerInstrumentId) &&
      Number(instrument.providerInstrumentId) > 0 &&
      DHAN_SEGMENTS.has(instrument.segment) &&
      Boolean(instrument.symbol.trim() && instrument.exchange.trim());
  }

  async subscribe(
    scope: AuthorizedRealtimeScope,
    instrument: ProviderSubscription,
    credentials: Record<string, string>,
    emit: (event: RealtimeServerMessage) => void,
  ): Promise<() => void> {
    const { clientId, accessToken } = dhanCredentials(credentials);
    const feedKey = `${scope.account_id}:${scope.environment}`;
    let feed = this.feeds.get(feedKey);
    if (feed && (feed.clientId !== clientId || feed.accessToken !== accessToken)) {
      this.closeFeed(feedKey, feed);
      feed = undefined;
    }
    if (!feed) {
      feed = { clientId, accessToken, socket: null, reconnectTimer: null, reconnectDelayMs: 1000, subscribers: new Map() };
      this.feeds.set(feedKey, feed);
    }

    const key = subscriptionKey(instrument);
    const subscribers = feed.subscribers.get(key) ?? new Set<DhanSubscriber>();
    const wasEmpty = subscribers.size === 0;
    subscribers.add({ claims: scope, instrument, emit });
    feed.subscribers.set(key, subscribers);
    if (wasEmpty && feed.socket?.readyState === WebSocket.OPEN) {
      this.sendSubscription(feed.socket, "subscribe", [instrument]);
    }
    if (!feed.socket || feed.socket.readyState === WebSocket.CLOSED) this.connect(feedKey, feed);

    return () => {
      const current = feed!.subscribers.get(key);
      if (!current) return;
      for (const subscriber of current) {
        if (subscriber.emit === emit) current.delete(subscriber);
      }
      if (current.size === 0) {
        feed!.subscribers.delete(key);
        if (feed!.socket?.readyState === WebSocket.OPEN) this.sendSubscription(feed!.socket, "unsubscribe", [instrument]);
      }
      if (feed!.subscribers.size === 0) this.closeFeed(feedKey, feed!);
    };
  }

  private connect(feedKey: string, feed: DhanFeed): void {
    if (feed.socket && (feed.socket.readyState === WebSocket.OPEN || feed.socket.readyState === WebSocket.CONNECTING)) return;
    const query = new URLSearchParams({
      version: "2",
      token: feed.accessToken,
      clientId: feed.clientId,
      authType: "2",
    });
    const socket = this.createSocket(`wss://api-feed.dhan.co?${query.toString()}`);
    feed.socket = socket;
    socket.on("open", () => {
      if (feed.socket !== socket) return;
      feed.reconnectDelayMs = 1000;
      const instruments = [...feed.subscribers.values()].flatMap((items) => [...items].slice(0, 1).map((item) => item.instrument));
      if (instruments.length > 0) this.sendSubscription(socket, "subscribe", instruments);
    });
    socket.on("message", (raw, isBinary) => {
      if (!isBinary || feed.socket !== socket) return;
      const packet = parseDhanPacket(providerBytes(raw as Buffer | ArrayBuffer | Buffer[]));
      if (!packet) return;
      for (const subscriber of feed.subscribers.get(`${packet.segment}:${packet.providerInstrumentId}`) ?? []) {
        const event = toRealtimeMarketEvent("dhan", subscriber.claims, subscriber.instrument, packet);
        if (event) subscriber.emit(event);
      }
    });
    socket.on("close", () => {
      if (feed.socket !== socket) return;
      feed.socket = null;
      this.scheduleReconnect(feedKey, feed);
    });
    socket.on("error", () => {
      if (feed.socket === socket && socket.readyState !== WebSocket.CLOSED) socket.close();
    });
  }

  private sendSubscription(
    socket: WebSocket,
    action: "subscribe" | "unsubscribe",
    instruments: ProviderSubscription[],
  ): void {
    socket.send(JSON.stringify({
      RequestCode: action === "subscribe" ? 21 : 22,
      InstrumentCount: instruments.length,
      InstrumentList: instruments.map((instrument) => ({
        ExchangeSegment: instrument.segment,
        SecurityId: instrument.providerInstrumentId,
      })),
    }));
  }

  private scheduleReconnect(feedKey: string, feed: DhanFeed): void {
    if (feed.subscribers.size === 0 || feed.reconnectTimer) return;
    const delay = feed.reconnectDelayMs;
    feed.reconnectDelayMs = Math.min(feed.reconnectDelayMs * 2, 30_000);
    feed.reconnectTimer = setTimeout(() => {
      feed.reconnectTimer = null;
      if (this.feeds.get(feedKey) === feed && feed.subscribers.size > 0) this.connect(feedKey, feed);
    }, delay);
    feed.reconnectTimer.unref?.();
  }

  private closeFeed(feedKey: string, feed: DhanFeed): void {
    if (this.feeds.get(feedKey) !== feed) return;
    this.feeds.delete(feedKey);
    if (feed.reconnectTimer) clearTimeout(feed.reconnectTimer);
    feed.reconnectTimer = null;
    const socket = feed.socket;
    feed.socket = null;
    if (socket && socket.readyState !== WebSocket.CLOSED) socket.close();
    feed.subscribers.clear();
  }
}

class UnavailableRealtimeProvider implements RealtimeProvider {
  validateInstrument(instrument: ProviderSubscription): boolean {
    return /^\d+$/.test(instrument.providerInstrumentId) && Boolean(instrument.symbol.trim() && instrument.exchange.trim() && instrument.segment.trim());
  }

  async subscribe(): Promise<() => void> {
    throw new Error("Kite realtime is not implemented.");
  }
}

export class ProductionProviderRegistry implements ProviderRegistry {
  private readonly dhan = new DhanRealtimeProvider();
  private readonly unavailable = new UnavailableRealtimeProvider();

  get(provider: "dhan" | "kite"): RealtimeProvider {
    return provider === "dhan" ? this.dhan : this.unavailable;
  }
}

export class MockRealtimeProvider implements RealtimeProvider {
  validateInstrument(instrument: ProviderSubscription): boolean {
    return /^\d+$/.test(instrument.providerInstrumentId) && Boolean(instrument.symbol.trim() && instrument.exchange.trim() && instrument.segment.trim());
  }

  async subscribe(scope: AuthorizedRealtimeScope, instrument: ProviderSubscription, _credentials: Record<string, string>, emit: (event: RealtimeServerMessage) => void): Promise<() => void> {
    const timer = setInterval(() => {
      emit({
        type: instrument.segment === "IDX_I" ? "index" : "quote",
        provider: scope.provider,
        account_id: scope.account_id,
        instrument,
        timestamp: new Date().toISOString(),
        ltp: 100,
        change: 0,
        change_percent: 0,
        bid: null,
        ask: null,
        volume: 0,
      });
    }, 1000);
    return () => clearInterval(timer);
  }
}

export class MockProviderRegistry implements ProviderRegistry {
  private readonly provider = new MockRealtimeProvider();
  get(): RealtimeProvider { return this.provider; }
}
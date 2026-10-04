import { randomUUID } from "node:crypto";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import {
  RealtimeClientMessageSchema,
  RealtimeServerMessageSchema,
  type RealtimeClientMessage,
  type RealtimeServerMessage,
} from "../brokers/realtime-contract";
import { verifyRealtimeTicket, type RealtimeTicketClaims } from "../brokers/realtime-ticket";
import type { OneTimeTicketStore } from "./ticket-store";
import type { ProviderRegistry, ProviderSubscription } from "./provider";

export interface GatewayOptions {
  ticketSecret: string;
  ticketStore: OneTimeTicketStore;
  providers: ProviderRegistry;
  reauthorize: (claims: RealtimeTicketClaims) => Promise<boolean | { authorized: boolean; credentials?: Record<string, string> }>;
  heartbeatIntervalMs?: number;
  staleAfterMs?: number;
  now?: () => number;
}

type Session = { claims?: RealtimeTicketClaims; credentials: Record<string, string>; lastPong: number; cleanups: Map<string, () => void> };
const MAX_MESSAGE_BYTES = 64 * 1024;

function rawDataToString(data: RawData): string {
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");
  if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data)).toString("utf8");
  return data.toString("utf8");
}

function safeSend(socket: WebSocket, message: RealtimeServerMessage): void {
  const parsed = RealtimeServerMessageSchema.parse(message);
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(parsed));
}

export function isValidInstrument(instrument: ProviderSubscription): boolean {
  return Boolean(instrument.providerInstrumentId.trim() && instrument.symbol.trim() && instrument.exchange.trim() &&
    instrument.segment.trim() && instrument.providerInstrumentId.length <= 64 && instrument.symbol.length <= 64 &&
    instrument.exchange.length <= 16 && instrument.segment.length <= 24);
}

export function createRealtimeGateway(options: GatewayOptions): { wss: WebSocketServer; close(): Promise<void> } {
  const now = options.now ?? Date.now;
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? 15_000;
  const staleAfterMs = options.staleAfterMs ?? 45_000;
  const sessions = new Map<WebSocket, Session>();
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });
  const heartbeat = setInterval(() => {
    for (const [socket, session] of sessions) {
      if (session.claims && session.claims.exp <= Math.floor(now() / 1000)) {
        safeSend(socket, { type: "disconnect", code: "AUTH_EXPIRED", message: "Realtime ticket expired.", will_retry: true });
        socket.close(4003, "Ticket expired");
        continue;
      }
      if (now() - session.lastPong > staleAfterMs) {
        safeSend(socket, { type: "disconnect", code: "NORMAL", message: "Heartbeat timeout.", will_retry: true });
        socket.terminate();
      } else if (socket.readyState === WebSocket.OPEN) {
        safeSend(socket, { type: "heartbeat", timestamp: new Date(now()).toISOString() });
        socket.ping();
      }
    }
  }, heartbeatIntervalMs);
  heartbeat.unref?.();

  wss.on("connection", (socket: WebSocket) => {
    const session: Session = { credentials: {}, lastPong: now(), cleanups: new Map() };
    sessions.set(socket, session);
    const cleanup = () => {
      for (const unsubscribe of session.cleanups.values()) unsubscribe();
      session.cleanups.clear();
      sessions.delete(socket);
    };

    socket.on("message", async (raw: RawData) => {
      let message: RealtimeClientMessage;
      try {
        message = RealtimeClientMessageSchema.parse(JSON.parse(rawDataToString(raw)));
      } catch {
        safeSend(socket, { type: "error", code: "INVALID_INSTRUMENT", message: "Invalid realtime message.", retryable: false });
        return;
      }

      if (message.type === "connection") {
        if (session.claims) {
          safeSend(socket, { type: "connection", status: "rejected", message: "Connection is already authenticated." });
          socket.close(4001, "Already authenticated");
          return;
        }
        try {
          const claims = verifyRealtimeTicket(message.ticket, options.ticketSecret, { now: now() });
          const consumed = await options.ticketStore.consume(claims.jti, claims.exp, Math.floor(now() / 1000));
          const authorization = consumed ? await options.reauthorize(claims) : false;
          const authorized = typeof authorization === "boolean" ? authorization : authorization.authorized;
          if (!authorized) throw new Error("Ticket rejected.");
          session.credentials = typeof authorization === "boolean" ? {} : authorization.credentials ?? {};
          session.claims = claims;
          session.lastPong = now();
          safeSend(socket, { type: "connection", status: "ready", connection_id: randomUUID() });
        } catch {
          safeSend(socket, { type: "connection", status: "rejected", message: "Realtime authentication failed." });
          socket.close(4003, "Authentication failed");
        }
        return;
      }

      const claims = session.claims;
      if (!claims) {
        safeSend(socket, { type: "error", code: "UNAUTHENTICATED", message: "Authenticate before subscribing.", retryable: false });
        socket.close(4003, "Unauthenticated");
        return;
      }
      if (message.account_id !== claims.account_id || message.provider !== claims.provider || message.environment !== claims.environment) {
        safeSend(socket, { type: "error", code: "ACCOUNT_FORBIDDEN", message: "Subscription is outside the ticket scope.", request_id: message.request_id, retryable: false });
        return;
      }
      const authorization = await options.reauthorize(claims);
      const authorized = typeof authorization === "boolean" ? authorization : authorization.authorized;
      if (!authorized) {
        safeSend(socket, { type: "error", code: "ACCOUNT_FORBIDDEN", message: "Account authorization is no longer valid.", request_id: message.request_id, retryable: false });
        safeSend(socket, { type: "disconnect", code: "ACCOUNT_REVOKED", message: "Account authorization revoked.", will_retry: false });
        socket.close(4003, "Account revoked");
        return;
      }

      const provider = options.providers.get(message.provider, message.environment);
      for (const instrument of message.instruments) {
        const key = `${message.provider}:${instrument.segment}:${instrument.providerInstrumentId}`;
        if (message.action === "unsubscribe") {
          session.cleanups.get(key)?.();
          session.cleanups.delete(key);
          continue;
        }
        if (typeof authorization !== "boolean") session.credentials = authorization.credentials ?? {};
        if (session.cleanups.has(key)) continue;
        if (!isValidInstrument(instrument) || !provider.validateInstrument(instrument)) {
          safeSend(socket, { type: "error", code: "INVALID_INSTRUMENT", message: "Instrument is invalid.", request_id: message.request_id, retryable: false });
          continue;
        }
        try {
          const unsubscribe = await provider.subscribe({ ...claims, authorizedAt: now() }, instrument, session.credentials, (event) => {
            if ((event.type === "quote" || event.type === "index") &&
              event.account_id === claims.account_id && event.provider === claims.provider) safeSend(socket, event);
          });
          session.cleanups.set(key, unsubscribe);
        } catch {
          safeSend(socket, { type: "error", code: "PROVIDER_UNAVAILABLE", message: "Provider stream unavailable.", request_id: message.request_id, retryable: true });
        }
      }
      safeSend(socket, {
        type: "subscription", status: message.action === "subscribe" ? "subscribed" : "unsubscribed",
        request_id: message.request_id, account_id: claims.account_id, provider: claims.provider,
        environment: claims.environment, instruments: message.instruments,
      });
    });

    socket.on("pong", () => { session.lastPong = now(); });
    socket.on("close", cleanup);
    socket.on("error", cleanup);
  });

  return {
    wss,
    async close() {
      clearInterval(heartbeat);
      for (const socket of sessions.keys()) socket.close(1001, "Server shutdown");
      await new Promise<void>((resolve, reject) => wss.close((error?: Error) => error ? reject(error) : resolve()));
    },
  };
}
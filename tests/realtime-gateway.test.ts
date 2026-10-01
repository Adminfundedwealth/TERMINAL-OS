import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";
import { issueRealtimeTicket } from "../server/brokers/realtime-ticket";
import { createRealtimeGateway } from "../server/realtime/gateway";
import type { ProviderRegistry, RealtimeProvider } from "../server/realtime/provider";
import { MemoryTicketStore } from "../server/realtime/ticket-store";

const secret = "local-test-secret-that-is-long-enough-for-hmac";
const scope = {
  sub: "11111111-1111-4111-8111-111111111111",
  account_id: "22222222-2222-4222-8222-222222222222",
  provider: "dhan" as const,
  environment: "paper" as const,
};
const subscriptionScope = {
  account_id: scope.account_id,
  provider: scope.provider,
  environment: scope.environment,
};
const instrument = { providerInstrumentId: "13", symbol: "NIFTY", exchange: "NSE", segment: "IDX_I" };

function waitForMessage(socket: WebSocket, predicate: (message: any) => boolean): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for WebSocket message.")), 2000);
    const onMessage = (raw: Buffer) => {
      const message = JSON.parse(raw.toString());
      if (!predicate(message)) return;
      clearTimeout(timeout);
      socket.off("message", onMessage);
      resolve(message);
    };
    socket.on("message", onMessage);
  });
}

describe("persistent realtime gateway", () => {
  let server: ReturnType<typeof createServer> | undefined;
  let gateway: ReturnType<typeof createRealtimeGateway> | undefined;
  let sockets: WebSocket[] = [];

  afterEach(async () => {
    for (const socket of sockets) socket.terminate();
    sockets = [];
    if (gateway) await gateway.close();
    gateway = undefined;
    if (server?.listening) await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
  });

  async function setup(reauthorize = vi.fn(async () => ({ authorized: true, credentials: { access_token: "server-only" } }))) {
    let resolveUnsubscribe!: () => void;
    const unsubscribeDone = new Promise<void>((resolve) => { resolveUnsubscribe = resolve; });
    const unsubscribe = vi.fn(() => resolveUnsubscribe());
    const provider: RealtimeProvider = {
      validateInstrument: (candidate) => candidate.providerInstrumentId === "13" && candidate.segment === "IDX_I",
      subscribe: async (authorizedScope, requestedInstrument, credentials, emit) => {
        expect(credentials).toEqual({ access_token: "server-only" });
        emit({
          type: "index",
          provider: authorizedScope.provider,
          account_id: authorizedScope.account_id,
          instrument: requestedInstrument,
          timestamp: "2026-10-01T10:00:00.000Z",
          ltp: 25000,
          change: null,
          change_percent: null,
          bid: null,
          ask: null,
          volume: null,
        });
        return unsubscribe;
      },
    };
    const providers: ProviderRegistry = { get: () => provider };
    gateway = createRealtimeGateway({ ticketSecret: secret, ticketStore: new MemoryTicketStore(), providers, reauthorize, heartbeatIntervalMs: 40, staleAfterMs: 1000 });
    server = createServer();
    server.on("upgrade", (request, socket, head) => gateway!.wss.handleUpgrade(request, socket, head, (websocket) => gateway!.wss.emit("connection", websocket, request)));
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind.");
    const connect = async () => {
      const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws`);
      sockets.push(socket);
      await new Promise<void>((resolve, reject) => {
        socket.once("open", resolve);
        socket.once("error", reject);
      });
      return socket;
    };
    return { connect, unsubscribe, unsubscribeDone, reauthorize };
  }

  async function authenticate(socket: WebSocket, ticket = issueRealtimeTicket(scope, secret).ticket) {
    const ready = waitForMessage(socket, (message) => message.type === "connection");
    socket.send(JSON.stringify({ type: "connection", action: "authenticate", ticket, protocol_version: 1 }));
    return ready;
  }

  it("authenticates once, authorizes a scoped subscription, streams normalized events, and heartbeats", async () => {
    const { connect, reauthorize } = await setup();
    const socket = await connect();
    expect((await authenticate(socket)).status).toBe("ready");
    expect(reauthorize).toHaveBeenCalledTimes(1);

    const quote = waitForMessage(socket, (message) => message.type === "index");
    const ack = waitForMessage(socket, (message) => message.type === "subscription");
    const heartbeat = waitForMessage(socket, (message) => message.type === "heartbeat");
    socket.send(JSON.stringify({
      type: "subscription", action: "subscribe", request_id: "33333333-3333-4333-8333-333333333333",
      ...subscriptionScope, instruments: [instrument],
    }));
    expect((await quote).ltp).toBe(25000);
    expect((await ack).status).toBe("subscribed");
    expect(JSON.stringify(await heartbeat)).not.toMatch(/credential|access_token/i);
    expect(reauthorize).toHaveBeenCalledTimes(2);
  });

  it("rejects replayed tickets and subscriptions outside the ticket account scope", async () => {
    const { connect } = await setup();
    const ticket = issueRealtimeTicket(scope, secret).ticket;
    const first = await connect();
    expect((await authenticate(first, ticket)).status).toBe("ready");

    const second = await connect();
    expect((await authenticate(second, ticket)).status).toBe("rejected");

    const error = waitForMessage(first, (message) => message.type === "error");
    first.send(JSON.stringify({
      type: "subscription", action: "subscribe", request_id: "33333333-3333-4333-8333-333333333333",
      ...subscriptionScope, account_id: "44444444-4444-4444-8444-444444444444", instruments: [instrument],
    }));
    expect((await error).code).toBe("ACCOUNT_FORBIDDEN");
  });

  it("rejects invalid provider instruments and tears down provider subscriptions", async () => {
    const { connect, unsubscribe, unsubscribeDone } = await setup();
    const socket = await connect();
    await authenticate(socket);

    const invalid = waitForMessage(socket, (message) => message.type === "error");
    socket.send(JSON.stringify({
      type: "subscription", action: "subscribe", request_id: "33333333-3333-4333-8333-333333333333",
      ...subscriptionScope, instruments: [{ ...instrument, providerInstrumentId: "999" }],
    }));
    expect((await invalid).code).toBe("INVALID_INSTRUMENT");

    const ack = waitForMessage(socket, (message) => message.type === "subscription");
    socket.send(JSON.stringify({
      type: "subscription", action: "subscribe", request_id: "33333333-3333-4333-8333-333333333334",
      ...subscriptionScope, instruments: [instrument],
    }));
    await ack;
    const closed = new Promise<void>((resolve) => socket.once("close", () => resolve()));
    socket.close();
    await closed;
    await unsubscribeDone;
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("closes a connection when account authorization is revoked", async () => {
    const reauthorize = vi.fn().mockResolvedValueOnce({ authorized: true, credentials: {} }).mockResolvedValueOnce({ authorized: false });
    const { connect } = await setup(reauthorize);
    const socket = await connect();
    await authenticate(socket);
    const revoked = waitForMessage(socket, (message) => message.type === "disconnect");
    socket.send(JSON.stringify({
      type: "subscription", action: "subscribe", request_id: "33333333-3333-4333-8333-333333333333",
      ...subscriptionScope, instruments: [instrument],
    }));
    expect((await revoked).code).toBe("ACCOUNT_REVOKED");
  });
});
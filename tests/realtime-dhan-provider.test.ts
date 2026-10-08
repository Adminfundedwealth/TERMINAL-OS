import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocket, WebSocketServer } from "ws";
import type { RealtimeTicketClaims } from "../server/brokers/realtime-ticket";
import { DhanRealtimeProvider } from "../server/realtime/provider";
import type { RealtimeServerMessage } from "../server/brokers/realtime-contract";

const claims: RealtimeTicketClaims = {
  iss: "terminal-os",
  sub: "11111111-1111-4111-8111-111111111111",
  account_id: "22222222-2222-4222-8222-222222222222",
  provider: "dhan",
  environment: "production",
  jti: "33333333-3333-4333-8333-333333333333",
  iat: 1_790_884_800,
  exp: 1_790_884_890,
};
const instrument = { providerInstrumentId: "13", symbol: "NIFTY", exchange: "NSE", segment: "IDX_I" };

function dhanTicker(): Buffer {
  const bytes = Buffer.alloc(16);
  bytes.writeUInt8(2, 0);
  bytes.writeUInt8(0, 3);
  bytes.writeUInt32LE(13, 4);
  bytes.writeInt32LE(2_500_000, 8);
  bytes.writeUInt32LE(Math.floor(Date.now() / 1000), 12);
  return bytes;
}

function waitForMessage<T>(messages: T[], predicate: (message: T) => boolean): Promise<T> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 2000;
    const check = () => {
      const message = messages.find(predicate);
      if (message) {
        resolve(message);
      } else if (Date.now() >= deadline) {
        reject(new Error("Timed out waiting for realtime message."));
      } else {
        setTimeout(check, 10);
      }
    };
    check();
  });
}

describe("Dhan realtime provider", () => {
  let server: ReturnType<typeof createServer> | undefined;
  let upstream: WebSocketServer | undefined;
  let client: WebSocket | undefined;

  afterEach(async () => {
    client?.terminate();
    client = undefined;
    if (upstream) await new Promise<void>((resolve) => upstream!.close(() => resolve()));
    upstream = undefined;
    if (server?.listening) await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
  });

  it("connects using server credentials, subscribes, normalizes real provider packets, and unsubscribes", async () => {
    const received: Array<Record<string, unknown>> = [];
    const events: RealtimeServerMessage[] = [];
    let upstreamQuery: URLSearchParams | undefined;
    server = createServer();
    upstream = new WebSocketServer({ noServer: true });
    server.on("upgrade", (request, socket, head) => upstream!.handleUpgrade(request, socket, head, (ws) => upstream!.emit("connection", ws, request)));
    upstream.on("connection", (socket, request) => {
      client = socket;
      upstreamQuery = new URL(request.url ?? "/", "http://localhost").searchParams;
      socket.on("message", (raw) => {
        received.push(JSON.parse(raw.toString()) as Record<string, unknown>);
      });
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind.");

    const provider = new DhanRealtimeProvider((url) =>
      new WebSocket(url.replace(/^wss:\/\/api-feed\.dhan\.co/, `ws://127.0.0.1:${address.port}`))
    );
    const unsubscribe = await provider.subscribe(
      { ...claims, authorizedAt: Date.now() },
      instrument,
      { client_id: "server-client", access_token: "server-token" },
      (event) => events.push(event),
    );

    await waitForMessage(received, () => received.length > 0);
    expect(upstreamQuery?.get("version")).toBe("2");
    expect(upstreamQuery?.get("clientId")).toBe("server-client");
    expect(upstreamQuery?.get("token")).toBe("server-token");
    const subscribeMessage = await waitForMessage(received, (message) => message.RequestCode === 21);
    expect(subscribeMessage).toMatchObject({
      InstrumentCount: 1,
      InstrumentList: [{ ExchangeSegment: "IDX_I", SecurityId: "13" }],
    });
    client!.send(dhanTicker());
    const quote = await waitForMessage(events, (event) => event.type === "index");
    expect(quote).toMatchObject({
      provider: "dhan",
      account_id: claims.account_id,
      instrument,
      ltp: 25_000,
    });

    unsubscribe();
    expect(await waitForMessage(received, (message) => message.RequestCode === 22)).toMatchObject({ InstrumentCount: 1 });
  });

  it("rejects missing credentials and unsupported instrument segments", async () => {
    const provider = new DhanRealtimeProvider();
    expect(provider.validateInstrument({ ...instrument, segment: "UNKNOWN" })).toBe(false);
    await expect(provider.subscribe(
      { ...claims, authorizedAt: Date.now() },
      instrument,
      {},
      () => undefined,
    )).rejects.toThrow("Dhan realtime credentials are unavailable.");
  });
});

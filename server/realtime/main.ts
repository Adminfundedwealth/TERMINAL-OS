import { createServer } from "node:http";
import { createClient } from "redis";
import { WebSocket } from "ws";
import { encodeRealtimeTicket } from "../brokers/realtime-ticket";
import { createRealtimeGateway } from "./gateway";
import { MockProviderRegistry } from "./provider";
import { RedisTicketStore } from "./ticket-store";

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required realtime configuration: ${name}`);
  return value;
};

const ticketSecret = required("REALTIME_TICKET_SECRET");
const serviceAuthSecret = required("REALTIME_SERVICE_AUTH_SECRET");
const terminalOsUrl = required("TERMINAL_OS_URL").replace(/\/$/, "");
const redisUrl = required("REDIS_URL");
const port = Number(process.env.PORT || process.env.REALTIME_PORT || 4012);
const providerMode = process.env.REALTIME_PROVIDER_MODE || "mock";
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid realtime service port.");
if (providerMode !== "mock") throw new Error("Only the mocked realtime provider is enabled in this implementation.");

const redis = createClient({ url: redisUrl });
redis.on("error", () => console.error("[realtime] Redis connection unavailable."));
await redis.connect();

const gateway = createRealtimeGateway({
  ticketSecret,
  ticketStore: new RedisTicketStore(redis),
  providers: new MockProviderRegistry(),
  reauthorize: async (claims) => {
    try {
      const response = await fetch(`${terminalOsUrl}/api/terminal/realtime-reauthorize`, {
        method: "POST",
        headers: { Authorization: `Bearer ${serviceAuthSecret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ticket: encodeRealtimeTicket(claims, ticketSecret) }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return false;
      const result = await response.json() as { authorized?: boolean; credentials?: Record<string, string> };
      if (result.authorized !== true || !result.credentials || typeof result.credentials !== "object") return false;
      return { authorized: true, credentials: result.credentials };
    } catch {
      return false;
    }
  },
});

const httpServer = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/healthz") {
    response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ status: "ok", provider_mode: providerMode }));
    return;
  }
  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
});

httpServer.on("upgrade", (request, socket, head) => {
  if (new URL(request.url || "/", "http://localhost").pathname !== "/ws") {
    socket.destroy();
    return;
  }
  gateway.wss.handleUpgrade(request, socket, head, (websocket) => gateway.wss.emit("connection", websocket, request));
});

httpServer.listen(port, "0.0.0.0", () => console.info(`[realtime] listening on port ${port} in ${providerMode} mode`));

let shuttingDown = false;
async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  httpServer.close();
  await gateway.close();
  await redis.quit();
}

process.on("SIGTERM", () => { void shutdown().catch(() => process.exit(1)); });
process.on("SIGINT", () => { void shutdown().catch(() => process.exit(1)); });
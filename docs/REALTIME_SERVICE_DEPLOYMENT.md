# Realtime service deployment

The persistent WebSocket runtime is `server/realtime/main.ts`. It is separate from the Next.js/Vercel HTTP application and serves:

- `GET /healthz`
- `GET /ws`

Required runtime variables:

- `REALTIME_TICKET_SECRET`: at least 32 bytes; must match the Terminal OS HTTP app.
- `REALTIME_SERVICE_AUTH_SECRET`: private service-to-service bearer secret.
- `TERMINAL_OS_URL`: HTTPS origin of the Terminal OS HTTP deployment.
- `REDIS_URL`: Redis connection URL for atomic single-use ticket consumption.

`REALTIME_PROVIDER_MODE=mock` is the only enabled mode in this implementation. It is intended for architecture verification and must not be treated as live broker data. Live Dhan/Kite adapters require a separately authorized provider integration before changing the mode gate.

The Main Terminal must set `VITE_REALTIME_URL` to the deployed service's `wss://.../ws` endpoint. Broker credentials remain server-side and are never placed in tickets or client messages.
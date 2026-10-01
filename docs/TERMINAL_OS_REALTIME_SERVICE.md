# Terminal OS Persistent Market-Data Service

Status: contract/design only. The current Vercel deployment remains HTTP-only; no persistent WebSocket runtime is implemented or deployed here.

## Runtime Boundary

Run the provider WebSocket in a dedicated always-on Node service compatible with FundedWealth's persistent-service infrastructure. Keep the Vercel app responsible for admin configuration, customer account authorization, short-lived realtime-ticket issuance, and REST market-data operations. Do not keep a provider socket inside a Vercel request handler.

The persistent service owns upstream Dhan/Kite socket connections, provider protocol parsing, subscription fan-out, reconnect/backoff, and normalized downstream messages. It must never log upstream URLs containing provider credentials.

## Authentication and Subscription

1. Main Terminal obtains its existing authenticated Supabase customer session and calls an authenticated Terminal OS HTTPS endpoint to request a short-lived, single-use realtime ticket for `{ account_id, provider, environment }`.
2. Terminal OS validates the customer and selected account using the existing account-context authorization. A ticket is bound to the customer, account, provider, environment, expiry, and one-time nonce. It contains no broker credential.
3. Main Terminal opens `wss://<persistent-service>/ws` and sends the ticket in the first `connection/authenticate` message. Do not place tickets or user tokens in the URL or logs.
4. The persistent service validates the ticket and rechecks the account context before accepting subscriptions.
5. For every subscription, validate account ownership/activity again and call the server-only `authorizeRealtimeMarketDataSubscription` helper. It resolves the active `trading_account_broker_connections` binding, then loads only the central `broker_credentials` row matching provider, environment, and `is_active=true`. The returned credential map is service-internal and must never enter any message or log.
6. Validate each requested instrument against the selected provider. Never switch provider/account credentials when a subscription fails.

The helper `authorizeRealtimeMarketDataSubscription` and central binding migration are implemented server-side. The ticket endpoint, persistent socket process, and deployment wiring are not implemented in this change.

## Message Contract

Runtime schemas live in `server/brokers/realtime-contract.ts`. Client messages are strict schemas; extra properties such as `credentials`, `access_token`, or broker tokens are rejected.

| Type | Direction | Purpose |
| --- | --- | --- |
| `connection` | Client then server | One-time ticket authentication; server returns authenticated/ready/rejected. |
| `subscription` | Client then server | Subscribe/unsubscribe with request ID, account ID, provider, environment, and instruments. |
| `quote` | Server to client | Normalized instrument quote for an authorized account/provider stream. |
| `index` | Server to client | Same normalized shape for index instruments. |
| `error` | Server to client | Safe error code/message and retryability; never raw upstream bodies. |
| `heartbeat` | Server to client | Liveness timestamp. |
| `disconnect` | Server to client | Safe close reason and whether the client may reconnect. |

Every market-data event identifies provider, account, instrument, and timestamp and carries normalized LTP/change/change-percent/bid/ask/volume fields. It contains no broker credential or token.

## Reconnect and Failure

Use bounded exponential backoff with jitter. On reconnect, obtain a fresh ticket, reauthorize the account and every subscription, reload server-side credentials, and resubscribe. Close streams when tickets expire, accounts become inactive/unowned, credentials are inactive, or provider/environment scope changes. Provider failures emit a normalized `error` followed by `disconnect` when the upstream stream cannot recover; do not report live status solely because credentials exist.

## Main Terminal Migration Map

| Consumer | Terminal OS contract | Current Main Terminal state |
| --- | --- | --- |
| Stocks | `POST /api/terminal/market-data` `searchInstruments` + `getQuote` | Still uses Main proxy Kite/NSE/TradingView sources. |
| Indices | `getQuote` per authorized provider instrument; future `index` stream | Still uses Main proxy NSE and Main proxy WebSocket. |
| Futures | `searchInstruments` + `getQuote` | Still obtains quotes from Main Kite adapter. |
| Option Chain | `getOptionChain` REST operation | Added to Terminal OS; Main currently uses Kite OAuth. |
| Watchlist | `quote`/`index` stream subscription | Still derives prices from Main F&O/NSE hooks; symbols only are in localStorage. |
| Charts | `POST /api/terminal/market-data` `getHistoricalCandles` | Already partially calls the gateway when account provider maps to Dhan/Kite; current account provider may be unset. |
| Instrument Explorer | `searchInstruments` + `getQuote` | Existing gateway quote call is limited to Kite derivatives; stocks/indices rows are sourced elsewhere. |
| Dashboard/live quotes | `connection`, `index`, and `quote` WebSocket messages | Still uses the Main proxy relay. |
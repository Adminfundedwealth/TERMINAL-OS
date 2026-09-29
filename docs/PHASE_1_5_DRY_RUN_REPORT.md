# Phase 1.5 Dry-Run Report

This is a read-only preparation report. No records were inserted, updated, deleted, or migrated.

## Canonical project

`nysrxvpjdlvzvcawysvh`

## Canonical live counts

| Entity | Count |
| --- | ---: |
| `terminal_traders` | 132 |
| `trading_accounts` | 102 |
| `trading_orders` | 3,724 |
| `executions` | 1,418 |
| `positions` | 567 |
| `account_metrics` | 3,205 |
| `risk_events` | 1,570 |
| `watchlists` | 388 |
| `staff_members` | 1 |
| Auth users | 434 |

## Identity checks

- `trading_accounts.trader_id` values all resolved to an existing `terminal_traders.id`: 0 orphan accounts.
- `terminal_traders.external_id` matched `public.users.id`: 128 of 132.
- `terminal_traders.external_id` matched Auth user IDs directly: 0 of 132.
- Trader rows without a matching `public.users.id`: 4.
- Duplicate `terminal_traders.external_id` groups: 0.
- `staff_members.id` matched Auth user IDs: 0 of 1.
- Staff rows without a direct Auth ID match: 1.
- Auth-to-`public.users` relationship: not verified.
- FK enforcement for Auth identity joins: unknown because the existing SQL RPC was unavailable through REST.

## Cross-project classification

The New Terminal project is `zxqwtqlbrlegwdodjhiq`. Its publishable key can confirm protected tables exist, but cannot read production rows without an authenticated user session. A privileged New Terminal read-only credential was not available for this phase.

Therefore every New Terminal trading record is classified as:

`UNKNOWN / MANUAL DECISION REQUIRED`

No record is claimed to be duplicate, unique, conflicting, orphaned, or safe to migrate.

## Security findings

- Terminal OS service-role credentials are server-side in `TERMINAL_SUPABASE_SECRET_KEY`.
- Terminal OS broker encryption uses `BROKER_ENCRYPTION_KEY` server-side.
- Terminal OS session signing uses `SESSION_SECRET` server-side.
- New Terminal exposes only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to its browser bundle.
- New Terminal broker credentials are held in JavaScript memory by `brokerConfig.ts`, not persisted in browser storage, but they are still entered into and temporarily present in the browser. This is not the future production model.
- New Terminal positions and watchlists are persisted in browser storage; these must not be treated as canonical trading state.
- No broker secret or service-role value was printed.

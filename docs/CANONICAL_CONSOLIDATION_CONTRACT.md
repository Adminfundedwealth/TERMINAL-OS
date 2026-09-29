# Canonical Consolidation Contract

Status: preparation only. This document does not authorize database changes.

## Canonical boundary

- Canonical Supabase project: `nysrxvpjdlvzvcawysvh`
- Canonical backend: Terminal OS
- Customer identity source: Supabase Auth, mapped through `users` to `terminal_traders`
- Staff identity source: Supabase Auth, mapped to `staff_members`
- Broker credentials: server-side only; encrypted account data must never be returned to browsers

The New Terminal project `zxqwtqlbrlegwdodjhiq` is not interchangeable with the canonical project. Its data must be classified and reconciled before any migration or cutover.

## Canonical data mapping

| New Terminal concept | Canonical Terminal OS concept | Mapping status |
| --- | --- | --- |
| `trading_accounts` | `trading_accounts` | Same concept; ownership is different |
| `owner_user_id` | `users.id` -> `terminal_traders.external_id` -> `trading_accounts.trader_id` | Cross-project identity conversion required |
| `current_balance` | `balance` | Direct value mapping |
| `orders` | `trading_orders` | Required table distinction; `orders` is payment data |
| `orders.account_id` | `trading_orders.trading_account_id` | Direct relationship mapping |
| `orders.quantity` | `trading_orders.qty` | Direct value mapping |
| `executions.quantity` | `executions.qty` | Direct value mapping |
| `executions.execution_price` | `executions.price` | Direct value mapping |
| `positions.quantity` | `positions.qty` | Direct value mapping |
| `positions.position_status` | `positions.is_open` | Explicit conversion required |
| `daily_performance` | `account_metrics` | Conceptual mapping; columns differ |
| `risk_events.account_id` | `risk_events.trading_account_id` | Direct relationship mapping |
| `watchlists.owner_user_id` | `watchlists.trader_id` | Auth/trader resolution required |
| `watchlist_items` | `watchlists.items` JSONB | Serialization conversion required |
| `employees` | `staff_members` | Identity and role mapping required |
| New Terminal settings/provider tables | No automatic target | Manual decision required |

## No safe one-to-one mapping

The following require a manual migration decision and must not be copied by name:

- `owner_user_id` values when no matching `terminal_traders.external_id` is proven
- New Terminal `auth.users` identities without a canonical trader match
- `daily_performance` rows into `account_metrics`, because the metric columns and semantics differ
- `position_status` values into `is_open`, especially null or nonstandard states
- `watchlist_items` rows into the canonical JSONB `watchlists.items` representation
- `employees` rows into `staff_members`, including password, TOTP, and role data
- `terminal_settings`, `provider_config`, `provider_health`, and `account_metric_snapshots`

## Auth verification result

The canonical project currently contains 132 `terminal_traders`, 102 `trading_accounts`, 1 `staff_members` row, and 424 platform `users` rows. A subsequent Auth admin read returned 434 Auth users. The available REST schema exposes the relevant columns, but the existing `exec_sql` RPC is not callable through the REST surface used for this audit. Read-only comparisons produced:

- `terminal_traders.external_id` matched `public.users.id`: **128 of 132**.
- `terminal_traders.external_id` matched a Supabase Auth user ID directly: **0 of 132**.
- Orphan `terminal_traders` by `public.users.id` comparison: **4**.
- Duplicate `terminal_traders.external_id` groups: **0**.
- Orphan `trading_accounts` by `trader_id -> terminal_traders.id`: **0**.
- `staff_members.id` matches to Auth user IDs: **0 of 1**.
- Orphan `staff_members` by direct Auth-ID comparison: **1**.
- FK enforcement for these identity relationships: **UNKNOWN**; the SQL RPC was unavailable.

`trading_accounts.trader_id` is the live application relationship to `terminal_traders.id`. The observed customer bridge is `public.users.id -> terminal_traders.external_id -> terminal_traders.id`; its Auth-to-`users` relationship remains unverified. Four trader rows require manual identity resolution before customer cutover.

Terminal OS staff authentication uses the authenticated Supabase user ID to query `staff_members.id`, but the observed row does not match an Auth ID. Staff login therefore cannot be certified against the canonical row until the staff identity mapping is resolved.

No FK or identity constraint is to be added in this preparation phase.

## Backend contract rules

Customer APIs must resolve the authenticated customer server-side, resolve the customer's trader record, and derive allowed account IDs from that trader. A browser-supplied account ID is a filter candidate only; it is never an authorization grant.

Staff APIs remain separately authenticated through the Terminal OS staff session and RBAC layer. Existing `/api/terminal/*` routes are staff/operations routes unless a route is explicitly reclassified and given customer account isolation.

Existing reusable staff routes include:

- `/api/terminal/accounts`
- `/api/terminal/orders`
- `/api/terminal/executions`
- `/api/terminal/positions`
- `/api/terminal/risk`
- `/api/terminal/performance`
- `/api/terminal/watchlists`
- `/api/terminal/system-health`

These routes are not customer APIs. Their current permission checks authenticate Terminal OS staff and must not be exposed as a substitute for the customer account contract. No customer-scoped `/api/customer/*` implementation is claimed by this phase.

The browser must not receive:

- Supabase service-role or secret keys
- broker API keys or secrets
- broker access tokens
- decrypted account credentials
- unrestricted database query capability

## Dry-run classification

The canonical project is the only project with verified live trading rows. New Terminal's publishable-key REST calls cannot inspect protected rows without an authenticated customer session, and no stable cross-project IDs were proven in this phase. Accordingly, New Terminal records are classified as **UNKNOWN / manual decision required**, not as duplicates or migratable rows.

No cross-project row was classified as represented or migratable because the New Terminal project could not be queried with a privileged read-only credential and no stable cross-project ID equivalence was proven. The result is:

| Entity | Classification |
| --- | --- |
| New Terminal trading accounts | Unknown / manual decision |
| New Terminal orders | Unknown / manual decision |
| New Terminal executions | Unknown / manual decision |
| New Terminal positions | Unknown / manual decision |
| New Terminal watchlists | Unknown / manual decision |
| New Terminal performance/metrics | Unknown / manual decision |

Canonical live counts captured during this phase:

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

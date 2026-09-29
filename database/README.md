# Terminal OS Database Setup

## Target

**Terminal Supabase #2** — `fundedwealth-terminal` project only.

> ⚠️ NEVER run this schema against Main Site Supabase #1.

## Setup

1. Open your **Terminal Supabase** project dashboard
2. Navigate to **SQL Editor**
3. Run `schema.sql` in full
4. Verify all 17 tables are created
5. Run `broker_credentials_migration.sql` and `broker_encryption_rpc.sql` from this directory
6. Copy `.env.example` → `.env.local` and fill in your Terminal Supabase #2 credentials

## Tables Created

| Table | Purpose |
|---|---|
| `employees` | Terminal OS employee accounts |
| `trading_accounts` | Trader accounts managed by Terminal |
| `orders` | All trading orders |
| `executions` | Order fill executions |
| `positions` | Open and closed positions |
| `daily_performance` | Per-account daily P&L records |
| `risk_events` | Append-only risk event log |
| `account_metric_snapshots` | Periodic account risk snapshots |
| `instruments` | Instrument master data |
| `watchlists` | User watchlists |
| `watchlist_items` | Individual watchlist symbols |
| `journal_entries` | Trader journal entries |
| `alerts` | Price/condition alerts |
| `terminal_settings` | Operational configuration |
| `terminal_activity` | Append-only activity log |
| `provider_config` | Provider metadata (no credentials stored) |
| `provider_health` | Provider operational health |
| `broker_credentials` | Encrypted broker credential records (separate migration) |

## Security

- Row Level Security is **enabled on all tables**
- The **service role key** (server-side only) bypasses RLS for Terminal OS backend operations
- The **anon key** has no access to any table by default
- Broker credentials are encrypted through the existing pgcrypto RPCs before storage; `BROKER_ENCRYPTION_KEY` is server-only
- Raw broker credentials and decrypted values must never appear in API responses or logs

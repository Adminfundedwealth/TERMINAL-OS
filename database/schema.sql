-- =============================================================
-- FundedWealth Terminal OS — Database Schema
-- Target: Terminal Supabase #2 (fundedwealth-terminal)
-- =============================================================
-- Run this against your Terminal Supabase project.
-- NEVER run this against Main Site Supabase #1.
-- =============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- EMPLOYEES
-- =============================================================
CREATE TABLE IF NOT EXISTS employees (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        TEXT NOT NULL UNIQUE,
  full_name    TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN','ADMIN','TRADING_OPERATIONS','RISK_MANAGER','SUPPORT','VIEWER')),
  status       TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','SUSPENDED')),
  last_login_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TRADING ACCOUNTS
-- =============================================================
CREATE TABLE IF NOT EXISTS trading_accounts (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_code       TEXT NOT NULL UNIQUE,
  owner_user_id      UUID NOT NULL,
  status             TEXT NOT NULL DEFAULT 'INACTIVE'
                       CHECK (status IN ('ACTIVE','INACTIVE','SUSPENDED','BREACHED','COMPLETED','EXPIRED')),
  account_type       TEXT NOT NULL CHECK (account_type IN ('EVALUATION','FUNDED','DEMO','LIVE')),
  challenge_type     TEXT CHECK (challenge_type IN ('PHASE_1','PHASE_2','EXPRESS','INSTANT')),
  starting_balance   NUMERIC(18,2) NOT NULL,
  current_balance    NUMERIC(18,2) NOT NULL,
  equity             NUMERIC(18,2) NOT NULL,
  currency           TEXT NOT NULL DEFAULT 'INR',
  daily_loss_limit   NUMERIC(18,2) NOT NULL,
  max_drawdown       NUMERIC(18,2) NOT NULL,
  profit_target      NUMERIC(18,2),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at         TIMESTAMPTZ,
  last_activity_at   TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trading_accounts_owner ON trading_accounts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_trading_accounts_status ON trading_accounts(status);

-- =============================================================
-- ORDERS
-- =============================================================
CREATE TABLE IF NOT EXISTS orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trading_account_id  UUID NOT NULL REFERENCES trading_accounts(id),
  symbol              TEXT NOT NULL,
  exchange            TEXT NOT NULL,
  instrument_type     TEXT,
  side                TEXT NOT NULL CHECK (side IN ('BUY','SELL')),
  order_type          TEXT NOT NULL CHECK (order_type IN ('MARKET','LIMIT','STOP','STOP_LIMIT')),
  quantity            NUMERIC(18,4) NOT NULL,
  price               NUMERIC(18,4),
  trigger_price       NUMERIC(18,4),
  status              TEXT NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','OPEN','PARTIALLY_FILLED','FILLED','CANCELLED','REJECTED','EXPIRED')),
  source              TEXT,
  provider_order_id   TEXT,
  placed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_account ON orders(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_placed_at ON orders(placed_at DESC);

-- =============================================================
-- EXECUTIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS executions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id              UUID NOT NULL REFERENCES orders(id),
  trading_account_id    UUID NOT NULL REFERENCES trading_accounts(id),
  symbol                TEXT NOT NULL,
  side                  TEXT NOT NULL CHECK (side IN ('BUY','SELL')),
  quantity              NUMERIC(18,4) NOT NULL,
  fill_price            NUMERIC(18,4) NOT NULL,
  fees                  NUMERIC(18,4) NOT NULL DEFAULT 0,
  execution_status      TEXT NOT NULL DEFAULT 'COMPLETE' CHECK (execution_status IN ('COMPLETE','PARTIAL','FAILED')),
  provider              TEXT,
  provider_execution_id TEXT,
  executed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_executions_account ON executions(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_executions_order ON executions(order_id);
CREATE INDEX IF NOT EXISTS idx_executions_executed_at ON executions(executed_at DESC);

-- =============================================================
-- POSITIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS positions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trading_account_id  UUID NOT NULL REFERENCES trading_accounts(id),
  symbol              TEXT NOT NULL,
  exchange            TEXT NOT NULL,
  side                TEXT NOT NULL CHECK (side IN ('LONG','SHORT')),
  quantity            NUMERIC(18,4) NOT NULL,
  average_price       NUMERIC(18,4) NOT NULL,
  ltp                 NUMERIC(18,4),
  unrealized_pnl      NUMERIC(18,4),
  realized_pnl        NUMERIC(18,4) NOT NULL DEFAULT 0,
  stop_loss           NUMERIC(18,4),
  take_profit         NUMERIC(18,4),
  status              TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
  opened_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at           TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_positions_account ON positions(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);

-- =============================================================
-- DAILY PERFORMANCE
-- =============================================================
CREATE TABLE IF NOT EXISTS daily_performance (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trading_account_id  UUID NOT NULL REFERENCES trading_accounts(id),
  date                DATE NOT NULL,
  opening_balance     NUMERIC(18,2) NOT NULL,
  closing_balance     NUMERIC(18,2) NOT NULL,
  daily_pnl           NUMERIC(18,4) NOT NULL DEFAULT 0,
  total_trades        INTEGER NOT NULL DEFAULT 0,
  winning_trades      INTEGER NOT NULL DEFAULT 0,
  losing_trades       INTEGER NOT NULL DEFAULT 0,
  gross_profit        NUMERIC(18,4) NOT NULL DEFAULT 0,
  gross_loss          NUMERIC(18,4) NOT NULL DEFAULT 0,
  fees                NUMERIC(18,4) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trading_account_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_perf_account_date ON daily_performance(trading_account_id, date DESC);

-- =============================================================
-- RISK EVENTS (append-only)
-- =============================================================
CREATE TABLE IF NOT EXISTS risk_events (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trading_account_id  UUID NOT NULL REFERENCES trading_accounts(id),
  event_type          TEXT NOT NULL,
  severity            TEXT NOT NULL CHECK (severity IN ('INFO','WARNING','CRITICAL')),
  metric              TEXT NOT NULL,
  threshold           NUMERIC(18,4) NOT NULL,
  actual_value        NUMERIC(18,4) NOT NULL,
  action_taken        TEXT,
  created_by          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_events_account ON risk_events(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_risk_events_created_at ON risk_events(created_at DESC);

-- =============================================================
-- ACCOUNT METRIC SNAPSHOTS (append-only)
-- =============================================================
CREATE TABLE IF NOT EXISTS account_metric_snapshots (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trading_account_id    UUID NOT NULL REFERENCES trading_accounts(id),
  balance               NUMERIC(18,2) NOT NULL,
  equity                NUMERIC(18,2) NOT NULL,
  daily_pnl             NUMERIC(18,4) NOT NULL DEFAULT 0,
  daily_loss_used       NUMERIC(18,4) NOT NULL DEFAULT 0,
  current_drawdown      NUMERIC(18,4) NOT NULL DEFAULT 0,
  max_drawdown_reached  NUMERIC(18,4) NOT NULL DEFAULT 0,
  exposure              NUMERIC(18,4) NOT NULL DEFAULT 0,
  open_positions_count  INTEGER NOT NULL DEFAULT 0,
  risk_status           TEXT NOT NULL DEFAULT 'NORMAL'
                          CHECK (risk_status IN ('NORMAL','WARNING','CRITICAL','BREACHED','RESTRICTED')),
  snapshot_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metric_snapshots_account ON account_metric_snapshots(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_metric_snapshots_at ON account_metric_snapshots(snapshot_at DESC);

-- =============================================================
-- INSTRUMENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS instruments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol          TEXT NOT NULL,
  trading_symbol  TEXT NOT NULL,
  exchange        TEXT NOT NULL,
  segment         TEXT NOT NULL,
  instrument_type TEXT NOT NULL CHECK (instrument_type IN ('EQ','FUT','OPT','INDEX','CURRENCY','COMMODITY')),
  expiry          DATE,
  strike          NUMERIC(18,4),
  option_type     TEXT CHECK (option_type IN ('CE','PE')),
  lot_size        INTEGER NOT NULL DEFAULT 1,
  tick_size       NUMERIC(18,6) NOT NULL DEFAULT 0.05,
  status          TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','EXPIRED')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trading_symbol, exchange)
);

CREATE INDEX IF NOT EXISTS idx_instruments_symbol ON instruments(symbol);
CREATE INDEX IF NOT EXISTS idx_instruments_exchange ON instruments(exchange);
CREATE INDEX IF NOT EXISTS idx_instruments_status ON instruments(status);

-- =============================================================
-- WATCHLISTS
-- =============================================================
CREATE TABLE IF NOT EXISTS watchlists (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id  UUID NOT NULL,
  name           TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watchlist_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  watchlist_id  UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  symbol        TEXT NOT NULL,
  exchange      TEXT NOT NULL,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (watchlist_id, symbol, exchange)
);

-- =============================================================
-- JOURNAL ENTRIES
-- =============================================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trading_account_id  UUID NOT NULL REFERENCES trading_accounts(id),
  date                DATE NOT NULL,
  title               TEXT NOT NULL,
  entry               TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_account ON journal_entries(trading_account_id);

-- =============================================================
-- ALERTS
-- =============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trading_account_id  UUID NOT NULL REFERENCES trading_accounts(id),
  owner_user_id       UUID NOT NULL,
  alert_type          TEXT NOT NULL,
  symbol              TEXT,
  condition           TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','TRIGGERED','DISABLED')),
  triggered_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TERMINAL SETTINGS
-- =============================================================
CREATE TABLE IF NOT EXISTS terminal_settings (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category     TEXT NOT NULL,
  key          TEXT NOT NULL,
  value        JSONB NOT NULL,
  description  TEXT,
  updated_by   UUID REFERENCES employees(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category, key)
);

-- =============================================================
-- TERMINAL ACTIVITY (append-only)
-- =============================================================
CREATE TABLE IF NOT EXISTS terminal_activity (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  employee_id  UUID REFERENCES employees(id),
  action       TEXT NOT NULL,
  module       TEXT NOT NULL,
  resource     TEXT,
  resource_id  TEXT,
  result       TEXT NOT NULL,
  ip_address   INET,
  metadata     JSONB
);

CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON terminal_activity(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_employee ON terminal_activity(employee_id);
CREATE INDEX IF NOT EXISTS idx_activity_action ON terminal_activity(action);

-- =============================================================
-- PROVIDER CONFIG
-- =============================================================
CREATE TABLE IF NOT EXISTS provider_config (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_name  TEXT NOT NULL UNIQUE,
  provider_type  TEXT NOT NULL CHECK (provider_type IN ('MARKET_DATA','ORDER_EXECUTION','WEBSOCKET','INSTRUMENT_MASTER')),
  environment    TEXT NOT NULL DEFAULT 'production',
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NOTE: provider credentials (API keys, tokens) are NEVER stored in this table.
  -- They belong in server environment variables only.
);

-- =============================================================
-- PROVIDER HEALTH
-- =============================================================
CREATE TABLE IF NOT EXISTS provider_health (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id          UUID NOT NULL REFERENCES provider_config(id),
  status               TEXT NOT NULL CHECK (status IN ('CONNECTED','DISCONNECTED','ERROR','UNKNOWN')),
  last_heartbeat_at    TIMESTAMPTZ,
  last_success_at      TIMESTAMPTZ,
  last_error_at        TIMESTAMPTZ,
  last_error_message   TEXT,
  checked_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_health_provider ON provider_health(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_health_checked_at ON provider_health(checked_at DESC);

-- =============================================================
-- ROW LEVEL SECURITY
-- Enable RLS on all tables. Terminal OS uses the service role key
-- server-side so RLS does not block it — but it protects against
-- any accidental direct anon-key queries.
-- =============================================================

ALTER TABLE employees               ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_performance       ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_metric_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists              ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_activity       ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_config         ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_health         ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS — no explicit policy needed for service role.
-- The anon key has NO access to any of these tables by default (deny-all).

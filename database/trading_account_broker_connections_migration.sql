-- Account bindings to FundedWealth-owned public.broker_connections only.
-- This migration does not read or modify public.broker_credentials.

BEGIN;

CREATE TABLE public.trading_account_broker_connections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trading_account_id uuid NOT NULL
    REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  broker_connection_id uuid NOT NULL
    REFERENCES public.broker_connections(id) ON DELETE RESTRICT,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trading_account_broker_connections_pair_unique
    UNIQUE (trading_account_id, broker_connection_id)
);

CREATE UNIQUE INDEX trading_account_broker_connections_one_active_per_account_idx
  ON public.trading_account_broker_connections (trading_account_id)
  WHERE is_active = true;

CREATE INDEX trading_account_broker_connections_connection_idx
  ON public.trading_account_broker_connections (broker_connection_id);

ALTER TABLE public.trading_account_broker_connections ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.trading_account_broker_connections
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.trading_account_broker_connections
  TO service_role;

COMMIT;

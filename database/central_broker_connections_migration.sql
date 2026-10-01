-- FundedWealth-owned broker connection credentials.
-- This migration does not read or modify public.broker_credentials.

BEGIN;

CREATE TABLE public.broker_connections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  broker_id text NOT NULL CHECK (broker_id IN (
    'dhan', 'zerodha', 'angel_one', 'upstox', 'fivepaisa', 'fyers', 'alice_blue'
  )),
  environment text NOT NULL DEFAULT 'production'
    CHECK (environment IN ('production', 'paper', 'sandbox')),
  label text NOT NULL DEFAULT 'Default',
  encrypted_credentials text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  is_connected boolean NOT NULL DEFAULT false,
  connection_status text NOT NULL DEFAULT 'untested'
    CHECK (connection_status IN ('untested', 'connected', 'error')),
  last_tested_at timestamptz,
  last_test_result text,
  health_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT broker_connections_broker_environment_unique
    UNIQUE (broker_id, environment)
);

CREATE INDEX broker_connections_updated_at_idx
  ON public.broker_connections (updated_at DESC);

ALTER TABLE public.broker_connections ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.broker_connections
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.broker_connections
  TO service_role;

COMMIT;
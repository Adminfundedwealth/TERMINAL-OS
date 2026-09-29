-- Account-scope the existing broker credential table; this does not create a table.
-- Legacy unscoped rows are intentionally not assigned to customer accounts.

begin;

alter table public.broker_credentials
  add column if not exists trading_account_id uuid
    references public.trading_accounts(id) on delete cascade;

-- Keep one stored credential row per account, provider, and environment.
-- This applies to inactive rows too; inactive credential history is not modeled here.
create unique index if not exists idx_broker_credentials_account_provider_environment
  on public.broker_credentials (trading_account_id, broker_id, environment)
  where trading_account_id is not null;

-- Replace the old global active index with account/provider/environment scope.
drop index if exists public.idx_broker_credentials_one_active;

create unique index if not exists idx_broker_credentials_one_active_per_account
  on public.broker_credentials (trading_account_id, broker_id, environment)
  where is_active = true and trading_account_id is not null;

-- Legacy/unassigned active credentials have a separate one-global-row limit.
create unique index if not exists idx_broker_credentials_one_global_active
  on public.broker_credentials ((trading_account_id is null))
  where is_active = true and trading_account_id is null;

commit;
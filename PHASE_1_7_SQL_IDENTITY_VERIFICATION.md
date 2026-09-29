# Phase 1.7 SQL Identity and Constraint Verification

Status: **INCOMPLETE - approved read-only SQL access unavailable**

Canonical project: `nysrxvpjdlvzvcawysvh`

No insert, update, delete, alter, create, drop, truncate, migration, RLS change, FK change, authentication change, broker operation, or market-data operation was performed.

## Access result

The only available SQL-like REST path was probed with the harmless query `select 1 as read_only_probe;` through `/rest/v1/rpc/exec_sql`.

Result:

```text
HTTP 404 PGRST202
Could not find the function public.exec_sql(...) in the schema cache
```

The dashboard was not an authenticated SQL-editor execution path in this session. Per the phase instructions, no workaround was attempted and no SQL verification is claimed.

## 1. Auth -> public.users

Not SQL-verified.

Phase 1.6 REST evidence found:

- Supabase Auth users examined: 434
- `public.users` rows examined: 424
- Exact `public.users.id = auth.users.id` matches: 0
- Case-insensitive Auth email candidates: 405
- Email equality was treated only as candidate evidence

The following must be verified in the Supabase SQL editor:

```sql
select
  u.id as public_user_id,
  u.email as public_email,
  u.clerk_id,
  a.id as auth_user_id,
  a.email as auth_email,
  case when a.id is not null then 'CONFIRMED' else 'UNRESOLVED' end as id_match,
  case when lower(trim(coalesce(u.email, ''))) = lower(trim(coalesce(a.email, '')))
    then 'CANDIDATE_ONLY' else 'NO_EMAIL_MATCH' end as email_evidence
from public.users u
left join auth.users a on a.id = u.id
order by u.id;
```

Foreign-key verification:

```sql
select
  tc.constraint_name,
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema as referenced_schema,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
 and kcu.table_schema = tc.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and tc.table_name = 'users';
```

## 2. public.users -> terminal_traders

Phase 1.6 established 128 exact `public.users.id = terminal_traders.external_id` mappings by read-only REST data. This relationship is not yet proven to be FK-enforced.

Required SQL:

```sql
select
  t.id as trader_id,
  t.external_id,
  u.id as public_user_id,
  u.email,
  u.clerk_id,
  case
    when u.id is null then 'UNRESOLVED'
    else 'CONFIRMED'
  end as classification
from public.terminal_traders t
left join public.users u on u.id = t.external_id
order by t.id;
```

Required FK/unique metadata:

```sql
select
  tc.constraint_type,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
 and kcu.table_schema = tc.table_schema
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.table_schema = 'public'
  and tc.table_name in ('users', 'terminal_traders')
order by tc.table_name, tc.constraint_type, tc.constraint_name;
```

## 3. Four unresolved traders

No database-visible evidence available through the approved SQL path confirmed these identities:

| Trader ID | External ID | Email | Accounts |
|---|---|---|---:|
| `01e0c8e4-9985-43ac-965d-fccef487bcd4` | `inttest-user-1783239091589` | `inttest@fundedwealth.com` | 4 |
| `a99a47f0-61e1-4503-be5d-b06119fd42d7` | `test-user-runtime-001` | `test@runtime.com` | 1 |
| `d4ae354b-3048-43c7-a6d6-1b44b93867f6` | `ext_59e4a6b77dc1a989` | `razorpay-test@fundedwealth.com` | 4 |
| `f825ff08-4431-448c-aceb-c22bbf08e536` | `ext_2b92969925dc16ab` | `manual-pay@fundedwealth.com` | 4 |

Current classification remains **UNRESOLVED** for all four. No weak similarity or email-only match was promoted to confirmation.

Required SQL investigation:

```sql
select
  t.id as trader_id,
  t.external_id,
  t.email as trader_email,
  t.display_name,
  t.created_at,
  t.updated_at,
  u.id as public_user_id,
  u.email as public_email,
  u.clerk_id,
  a.id as trading_account_id,
  a.account_code,
  a.created_at as account_created_at
from public.terminal_traders t
left join public.users u on u.id = t.external_id
left join public.trading_accounts a on a.trader_id = t.id
where t.external_id in (
  'inttest-user-1783239091589',
  'test-user-runtime-001',
  'ext_59e4a6b77dc1a989',
  'ext_2b92969925dc16ab'
)
order by t.id, a.id;
```

## 4. Staff identity

The canonical row is:

- `staff_members.id`: `00000000-0000-0000-0000-000000000001`
- email: `adminfundedwealth@gmail.com`
- direct Auth ID match: none in Phase 1.6
- email candidate: one Auth user

Classification: **UNRESOLVED**.

The active code in `lib/auth/session.ts` performs `auth.users.id -> staff_members.id`. This code was not changed.

Required SQL:

```sql
select
  s.id as staff_id,
  s.email as staff_email,
  s.name,
  s.status,
  a.id as auth_user_id,
  a.email as auth_email,
  a.raw_user_meta_data,
  case when a.id is not null then 'CONFIRMED' else 'UNRESOLVED' end as classification
from public.staff_members s
left join auth.users a on a.id = s.id;
```

## 5. Relevant constraints and indexes

Not SQL-verified in this phase. The following read-only query is required:

```sql
select
  tc.constraint_type,
  tc.constraint_name,
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema as referenced_schema,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
 and kcu.table_schema = tc.table_schema
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.table_schema = 'public'
  and tc.table_name in (
    'users', 'terminal_traders', 'trading_accounts', 'trading_orders',
    'executions', 'positions', 'account_metrics', 'risk_events',
    'watchlists', 'staff_members'
  )
order by tc.table_name, tc.constraint_type, tc.constraint_name;

select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'users', 'terminal_traders', 'trading_accounts', 'trading_orders',
    'executions', 'positions', 'account_metrics', 'risk_events',
    'watchlists', 'staff_members'
  )
order by tablename, indexname;
```

## 6. Account impact

Phase 1.6 read-only verification confirmed:

- Total accounts: `102`
- Valid `trading_accounts.trader_id -> terminal_traders.id`: `102`
- Orphan accounts: `0`
- Accounts attached to unresolved traders: `13`

The 13 affected accounts remain excluded from automated migration:

| Account ID | Account code | Unresolved trader ID |
|---|---|---|
| `10253556-302d-4adb-bdcf-e1056b5fbd3e` | `FW-P1-MR7KNXEI` | `f825ff08-4431-448c-aceb-c22bbf08e536` |
| `1edc5d44-97d8-43d7-9d79-66298f690487` | `FW-P1-MR7IIMAZ` | `f825ff08-4431-448c-aceb-c22bbf08e536` |
| `2c7b7caf-5dfc-4aff-9997-476ce9ecbb1e` | `FW-P1-MR7NBHDE` | `d4ae354b-3048-43c7-a6d6-1b44b93867f6` |
| `3869438f-82ee-4a19-b032-0aa8eeab0e19` | `FW-P1-MR7KNVDS` | `01e0c8e4-9985-43ac-965d-fccef487bcd4` |
| `391e8ddd-6a2e-430c-880f-2fc93765ccf8` | `FW-P1-MR7IIHKQ` | `01e0c8e4-9985-43ac-965d-fccef487bcd4` |
| `59aeba29-f75f-4cf4-aa7d-5b9bad475dc2` | `FW-P1-MR7MZ5JE` | `d4ae354b-3048-43c7-a6d6-1b44b93867f6` |
| `8e6fab42-4627-4114-a04e-4c7d1ffc4a8d` | `FW-P1-MR7MZ0MD` | `01e0c8e4-9985-43ac-965d-fccef487bcd4` |
| `a8d527a1-ce57-410e-b217-0577dd10d8d4` | `RT-TEST-001` | `a99a47f0-61e1-4503-be5d-b06119fd42d7` |
| `b3512742-cee2-4d52-a36b-746d0b14df31` | `FW-P1-MR7MZ3PH` | `f825ff08-4431-448c-aceb-c22bbf08e536` |
| `c89c4a56-bc33-4046-b4b0-51fa4a1ffdb5` | `FW-P1-MR7NBFV3` | `f825ff08-4431-448c-aceb-c22bbf08e536` |
| `d6bf70e2-8f40-4b50-9cee-ea3577abad13` | `FW-P1-MR7KNY3P` | `d4ae354b-3048-43c7-a6d6-1b44b93867f6` |
| `db37c889-bf48-41a3-bca5-579fe0a83be0` | `FW-P1-MR7IIN7R` | `d4ae354b-3048-43c7-a6d6-1b44b93867f6` |
| `f5b502c8-f624-4f5c-8cc1-c25ed6a87fd9` | `FW-P1-MR7NBBLA` | `01e0c8e4-9985-43ac-965d-fccef487bcd4` |

## 7. Final classification

| Classification | Count |
|---|---:|
| CONFIRMED traders | 128 |
| UNRESOLVED traders | 4 |
| AMBIGUOUS traders | 0 |
| ORPHANED traders | 0 |
| UNKNOWN | 0 |
| UNRESOLVED staff rows | 1 |

## 8. Remaining blockers

- Approved read-only SQL/dashboard execution is unavailable in this session.
- Auth-to-`public.users` FK/application relationship is not verified.
- `public.users` to `terminal_traders` FK enforcement is not verified.
- The four unresolved traders remain unresolved.
- Staff Auth mapping remains unresolved.
- Relevant PK/FK/unique/index metadata is not verified.

## 9. Automated migration eligibility

**Cannot yet be determined.** The 128 exact trader mappings may be candidates, but automated migration eligibility requires SQL verification of constraints and the application identity bridge. The four unresolved traders and their 13 accounts are not eligible.

## Completion status

Phase 1.7 is **not complete** because the approved read-only SQL path was unavailable. No workaround or production mutation was performed.

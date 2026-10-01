-- SELECT-only postflight for the broker-encryption RPC contract.
WITH expected AS (
  SELECT
    'encrypt'::text AS rpc_name,
    pg_catalog.to_regprocedure('public.encrypt_broker_credentials(text,text)')::oid AS function_oid,
    ARRAY['plaintext', 'passphrase']::text[] AS argument_names
  UNION ALL
  SELECT
    'decrypt'::text,
    pg_catalog.to_regprocedure('public.decrypt_broker_credentials(text,text)')::oid,
    ARRAY['ciphertext', 'passphrase']::text[]
),
actual AS (
  SELECT
    expected.rpc_name,
    expected.argument_names,
    p.oid AS actual_oid,
    p.proargnames,
    p.prorettype,
    p.proowner,
    role_entry.rolname AS owner_name,
    p.prosecdef,
    p.proconfig,
    p.prosrc,
    p.proacl
  FROM expected
  LEFT JOIN pg_catalog.pg_proc AS p
    ON p.oid = expected.function_oid
  LEFT JOIN pg_catalog.pg_roles AS role_entry
    ON role_entry.oid = p.proowner
),
acl_entries AS (
  SELECT
    actual.rpc_name,
    actual.actual_oid,
    actual.proowner,
    acl.grantee,
    acl.privilege_type,
    acl.is_grantable
  FROM actual
  CROSS JOIN LATERAL pg_catalog.aclexplode(
    COALESCE(
      actual.proacl,
      CASE
        WHEN actual.proowner IS NOT NULL
          THEN pg_catalog.acldefault('f', actual.proowner)
        ELSE NULL::aclitem[]
      END
    )
  ) AS acl
  WHERE actual.actual_oid IS NOT NULL
),
checks AS (
  SELECT
    actual.*,
    actual.actual_oid IS NOT NULL AS signature_ok,
    actual.proargnames IS NOT DISTINCT FROM actual.argument_names AS argument_names_ok,
    actual.prorettype IS NOT DISTINCT FROM 'pg_catalog.text'::regtype::oid AS return_type_ok,
    actual.owner_name = 'postgres' AS owner_ok,
    actual.prosecdef IS TRUE AS security_definer_ok,
    actual.proconfig = ARRAY['search_path=pg_catalog, extensions']::text[] AS fixed_search_path_ok,
    CASE actual.rpc_name
      WHEN 'encrypt' THEN
        pg_catalog.lower(pg_catalog.regexp_replace(actual.prosrc, '\s+', '', 'g')) =
          'selectencode(pgp_sym_encrypt(plaintext,passphrase,''cipher-algo=aes256''),''base64'');'
      WHEN 'decrypt' THEN
        pg_catalog.lower(pg_catalog.regexp_replace(actual.prosrc, '\s+', '', 'g')) =
          'selectpgp_sym_decrypt(decode(ciphertext,''base64''),passphrase);'
    END AS body_ok,
    COALESCE(
      actual.actual_oid IS NOT NULL
      AND pg_catalog.to_regrole('service_role') IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM acl_entries AS acl
        WHERE acl.rpc_name = actual.rpc_name
          AND acl.privilege_type = 'EXECUTE'
          AND acl.grantee = pg_catalog.to_regrole('service_role')::oid
          AND acl.is_grantable IS FALSE
      )
      AND NOT EXISTS (
        SELECT 1
        FROM acl_entries AS acl
        WHERE acl.rpc_name = actual.rpc_name
          AND acl.privilege_type = 'EXECUTE'
          AND acl.grantee NOT IN (
            actual.proowner,
            pg_catalog.to_regrole('service_role')::oid
          )
      )
      AND pg_catalog.to_regrole('anon') IS NOT NULL
      AND NOT pg_catalog.has_function_privilege(
        pg_catalog.to_regrole('anon')::oid,
        actual.actual_oid,
        'EXECUTE'
      )
      AND pg_catalog.to_regrole('authenticated') IS NOT NULL
      AND NOT pg_catalog.has_function_privilege(
        pg_catalog.to_regrole('authenticated')::oid,
        actual.actual_oid,
        'EXECUTE'
      ),
      FALSE
    ) AS service_role_only_execution_ok
  FROM actual
)
SELECT
  COALESCE((SELECT signature_ok FROM checks WHERE rpc_name = 'encrypt'), FALSE)
    AS encrypt_signature_ok,
  COALESCE((SELECT argument_names_ok FROM checks WHERE rpc_name = 'encrypt'), FALSE)
    AS encrypt_argument_names_ok,
  COALESCE((SELECT return_type_ok FROM checks WHERE rpc_name = 'encrypt'), FALSE)
    AS encrypt_return_type_ok,
  COALESCE((SELECT owner_ok FROM checks WHERE rpc_name = 'encrypt'), FALSE)
    AS encrypt_owner_postgres_ok,
  COALESCE((SELECT security_definer_ok FROM checks WHERE rpc_name = 'encrypt'), FALSE)
    AS encrypt_security_definer_ok,
  COALESCE((SELECT fixed_search_path_ok FROM checks WHERE rpc_name = 'encrypt'), FALSE)
    AS encrypt_fixed_search_path_ok,
  COALESCE((SELECT body_ok FROM checks WHERE rpc_name = 'encrypt'), FALSE)
    AS encrypt_aes256_base64_ok,
  COALESCE((SELECT service_role_only_execution_ok FROM checks WHERE rpc_name = 'encrypt'), FALSE)
    AS encrypt_service_role_only_execution_ok,
  COALESCE((SELECT signature_ok FROM checks WHERE rpc_name = 'decrypt'), FALSE)
    AS decrypt_signature_ok,
  COALESCE((SELECT argument_names_ok FROM checks WHERE rpc_name = 'decrypt'), FALSE)
    AS decrypt_argument_names_ok,
  COALESCE((SELECT return_type_ok FROM checks WHERE rpc_name = 'decrypt'), FALSE)
    AS decrypt_return_type_ok,
  COALESCE((SELECT owner_ok FROM checks WHERE rpc_name = 'decrypt'), FALSE)
    AS decrypt_owner_postgres_ok,
  COALESCE((SELECT security_definer_ok FROM checks WHERE rpc_name = 'decrypt'), FALSE)
    AS decrypt_security_definer_ok,
  COALESCE((SELECT fixed_search_path_ok FROM checks WHERE rpc_name = 'decrypt'), FALSE)
    AS decrypt_fixed_search_path_ok,
  COALESCE((SELECT body_ok FROM checks WHERE rpc_name = 'decrypt'), FALSE)
    AS decrypt_base64_decode_ok,
  COALESCE((SELECT service_role_only_execution_ok FROM checks WHERE rpc_name = 'decrypt'), FALSE)
    AS decrypt_service_role_only_execution_ok,
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS rel
    JOIN pg_catalog.pg_namespace AS ns
      ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = 'broker_credentials'
      AND rel.relkind IN ('r', 'p')
  ) AS broker_credentials_table_exists,
  pg_catalog.to_regclass('public.broker_connections') IS NULL
    AND pg_catalog.to_regclass('public.trading_account_broker_connections') IS NULL
    AS central_broker_tables_absent;
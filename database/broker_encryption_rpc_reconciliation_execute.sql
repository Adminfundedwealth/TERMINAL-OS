-- Reconcile the two existing broker-encryption RPCs only.
-- Run only after reviewing the BEFORE guards below.
BEGIN;

DO $reconciliation_guard$
DECLARE
  v_encrypt_oid oid;
  v_decrypt_oid oid;
  v_encrypt pg_catalog.pg_proc%ROWTYPE;
  v_decrypt pg_catalog.pg_proc%ROWTYPE;
  v_sql_language_oid oid;
  v_encrypt_body text;
  v_decrypt_body text;
BEGIN
  v_encrypt_oid := pg_catalog.to_regprocedure(
    'public.encrypt_broker_credentials(text,text)'
  )::oid;
  v_decrypt_oid := pg_catalog.to_regprocedure(
    'public.decrypt_broker_credentials(text,text)'
  )::oid;

  IF v_encrypt_oid IS NULL OR v_decrypt_oid IS NULL THEN
    RAISE EXCEPTION 'Expected both public broker-encryption RPC signatures to exist';
  END IF;

  SELECT oid
  INTO v_sql_language_oid
  FROM pg_catalog.pg_language
  WHERE lanname = 'sql';

  SELECT *
  INTO STRICT v_encrypt
  FROM pg_catalog.pg_proc
  WHERE oid = v_encrypt_oid;

  SELECT *
  INTO STRICT v_decrypt
  FROM pg_catalog.pg_proc
  WHERE oid = v_decrypt_oid;

    IF v_sql_language_oid IS NULL
      OR v_encrypt.prokind <> 'f'
      OR v_encrypt.prolang IS DISTINCT FROM v_sql_language_oid
     OR v_encrypt.proargnames IS DISTINCT FROM ARRAY['plaintext', 'passphrase']::text[]
     OR v_encrypt.prorettype <> 'pg_catalog.text'::regtype::oid
     OR v_encrypt.prosecdef IS NOT TRUE
     OR NOT EXISTS (
       SELECT 1
       FROM pg_catalog.pg_roles
       WHERE oid = v_encrypt.proowner
         AND rolname = 'postgres'
     ) THEN
    RAISE EXCEPTION 'encrypt_broker_credentials signature, owner, language, or security state is unexpected';
  END IF;

    IF v_sql_language_oid IS NULL
      OR v_decrypt.prokind <> 'f'
      OR v_decrypt.prolang IS DISTINCT FROM v_sql_language_oid
     OR v_decrypt.proargnames IS DISTINCT FROM ARRAY['ciphertext', 'passphrase']::text[]
     OR v_decrypt.prorettype <> 'pg_catalog.text'::regtype::oid
     OR v_decrypt.prosecdef IS NOT TRUE
     OR NOT EXISTS (
       SELECT 1
       FROM pg_catalog.pg_roles
       WHERE oid = v_decrypt.proowner
         AND rolname = 'postgres'
     ) THEN
    RAISE EXCEPTION 'decrypt_broker_credentials signature, owner, language, or security state is unexpected';
  END IF;

  IF v_encrypt.proconfig IS NOT NULL
     AND v_encrypt.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, extensions']::text[] THEN
    RAISE EXCEPTION 'encrypt_broker_credentials has an unexpected function configuration';
  END IF;

  IF v_decrypt.proconfig IS NOT NULL
     AND v_decrypt.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, extensions']::text[] THEN
    RAISE EXCEPTION 'decrypt_broker_credentials has an unexpected function configuration';
  END IF;

  v_encrypt_body := pg_catalog.lower(
    pg_catalog.regexp_replace(v_encrypt.prosrc, '\s+', '', 'g')
  );
  v_decrypt_body := pg_catalog.lower(
    pg_catalog.regexp_replace(v_decrypt.prosrc, '\s+', '', 'g')
  );

  IF v_encrypt_body NOT IN (
    'selectencode(pgp_sym_encrypt(plaintext,passphrase),''base64'');',
    'selectencode(pgp_sym_encrypt(plaintext,passphrase,''cipher-algo=aes256''),''base64'');'
  ) THEN
    RAISE EXCEPTION 'encrypt_broker_credentials body is not a recognized legacy or target definition';
  END IF;

  IF v_decrypt_body <> 'selectpgp_sym_decrypt(decode(ciphertext,''base64''),passphrase);' THEN
    RAISE EXCEPTION 'decrypt_broker_credentials body is not the recognized definition';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'service_role')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    RAISE EXCEPTION 'Expected Supabase service_role, anon, and authenticated roles to exist';
  END IF;
END;
$reconciliation_guard$;

CREATE OR REPLACE FUNCTION public.encrypt_broker_credentials(
  plaintext text,
  passphrase text
)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, extensions
AS $function$
  SELECT encode(
    pgp_sym_encrypt(plaintext, passphrase, 'cipher-algo=aes256'),
    'base64'
  );
$function$;

CREATE OR REPLACE FUNCTION public.decrypt_broker_credentials(
  ciphertext text,
  passphrase text
)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, extensions
AS $function$
  SELECT pgp_sym_decrypt(
    decode(ciphertext, 'base64'),
    passphrase
  );
$function$;

REVOKE ALL ON FUNCTION public.encrypt_broker_credentials(text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrypt_broker_credentials(text, text)
  FROM PUBLIC, anon, authenticated;

DO $execution_acl_cleanup$
DECLARE
  v_function_oid oid;
  v_function_owner oid;
  v_grantee oid;
  v_grantee_name name;
BEGIN
  FOR v_function_oid IN
    SELECT pg_catalog.to_regprocedure(signature)::oid
    FROM (VALUES
      ('public.encrypt_broker_credentials(text,text)'),
      ('public.decrypt_broker_credentials(text,text)')
    ) AS functions(signature)
  LOOP
    SELECT proowner
    INTO STRICT v_function_owner
    FROM pg_catalog.pg_proc
    WHERE oid = v_function_oid;

    FOR v_grantee IN
      SELECT DISTINCT acl.grantee
      FROM pg_catalog.pg_proc AS procedure
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(
          procedure.proacl,
          pg_catalog.acldefault('f', procedure.proowner)
        )
      ) AS acl
      WHERE procedure.oid = v_function_oid
        AND acl.privilege_type = 'EXECUTE'
        AND acl.grantee <> v_function_owner
        AND acl.grantee <> (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'service_role')
    LOOP
      IF v_grantee = 0 THEN
        EXECUTE pg_catalog.format(
          'REVOKE ALL ON FUNCTION %s FROM PUBLIC',
          v_function_oid::regprocedure
        );
      ELSE
        SELECT rolname
        INTO STRICT v_grantee_name
        FROM pg_catalog.pg_roles
        WHERE oid = v_grantee;

        EXECUTE pg_catalog.format(
          'REVOKE ALL ON FUNCTION %s FROM %I',
          v_function_oid::regprocedure,
          v_grantee_name
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$execution_acl_cleanup$;

GRANT EXECUTE ON FUNCTION public.encrypt_broker_credentials(text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_broker_credentials(text, text)
  TO service_role;

COMMIT;
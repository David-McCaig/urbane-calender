-- Revoke PUBLIC + authenticated access to the encryption key function.
-- Postgres grants EXECUTE to PUBLIC by default on function creation.
-- The key must only be readable by SECURITY DEFINER functions (which run
-- as the postgres owner), never directly via PostgREST.

DO $$
BEGIN
  IF to_regprocedure('public.get_lightspeed_encryption_key()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_lightspeed_encryption_key() FROM PUBLIC';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_lightspeed_encryption_key() FROM authenticated';
  END IF;
END
$$;

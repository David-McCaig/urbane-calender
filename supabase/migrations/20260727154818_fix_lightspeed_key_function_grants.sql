-- Revoke PUBLIC + authenticated access to the encryption key function.
-- Postgres grants EXECUTE to PUBLIC by default on function creation.
-- The key must only be readable by SECURITY DEFINER functions (which run
-- as the postgres owner), never directly via PostgREST.

REVOKE EXECUTE ON FUNCTION get_lightspeed_encryption_key() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_lightspeed_encryption_key() FROM authenticated;

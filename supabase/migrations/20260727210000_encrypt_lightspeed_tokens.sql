-- Encrypt Lightspeed OAuth tokens at rest using pgcrypto + Vault.
-- Replaces plaintext access_token/refresh_token columns with BYTEA columns
-- encrypted via pgp_sym_encrypt. The encryption key is stored in Vault
-- and never exposed to the application layer.
--
-- Application code reads/writes tokens through SECURITY DEFINER functions
-- that decrypt/encrypt internally. Direct table access returns only
-- encrypted bytes (safe but unusable).

-- 1. Store encryption key in Vault (idempotent — only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'lightspeed_encryption_key'
  ) THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'lightspeed_encryption_key',
      'Key for encrypting Lightspeed OAuth access/refresh tokens'
    );
  END IF;
END $$;

-- 2. Add encrypted BYTEA columns
ALTER TABLE lightspeed_integrations
  ADD COLUMN IF NOT EXISTS access_token_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted BYTEA;

-- 3. Migrate existing plaintext data to encrypted columns
DO $$
DECLARE
  v_key TEXT;
BEGIN
  -- Only run if the old text column still exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lightspeed_integrations'
      AND column_name = 'access_token'
  ) THEN
    SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
    WHERE name = 'lightspeed_encryption_key';

    IF v_key IS NOT NULL THEN
      UPDATE lightspeed_integrations
      SET
        access_token_encrypted = extensions.pgp_sym_encrypt(access_token, v_key),
        refresh_token_encrypted = CASE
          WHEN refresh_token IS NOT NULL
          THEN extensions.pgp_sym_encrypt(refresh_token, v_key)
          ELSE NULL
        END
      WHERE access_token_encrypted IS NULL;
    END IF;
  END IF;
END $$;

-- 4. Drop old plaintext columns
ALTER TABLE lightspeed_integrations
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token;

-- 5. Add NOT NULL constraint on the encrypted access token column
-- (refresh_token_encrypted stays nullable — refresh token is optional)
ALTER TABLE lightspeed_integrations
  ALTER COLUMN access_token_encrypted SET NOT NULL;

-- 6. Create SECURITY DEFINER helper: reads encryption key from Vault.
-- NOT exposed to PostgREST — only other SECURITY DEFINER functions
-- (which run as owner) can call it. The search_path is locked down.
CREATE OR REPLACE FUNCTION get_lightspeed_encryption_key()
RETURNS TEXT
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
  v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'lightspeed_encryption_key';

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Lightspeed encryption key not found in Vault';
  END IF;

  RETURN v_key;
END;
$$;

-- Revoke default PUBLIC grant (Postgres auto-grants EXECUTE to PUBLIC on
-- function creation). Then grant only to service_role for debugging.
-- authenticated/anonymous must NEVER call this function directly via PostgREST.
REVOKE EXECUTE ON FUNCTION get_lightspeed_encryption_key() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_lightspeed_encryption_key() FROM authenticated;
GRANT EXECUTE ON FUNCTION get_lightspeed_encryption_key() TO service_role;

-- 7. Create SECURITY DEFINER function: returns decrypted integration row.
-- Verifies the caller is a member of the target shop (direct membership
-- check, not get_user_shop_id(), so it works even when the JWT lacks
-- active_shop_id — e.g. during OAuth callback bootstrap).
CREATE OR REPLACE FUNCTION get_decrypted_lightspeed_integration(
  p_shop_id UUID
)
RETURNS TABLE(
  id UUID,
  shop_id UUID,
  integration_type TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  account_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
  v_key TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_shop_memberships
    WHERE user_id = auth.uid() AND user_shop_memberships.shop_id = p_shop_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of shop %', p_shop_id;
  END IF;

  v_key := public.get_lightspeed_encryption_key();

  RETURN QUERY
  SELECT
    li.id,
    li.shop_id,
    li.integration_type,
    extensions.pgp_sym_decrypt(li.access_token_encrypted, v_key)::TEXT,
    CASE
      WHEN li.refresh_token_encrypted IS NOT NULL
      THEN extensions.pgp_sym_decrypt(li.refresh_token_encrypted, v_key)::TEXT
      ELSE NULL
    END,
    li.expires_at,
    li.account_id,
    li.created_at,
    li.updated_at
  FROM public.lightspeed_integrations li
  WHERE li.shop_id = p_shop_id
    AND li.integration_type = 'lightspeed';
END;
$$;

-- 8. Create SECURITY DEFINER function: encrypts and upserts tokens.
-- Same membership check — works for both OAuth callback (bootstrap)
-- and token refresh (normal operation).
CREATE OR REPLACE FUNCTION upsert_lightspeed_integration(
  p_shop_id UUID,
  p_access_token TEXT,
  p_refresh_token TEXT,
  p_expires_at TIMESTAMPTZ,
  p_account_id TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
  v_key TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_shop_memberships
    WHERE user_id = auth.uid() AND user_shop_memberships.shop_id = p_shop_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of shop %', p_shop_id;
  END IF;

  v_key := public.get_lightspeed_encryption_key();

  INSERT INTO public.lightspeed_integrations (
    shop_id,
    integration_type,
    access_token_encrypted,
    refresh_token_encrypted,
    expires_at,
    account_id
  )
  VALUES (
    p_shop_id,
    'lightspeed',
    extensions.pgp_sym_encrypt(p_access_token, v_key),
    CASE
      WHEN p_refresh_token IS NOT NULL
      THEN extensions.pgp_sym_encrypt(p_refresh_token, v_key)
      ELSE NULL
    END,
    p_expires_at,
    p_account_id
  )
  ON CONFLICT (shop_id, integration_type)
  DO UPDATE SET
    access_token_encrypted = EXCLUDED.access_token_encrypted,
    refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
    expires_at = EXCLUDED.expires_at,
    account_id = EXCLUDED.account_id;
END;
$$;

-- 9. Grant EXECUTE on the two public functions
GRANT EXECUTE ON FUNCTION get_decrypted_lightspeed_integration(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_decrypted_lightspeed_integration(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION upsert_lightspeed_integration(UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_lightspeed_integration(UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT) TO service_role;

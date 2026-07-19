-- Add Lightspeed OAuth integration support
-- Stores encrypted OAuth tokens per shop for Lightspeed API access.
-- Uses Supabase Vault (pgsodium) for transparent column encryption.

-- 0. Add Lightspeed account ID to shops for sync
ALTER TABLE shops ADD COLUMN IF NOT EXISTS lightspeed_account_id TEXT;

-- 1. Enable extensions
CREATE EXTENSION IF NOT EXISTS pgsodium CASCADE;
CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE;

-- 2. Create table
CREATE TABLE IF NOT EXISTS lightspeed_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL DEFAULT 'lightspeed',
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, integration_type)
);

CREATE INDEX IF NOT EXISTS idx_lightspeed_integrations_shop_type
  ON lightspeed_integrations(shop_id, integration_type);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_lightspeed_integrations_updated_at ON lightspeed_integrations;
CREATE TRIGGER update_lightspeed_integrations_updated_at
  BEFORE UPDATE ON lightspeed_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Transparent Column Encryption via Supabase Vault
-- Each row's token columns are encrypted at rest using a key derived from the row id.
-- Application code reads/writes plaintext — encryption/decryption is transparent.
SECURITY LABEL FOR pgsodium ON COLUMN lightspeed_integrations.access_token
  IS 'ENCRYPT WITH KEY COLUMN lightspeed_integrations.id';

SECURITY LABEL FOR pgsodium ON COLUMN lightspeed_integrations.refresh_token
  IS 'ENCRYPT WITH KEY COLUMN lightspeed_integrations.refresh_token';

-- 4. RLS — role-gated
ALTER TABLE lightspeed_integrations ENABLE ROW LEVEL SECURITY;

-- Any member can initiate OAuth connect (INSERT their own shop's tokens)
DROP POLICY IF EXISTS "Members can insert integrations for their shop" ON lightspeed_integrations;
CREATE POLICY "Members can insert integrations for their shop" ON lightspeed_integrations
  FOR INSERT WITH CHECK (shop_id = get_user_shop_id());

-- Only owners and managers can read tokens
DROP POLICY IF EXISTS "Owners and managers can view integrations" ON lightspeed_integrations;
CREATE POLICY "Owners and managers can view integrations" ON lightspeed_integrations
  FOR SELECT USING (
    shop_id = get_user_shop_id()
    AND get_user_shop_role() IN ('owner', 'manager')
  );

-- Only owners and managers can update tokens
DROP POLICY IF EXISTS "Owners and managers can update integrations" ON lightspeed_integrations;
CREATE POLICY "Owners and managers can update integrations" ON lightspeed_integrations
  FOR UPDATE USING (
    shop_id = get_user_shop_id()
    AND get_user_shop_role() IN ('owner', 'manager')
  );

-- Only owners can delete (disconnect Lightspeed)
DROP POLICY IF EXISTS "Owners can delete integrations" ON lightspeed_integrations;
CREATE POLICY "Owners can delete integrations" ON lightspeed_integrations
  FOR DELETE USING (
    shop_id = get_user_shop_id()
    AND get_user_shop_role() = 'owner'
  );

-- 5. Grants
GRANT ALL ON lightspeed_integrations TO authenticated;

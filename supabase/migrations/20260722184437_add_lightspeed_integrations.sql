-- Add Lightspeed OAuth integration support
-- Stores OAuth tokens for Lightspeed Retail POS (R-Series) API connections.
-- Tokens are plaintext; protected by RLS + server-side-only access.
-- Vault/pgsodium encryption can be added later when plan supports it.

-- 1. Add Lightspeed account ID to shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS lightspeed_account_id TEXT;

-- 2. Create lightspeed_integrations table
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

-- 3. Index for fast lookup by shop + integration type
CREATE INDEX IF NOT EXISTS idx_lightspeed_integrations_shop_type
  ON lightspeed_integrations(shop_id, integration_type);

-- 4. updated_at trigger (reuses existing function)
DROP TRIGGER IF EXISTS update_lightspeed_integrations_updated_at ON lightspeed_integrations;
CREATE TRIGGER update_lightspeed_integrations_updated_at
  BEFORE UPDATE ON lightspeed_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable RLS
ALTER TABLE lightspeed_integrations ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies

-- Any member can initiate OAuth connect (INSERT their own shop's tokens)
DROP POLICY IF EXISTS "Members can insert integrations for their shop" ON lightspeed_integrations;
CREATE POLICY "Members can insert integrations for their shop" ON lightspeed_integrations
  FOR INSERT WITH CHECK (shop_id = get_user_shop_id());

-- Any member can read the integration (needed for token access across all roles)
DROP POLICY IF EXISTS "Members can view integrations for their shop" ON lightspeed_integrations;
CREATE POLICY "Members can view integrations for their shop" ON lightspeed_integrations
  FOR SELECT USING (shop_id = get_user_shop_id());

-- Any member can update tokens (refresh extends existing access, doesn't grant new permissions)
DROP POLICY IF EXISTS "Members can update integrations for their shop" ON lightspeed_integrations;
CREATE POLICY "Members can update integrations for their shop" ON lightspeed_integrations
  FOR UPDATE USING (shop_id = get_user_shop_id());

-- Only owners can delete (disconnect Lightspeed entirely)
DROP POLICY IF EXISTS "Owners can delete integrations" ON lightspeed_integrations;
CREATE POLICY "Owners can delete integrations" ON lightspeed_integrations
  FOR DELETE USING (
    shop_id = get_user_shop_id()
    AND get_user_shop_role() = 'owner'
  );

-- 7. Grants
GRANT ALL ON lightspeed_integrations TO authenticated;

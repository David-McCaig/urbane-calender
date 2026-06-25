-- Add multi-user membership system
-- Enables multiple users per shop with role-based access control

-- 1. Create enum for membership roles
DO $$ BEGIN
  CREATE TYPE membership_role AS ENUM ('owner', 'manager', 'mechanic');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create user_shop_memberships table
CREATE TABLE IF NOT EXISTS user_shop_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  role membership_role NOT NULL DEFAULT 'mechanic',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, shop_id)
);

CREATE INDEX IF NOT EXISTS idx_user_shop_memberships_user_id ON user_shop_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shop_memberships_shop_id ON user_shop_memberships(shop_id);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_user_shop_memberships_updated_at ON user_shop_memberships;
CREATE TRIGGER update_user_shop_memberships_updated_at
  BEFORE UPDATE ON user_shop_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role membership_role NOT NULL DEFAULT 'mechanic',
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

-- 4. Backfill existing users into user_shop_memberships
-- Any user with shop_id in their metadata becomes an owner of that shop
INSERT INTO user_shop_memberships (user_id, shop_id, role)
SELECT
  id AS user_id,
  (raw_user_meta_data->>'shop_id')::UUID AS shop_id,
  'owner' AS role
FROM auth.users
WHERE raw_user_meta_data->>'shop_id' IS NOT NULL
  AND (raw_user_meta_data->>'shop_id')::UUID IS NOT NULL
ON CONFLICT (user_id, shop_id) DO NOTHING;

-- 5. Update get_user_shop_id() with membership fallback
-- Priority: active_shop_id (user_metadata) > shop_id (user_metadata) >
--   shop_id (app_metadata) > first membership row
CREATE OR REPLACE FUNCTION get_user_shop_id()
RETURNS UUID AS $$
DECLARE
  shop_id_val UUID;
  uid UUID;
BEGIN
  -- First try active_shop_id from JWT user_metadata (new multi-shop field)
  BEGIN
    shop_id_val := ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'active_shop_id')::UUID;
    IF shop_id_val IS NOT NULL THEN
      RETURN shop_id_val;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Continue to next fallback
  END;

  -- Then try the old shop_id from JWT user_metadata (backward compat)
  BEGIN
    shop_id_val := ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'shop_id')::UUID;
    IF shop_id_val IS NOT NULL THEN
      RETURN shop_id_val;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Continue to next fallback
  END;

  -- Then try app_metadata (backward compat)
  BEGIN
    shop_id_val := ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'shop_id')::UUID;
    IF shop_id_val IS NOT NULL THEN
      RETURN shop_id_val;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Continue to next fallback
  END;

  -- Fallback: get the first shop the user belongs to via memberships
  uid := auth.uid();
  IF uid IS NOT NULL THEN
    SELECT usm.shop_id INTO shop_id_val
    FROM user_shop_memberships usm
    WHERE usm.user_id = uid
    ORDER BY usm.created_at ASC
    LIMIT 1;
  END IF;

  RETURN shop_id_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create role-checking function
CREATE OR REPLACE FUNCTION get_user_shop_role()
RETURNS membership_role AS $$
DECLARE
  role_val membership_role;
  uid UUID;
  shop_id_val UUID;
BEGIN
  uid := auth.uid();
  shop_id_val := get_user_shop_id();

  IF uid IS NOT NULL AND shop_id_val IS NOT NULL THEN
    SELECT usm.role INTO role_val
    FROM user_shop_memberships usm
    WHERE usm.user_id = uid AND usm.shop_id = shop_id_val;
  END IF;

  RETURN role_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS for user_shop_memberships
ALTER TABLE user_shop_memberships ENABLE ROW LEVEL SECURITY;

-- Users can view memberships for shops they belong to, or their own memberships
CREATE POLICY "Users can view memberships for their shops" ON user_shop_memberships
  FOR SELECT USING (
    shop_id IN (
      SELECT usm2.shop_id FROM user_shop_memberships usm2
      WHERE usm2.user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Only owners can insert new memberships
CREATE POLICY "Owners can insert memberships" ON user_shop_memberships
  FOR INSERT WITH CHECK (
    get_user_shop_role() = 'owner'
    AND shop_id = get_user_shop_id()
  );

-- Owners can update memberships in their shop; users can update nothing
CREATE POLICY "Owners can update memberships" ON user_shop_memberships
  FOR UPDATE USING (
    get_user_shop_role() = 'owner'
    AND shop_id = get_user_shop_id()
  );

-- Only owners can delete memberships
CREATE POLICY "Owners can delete memberships" ON user_shop_memberships
  FOR DELETE USING (
    get_user_shop_role() = 'owner'
    AND shop_id = get_user_shop_id()
  );

-- 8. RLS for invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view invitations for their shop" ON invitations
  FOR SELECT USING (
    shop_id IN (
      SELECT usm.shop_id FROM user_shop_memberships usm
      WHERE usm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can create invitations" ON invitations
  FOR INSERT WITH CHECK (
    get_user_shop_role() = 'owner'
    AND shop_id = get_user_shop_id()
  );

CREATE POLICY "Owners can delete invitations" ON invitations
  FOR DELETE USING (
    get_user_shop_role() = 'owner'
    AND shop_id = get_user_shop_id()
  );

-- 9. Role-based RLS policy updates on existing tables

-- Shops: only owners can update
DROP POLICY IF EXISTS "Users can update their own shop" ON shops;
CREATE POLICY "Users can update their own shop" ON shops
  FOR UPDATE USING (
    id = get_user_shop_id()
    AND get_user_shop_role() = 'owner'
  );

-- Mechanics: owners & managers can insert/update/delete (mechanics can only SELECT)
DROP POLICY IF EXISTS "Users can insert mechanics for their shop" ON mechanics;
CREATE POLICY "Users can insert mechanics for their shop" ON mechanics
  FOR INSERT WITH CHECK (
    shop_id = get_user_shop_id()
    AND get_user_shop_role() IN ('owner', 'manager')
  );

DROP POLICY IF EXISTS "Users can update mechanics from their shop" ON mechanics;
CREATE POLICY "Users can update mechanics from their shop" ON mechanics
  FOR UPDATE USING (
    shop_id = get_user_shop_id()
    AND get_user_shop_role() IN ('owner', 'manager')
  );

DROP POLICY IF EXISTS "Users can delete mechanics from their shop" ON mechanics;
CREATE POLICY "Users can delete mechanics from their shop" ON mechanics
  FOR DELETE USING (
    shop_id = get_user_shop_id()
    AND get_user_shop_role() IN ('owner', 'manager')
  );

-- Jobs: all shop members can view/insert; owners & managers can update/delete
DROP POLICY IF EXISTS "Users can update jobs from their shop" ON jobs;
CREATE POLICY "Users can update jobs from their shop" ON jobs
  FOR UPDATE USING (
    shop_id = get_user_shop_id()
    AND get_user_shop_role() IN ('owner', 'manager')
  );

DROP POLICY IF EXISTS "Users can delete jobs from their shop" ON jobs;
CREATE POLICY "Users can delete jobs from their shop" ON jobs
  FOR DELETE USING (
    shop_id = get_user_shop_id()
    AND get_user_shop_role() IN ('owner', 'manager')
  );

-- Scheduled jobs: same role restrictions as jobs
DROP POLICY IF EXISTS "Users can update scheduled jobs from their shop" ON scheduled_jobs;
CREATE POLICY "Users can update scheduled jobs from their shop" ON scheduled_jobs
  FOR UPDATE USING (
    shop_id = get_user_shop_id()
    AND get_user_shop_role() IN ('owner', 'manager')
  );

DROP POLICY IF EXISTS "Users can delete scheduled jobs from their shop" ON scheduled_jobs;
CREATE POLICY "Users can delete scheduled jobs from their shop" ON scheduled_jobs
  FOR DELETE USING (
    shop_id = get_user_shop_id()
    AND get_user_shop_role() IN ('owner', 'manager')
  );

-- 10. Grant permissions on new tables and type
GRANT USAGE ON TYPE membership_role TO authenticated;
GRANT ALL ON user_shop_memberships TO authenticated;
GRANT ALL ON invitations TO authenticated;

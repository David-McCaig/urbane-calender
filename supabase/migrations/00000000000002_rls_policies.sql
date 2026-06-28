-- RLS policies — all policies in their final form
-- Squashed from migrations 20241201–20260628 (incorporates fix migrations
-- for INSERT policies, membership SELECT policy, and role-aware policies)

-- 1. Enable RLS on all tables -----------------------------------------------

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanics ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_shop_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- 2. shops ------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own shop" ON shops;
CREATE POLICY "Users can view their own shop" ON shops
  FOR SELECT USING (id = get_user_shop_id());

DROP POLICY IF EXISTS "Users can insert their own shop" ON shops;
CREATE POLICY "Users can insert their own shop" ON shops
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own shop" ON shops;
CREATE POLICY "Users can update their own shop" ON shops
  FOR UPDATE USING (
    id = get_user_shop_id()
    AND get_user_shop_role() = 'owner'
  );

-- 3. mechanics --------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view mechanics from their shop" ON mechanics;
CREATE POLICY "Users can view mechanics from their shop" ON mechanics
  FOR SELECT USING (shop_id = get_user_shop_id());

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

-- 4. work_order_statuses ----------------------------------------------------

DROP POLICY IF EXISTS "Users can view all work order statuses" ON work_order_statuses;
CREATE POLICY "Users can view all work order statuses" ON work_order_statuses
  FOR SELECT USING (true);

-- 5. jobs -------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view jobs from their shop" ON jobs;
CREATE POLICY "Users can view jobs from their shop" ON jobs
  FOR SELECT USING (shop_id = get_user_shop_id());

DROP POLICY IF EXISTS "Users can insert jobs for their shop" ON jobs;
CREATE POLICY "Users can insert jobs for their shop" ON jobs
  FOR INSERT WITH CHECK (shop_id = get_user_shop_id());

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

-- 6. scheduled_jobs ---------------------------------------------------------

DROP POLICY IF EXISTS "Users can view scheduled jobs from their shop" ON scheduled_jobs;
CREATE POLICY "Users can view scheduled jobs from their shop" ON scheduled_jobs
  FOR SELECT USING (shop_id = get_user_shop_id());

DROP POLICY IF EXISTS "Users can insert scheduled jobs for their shop" ON scheduled_jobs;
CREATE POLICY "Users can insert scheduled jobs for their shop" ON scheduled_jobs
  FOR INSERT WITH CHECK (shop_id = get_user_shop_id());

DROP POLICY IF EXISTS "Users can update scheduled jobs from their shop" ON scheduled_jobs;
CREATE POLICY "Users can update scheduled jobs from their shop" ON scheduled_jobs
  FOR UPDATE USING (shop_id = get_user_shop_id());

DROP POLICY IF EXISTS "Users can delete scheduled jobs from their shop" ON scheduled_jobs;
CREATE POLICY "Users can delete scheduled jobs from their shop" ON scheduled_jobs
  FOR DELETE USING (shop_id = get_user_shop_id());

-- 7. user_shop_memberships --------------------------------------------------

DROP POLICY IF EXISTS "Users can view members in their shops" ON user_shop_memberships;
DROP POLICY IF EXISTS "Users can view their own membership" ON user_shop_memberships;
DROP POLICY IF EXISTS "Users can view memberships for their shops" ON user_shop_memberships;
CREATE POLICY "Users can view members in their shops" ON user_shop_memberships
  FOR SELECT USING (
    user_id = auth.uid()
    OR shop_id = get_user_shop_id()
  );

DROP POLICY IF EXISTS "Users can insert own membership" ON user_shop_memberships;
DROP POLICY IF EXISTS "Owners can insert memberships" ON user_shop_memberships;
CREATE POLICY "Users can insert own membership" ON user_shop_memberships
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update memberships" ON user_shop_memberships;
CREATE POLICY "Owners can update memberships" ON user_shop_memberships
  FOR UPDATE USING (
    get_user_shop_role() = 'owner'
    AND shop_id = get_user_shop_id()
  );

DROP POLICY IF EXISTS "Owners can delete memberships" ON user_shop_memberships;
CREATE POLICY "Owners can delete memberships" ON user_shop_memberships
  FOR DELETE USING (
    get_user_shop_role() = 'owner'
    AND shop_id = get_user_shop_id()
  );

-- 8. invitations ------------------------------------------------------------

DROP POLICY IF EXISTS "Members can view invitations for their shop" ON invitations;
CREATE POLICY "Members can view invitations for their shop" ON invitations
  FOR SELECT USING (
    shop_id IN (
      SELECT usm.shop_id FROM user_shop_memberships usm
      WHERE usm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can create invitations" ON invitations;
CREATE POLICY "Owners can create invitations" ON invitations
  FOR INSERT WITH CHECK (
    get_user_shop_role() = 'owner'
    AND shop_id = get_user_shop_id()
  );

DROP POLICY IF EXISTS "Owners can delete invitations" ON invitations;
CREATE POLICY "Owners can delete invitations" ON invitations
  FOR DELETE USING (
    get_user_shop_role() = 'owner'
    AND shop_id = get_user_shop_id()
  );

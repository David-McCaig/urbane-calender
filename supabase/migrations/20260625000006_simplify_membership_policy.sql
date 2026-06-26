-- Simplify the user_shop_memberships SELECT policy
-- Avoid any self-referencing subqueries to prevent RLS recursion

DROP POLICY IF EXISTS "Users can view memberships for their shops" ON user_shop_memberships;
DROP POLICY IF EXISTS "Users can view their own membership" ON user_shop_memberships;
DROP POLICY IF EXISTS "Users can view members in their shops" ON user_shop_memberships;

-- Each user can see their own membership rows
-- (sufficient for ShopContext; members page will need a future fix)
CREATE POLICY "Users can view their own membership" ON user_shop_memberships
  FOR SELECT USING (
    user_id = auth.uid()
  );

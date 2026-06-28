-- Fix: allow users to see all members in their active shop, not just their own row.
-- The previous minimal policy ("Users can view their own membership") was too
-- restrictive for the members page, where owners/managers need to see all members.
--
-- get_user_shop_id() is SECURITY DEFINER, so it bypasses RLS and prevents recursion.

DROP POLICY IF EXISTS "Users can view their own membership" ON user_shop_memberships;

CREATE POLICY "Users can view members in their shops" ON user_shop_memberships
  FOR SELECT USING (
    user_id = auth.uid()
    OR shop_id = get_user_shop_id()
  );

-- Fix INSERT policies that blocked new users from creating their first shop.
-- The original policies depended on get_user_shop_id(), which returns NULL for
-- users with no memberships, making the WITH CHECK always evaluate to NULL/false.

-- 1. Shops INSERT: any authenticated user can create a shop.
--    Safe because shops have no ownership column; access is controlled via memberships.
DROP POLICY IF EXISTS "Users can insert their own shop" ON shops;
CREATE POLICY "Users can insert their own shop" ON shops
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Memberships INSERT: users can only create memberships for themselves.
--    Combined with UNIQUE(user_id, shop_id) and unguessable UUIDs, this is safe.
DROP POLICY IF EXISTS "Owners can insert memberships" ON user_shop_memberships;
CREATE POLICY "Owners can insert memberships" ON user_shop_memberships
  FOR INSERT WITH CHECK (user_id = auth.uid());

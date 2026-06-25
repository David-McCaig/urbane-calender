-- Seed user_shop_memberships for development
-- Adds known developer account(s) to the seed shop

INSERT INTO user_shop_memberships (user_id, shop_id, role)
VALUES (
  'faf50c1c-3ba1-40c6-b798-08a3c99c72f6',
  '43f783d1-15b4-4ec5-ada0-3f25ac8e5445',
  'manager'
)
ON CONFLICT (user_id, shop_id) DO NOTHING;

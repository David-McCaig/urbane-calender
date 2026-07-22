-- Seed data for local & live development
-- Runs AFTER all migrations during `supabase db reset`.
-- Creates auth users, a test shop, mechanics, and memberships.
-- Idempotent — safe to run multiple times.

-- 1. Clean up old seed data --------------------------------------------------
-- Delete in reverse dependency order.

DELETE FROM lightspeed_integrations
WHERE shop_id = 'b0000000-0000-4000-8000-000000000001';

DELETE FROM scheduled_jobs
WHERE id IN (
  '950e8400-e29b-41d4-a716-446655440001',
  '950e8400-e29b-41d4-a716-446655440002',
  '950e8400-e29b-41d4-a716-446655440003'
);

DELETE FROM jobs
WHERE id IN (
  '850e8400-e29b-41d4-a716-446655440001',
  '850e8400-e29b-41d4-a716-446655440002',
  '850e8400-e29b-41d4-a716-446655440003',
  '850e8400-e29b-41d4-a716-446655440004',
  '850e8400-e29b-41d4-a716-446655440005',
  '850e8400-e29b-41d4-a716-446655440006'
);

DELETE FROM mechanics
WHERE id IN (
  '750e8400-e29b-41d4-a716-446655440001',
  '750e8400-e29b-41d4-a716-446655440002',
  '750e8400-e29b-41d4-a716-446655440003',
  '750e8400-e29b-41d4-a716-446655440004',
  '750e8400-e29b-41d4-a716-446655440005'
);

DELETE FROM user_shop_memberships
WHERE shop_id = '43f783d1-15b4-4ec5-ada0-3f25ac8e5445'
   OR user_id = 'faf50c1c-3ba1-40c6-b798-08a3c99c72f6';

DELETE FROM shops WHERE id = '43f783d1-15b4-4ec5-ada0-3f25ac8e5445';

-- 2. Auth users (local development) ------------------------------------------
-- On live DB these will be no-ops since users already exist (ON CONFLICT).

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data,
  raw_app_meta_data, aud, role, is_sso_user,
  created_at, updated_at
) VALUES
(
  '7bba9935-abad-470a-a365-2f8741b3a30e',
  '00000000-0000-0000-0000-000000000000',
  'davidmccaig1@gmail.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"shop_id": "b0000000-0000-4000-8000-000000000001"}',
  '{}',
  'authenticated',
  'authenticated',
  false,
  NOW(),
  NOW()
),
(
  '67c91cc5-967d-4eca-ae57-4507622a9825',
  '00000000-0000-0000-0000-000000000000',
  'mechanic1@test.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{}',
  '{}',
  'authenticated',
  'authenticated',
  false,
  NOW(),
  NOW()
),
(
  '7beba398-e3e8-4a52-a61e-ce22755dbed6',
  '00000000-0000-0000-0000-000000000000',
  'mechanic2@test.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{}',
  '{}',
  'authenticated',
  'authenticated',
  false,
  NOW(),
  NOW()
),
(
  '736fc303-9d78-4736-adc0-1a0634155e56',
  '00000000-0000-0000-0000-000000000000',
  'mechanic3@test.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{}',
  '{}',
  'authenticated',
  'authenticated',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 3. Test shop ---------------------------------------------------------------

INSERT INTO shops (id, name, address, phone, email) VALUES
(
  'b0000000-0000-4000-8000-000000000001',
  'test',
  '456 Bike Lane, Cyclotown, ST 67890',
  '(555) 987-6543',
  'test@test.com'
)
ON CONFLICT (id) DO NOTHING;

-- Sync Lightspeed account ID for seed shop
UPDATE shops SET lightspeed_account_id = 'seed_account_id'
WHERE id = 'b0000000-0000-4000-8000-000000000001';

-- 4. Mechanics (linked to auth users) ----------------------------------------

INSERT INTO mechanics (id, shop_id, user_id, name, avatar, specialty, is_active) VALUES
(
  'c0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  '7bba9935-abad-470a-a365-2f8741b3a30e',
  'David McCaig',
  'DM',
  'Owner',
  true
),
(
  'c0000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000001',
  '67c91cc5-967d-4eca-ae57-4507622a9825',
  'Alex Johnson',
  'AJ',
  'Mechanic',
  true
),
(
  'c0000000-0000-4000-8000-000000000003',
  'b0000000-0000-4000-8000-000000000001',
  '7beba398-e3e8-4a52-a61e-ce22755dbed6',
  'Sam Rivera',
  'SR',
  'Mechanic',
  true
),
(
  'c0000000-0000-4000-8000-000000000004',
  'b0000000-0000-4000-8000-000000000001',
  '736fc303-9d78-4736-adc0-1a0634155e56',
  'Jordan Lee',
  'JL',
  'Service Writer',
  true
)
ON CONFLICT (id) DO NOTHING;

-- 5. Memberships -------------------------------------------------------------

INSERT INTO user_shop_memberships (user_id, shop_id, role) VALUES
('7bba9935-abad-470a-a365-2f8741b3a30e', 'b0000000-0000-4000-8000-000000000001', 'owner'),
('67c91cc5-967d-4eca-ae57-4507622a9825', 'b0000000-0000-4000-8000-000000000001', 'mechanic'),
('7beba398-e3e8-4a52-a61e-ce22755dbed6', 'b0000000-0000-4000-8000-000000000001', 'mechanic'),
('736fc303-9d78-4736-adc0-1a0634155e56', 'b0000000-0000-4000-8000-000000000001', 'mechanic')
ON CONFLICT (user_id, shop_id) DO NOTHING;

-- 6. Sample jobs (bicycle repair) -------------------------------------------

INSERT INTO jobs (id, shop_id, workorder_id, time_in, eta_out, customer_id, hook_in, workorder_status_id, sale_id, sale_line_id, duration) VALUES
(
  'd0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  'WO-100',
  '2026-07-14 08:00:00+00',
  '2026-07-14 10:00:00+00',
  'CUST-100',
  'Full Tune-Up — gears, brakes, bearings, true wheels',
  '550e8400-e29b-41d4-a716-446655440001',
  '0',
  'SL-100',
  2
),
(
  'd0000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000001',
  'WO-101',
  '2026-07-14 08:30:00+00',
  '2026-07-14 09:00:00+00',
  'CUST-101',
  'Flat Tire Repair — rear tube replacement',
  '550e8400-e29b-41d4-a716-446655440002',
  '0',
  'SL-101',
  1
),
(
  'd0000000-0000-4000-8000-000000000003',
  'b0000000-0000-4000-8000-000000000001',
  'WO-102',
  '2026-07-14 09:00:00+00',
  '2026-07-14 10:00:00+00',
  'CUST-102',
  'Brake Adjustment — hydraulic disc bleed + pad replacement',
  '550e8400-e29b-41d4-a716-446655440003',
  '0',
  'SL-102',
  1
),
(
  'd0000000-0000-4000-8000-000000000004',
  'b0000000-0000-4000-8000-000000000001',
  'WO-103',
  '2026-07-14 10:00:00+00',
  '2026-07-14 11:00:00+00',
  'CUST-103',
  'Chain Replacement — new chain + cassette install',
  '550e8400-e29b-41d4-a716-446655440005',
  '0',
  'SL-103',
  1
),
(
  'd0000000-0000-4000-8000-000000000005',
  'b0000000-0000-4000-8000-000000000001',
  'WO-104',
  '2026-07-14 11:00:00+00',
  '2026-07-14 12:30:00+00',
  'CUST-104',
  'Wheel Truing — front and rear true + tension check',
  '550e8400-e29b-41d4-a716-446655440001',
  '0',
  'SL-104',
  2
),
(
  'd0000000-0000-4000-8000-000000000006',
  'b0000000-0000-4000-8000-000000000001',
  'WO-105',
  '2026-07-14 13:00:00+00',
  '2026-07-14 14:00:00+00',
  'CUST-105',
  'Gear Service — derailleur adjustment + cable replacement',
  '550e8400-e29b-41d4-a716-446655440002',
  '0',
  'SL-105',
  1
)
ON CONFLICT (id) DO NOTHING;

-- 7. Lightspeed integration (placeholder) --------------------------------------

INSERT INTO lightspeed_integrations (shop_id, integration_type, access_token, refresh_token, expires_at, account_id)
VALUES (
  'b0000000-0000-4000-8000-000000000001',
  'lightspeed',
  'seed_access_token_placeholder',
  'seed_refresh_token_placeholder',
  NOW() + INTERVAL '1 hour',
  'seed_account_id'
)
ON CONFLICT (shop_id, integration_type) DO NOTHING;

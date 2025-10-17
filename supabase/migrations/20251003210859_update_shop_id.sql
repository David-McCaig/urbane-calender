-- Update shop ID to match your specific shop
-- This migration updates all existing data to use the correct shop ID

-- Temporarily disable foreign key constraints
SET session_replication_role = replica;

-- Insert the new shop record first
INSERT INTO shops (id, name, address, phone, email, created_at, updated_at)
SELECT '43f783d1-15b4-4ec5-ada0-3f25ac8e5445', name, address, phone, email, created_at, updated_at
FROM shops 
WHERE id = '650e8400-e29b-41d4-a716-446655440001'
ON CONFLICT (id) DO NOTHING;

-- Update all child records to reference the new shop ID
UPDATE mechanics 
SET shop_id = '43f783d1-15b4-4ec5-ada0-3f25ac8e5445'
WHERE shop_id = '650e8400-e29b-41d4-a716-446655440001';

UPDATE jobs 
SET shop_id = '43f783d1-15b4-4ec5-ada0-3f25ac8e5445'
WHERE shop_id = '650e8400-e29b-41d4-a716-446655440001';

UPDATE scheduled_jobs 
SET shop_id = '43f783d1-15b4-4ec5-ada0-3f25ac8e5445'
WHERE shop_id = '650e8400-e29b-41d4-a716-446655440001';

-- Delete the old shop record
DELETE FROM shops WHERE id = '650e8400-e29b-41d4-a716-446655440001';

-- Re-enable foreign key constraints
SET session_replication_role = DEFAULT;

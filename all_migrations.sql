-- Create calendar schema for Urbane Calendar
-- This migration creates the tables for shops, mechanics, jobs, and scheduled jobs

-- Create shops table
CREATE TABLE IF NOT EXISTS shops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mechanics table
CREATE TABLE IF NOT EXISTS mechanics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT,
  specialty TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create work_order_statuses table
CREATE TABLE IF NOT EXISTS work_order_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  workorder_id TEXT NOT NULL,
  time_in TIMESTAMPTZ NOT NULL,
  eta_out TIMESTAMPTZ NOT NULL,
  customer_id TEXT NOT NULL,
  hook_in TEXT NOT NULL,
  workorder_status_id UUID NOT NULL REFERENCES work_order_statuses(id),
  sale_id TEXT DEFAULT '0',
  sale_line_id TEXT NOT NULL,
  duration INTEGER DEFAULT 1, -- in hours
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, workorder_id)
);

-- Create scheduled_jobs table
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  time_slot INTEGER NOT NULL, -- 15-minute slot index (0-31 for 8-hour day)
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mechanic_id, date, time_slot),
  UNIQUE(job_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_shop_id ON jobs(shop_id);
CREATE INDEX IF NOT EXISTS idx_jobs_time_in ON jobs(time_in);
CREATE INDEX IF NOT EXISTS idx_mechanics_shop_id ON mechanics(shop_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_shop_id ON scheduled_jobs(shop_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_date ON scheduled_jobs(date);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_mechanic_date ON scheduled_jobs(mechanic_id, date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mechanics_updated_at BEFORE UPDATE ON mechanics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_jobs_updated_at BEFORE UPDATE ON scheduled_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Setup Row Level Security (RLS) policies
-- This ensures users can only access data from their own shop

-- Enable RLS on all tables
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanics ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;

-- Create a function to get the current user's shop_id
CREATE OR REPLACE FUNCTION get_user_shop_id()
RETURNS UUID AS $$
BEGIN
  -- This assumes you have a user_shops table or similar
  -- For now, we'll use a simple approach where shop_id is stored in user metadata
  -- You may need to adjust this based on your auth setup
  RETURN COALESCE(
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'shop_id',
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'shop_id'
  )::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Shops policies
CREATE POLICY "Users can view their own shop" ON shops
  FOR SELECT USING (id = get_user_shop_id());

CREATE POLICY "Users can update their own shop" ON shops
  FOR UPDATE USING (id = get_user_shop_id());

CREATE POLICY "Users can insert their own shop" ON shops
  FOR INSERT WITH CHECK (id = get_user_shop_id());

-- Mechanics policies
CREATE POLICY "Users can view mechanics from their shop" ON mechanics
  FOR SELECT USING (shop_id = get_user_shop_id());

CREATE POLICY "Users can insert mechanics for their shop" ON mechanics
  FOR INSERT WITH CHECK (shop_id = get_user_shop_id());

CREATE POLICY "Users can update mechanics from their shop" ON mechanics
  FOR UPDATE USING (shop_id = get_user_shop_id());

CREATE POLICY "Users can delete mechanics from their shop" ON mechanics
  FOR DELETE USING (shop_id = get_user_shop_id());

-- Work order statuses policies (these are typically global/shared)
CREATE POLICY "Users can view all work order statuses" ON work_order_statuses
  FOR SELECT USING (true);

-- Jobs policies
CREATE POLICY "Users can view jobs from their shop" ON jobs
  FOR SELECT USING (shop_id = get_user_shop_id());

CREATE POLICY "Users can insert jobs for their shop" ON jobs
  FOR INSERT WITH CHECK (shop_id = get_user_shop_id());

CREATE POLICY "Users can update jobs from their shop" ON jobs
  FOR UPDATE USING (shop_id = get_user_shop_id());

CREATE POLICY "Users can delete jobs from their shop" ON jobs
  FOR DELETE USING (shop_id = get_user_shop_id());

-- Scheduled jobs policies
CREATE POLICY "Users can view scheduled jobs from their shop" ON scheduled_jobs
  FOR SELECT USING (shop_id = get_user_shop_id());

CREATE POLICY "Users can insert scheduled jobs for their shop" ON scheduled_jobs
  FOR INSERT WITH CHECK (shop_id = get_user_shop_id());

CREATE POLICY "Users can update scheduled jobs from their shop" ON scheduled_jobs
  FOR UPDATE USING (shop_id = get_user_shop_id());

CREATE POLICY "Users can delete scheduled jobs from their shop" ON scheduled_jobs
  FOR DELETE USING (shop_id = get_user_shop_id());

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions for real-time subscriptions
GRANT SELECT ON shops TO authenticated;
GRANT SELECT ON mechanics TO authenticated;
GRANT SELECT ON jobs TO authenticated;
GRANT SELECT ON scheduled_jobs TO authenticated;
GRANT SELECT ON work_order_statuses TO authenticated;
-- Seed data for the calendar system
-- This creates initial data for testing and development

-- Insert work order statuses (these are typically global)
INSERT INTO work_order_statuses (id, name, description, color) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'New', 'New work order created', '#3B82F6'),
  ('550e8400-e29b-41d4-a716-446655440002', 'In Progress', 'Work is in progress', '#F59E0B'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Waiting for Parts', 'Waiting for parts to arrive', '#EF4444'),
  ('550e8400-e29b-41d4-a716-446655440004', 'On Hold', 'Work is temporarily on hold', '#6B7280'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Completed', 'Work has been completed', '#10B981'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Cancelled', 'Work order has been cancelled', '#DC2626')
ON CONFLICT (id) DO NOTHING;

-- Shop, mechanics, jobs, and memberships seed data lives in supabase/seed.sql
-- (runs during `supabase db reset` only; not pushed to live).

-- Enable real-time for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE shops;
ALTER PUBLICATION supabase_realtime ADD TABLE mechanics;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE scheduled_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE work_order_statuses;
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

-- Scheduled jobs: allow all shop members to move and unschedule
DROP POLICY IF EXISTS "Users can update scheduled jobs from their shop" ON scheduled_jobs;
CREATE POLICY "Users can update scheduled jobs from their shop" ON scheduled_jobs
  FOR UPDATE USING (shop_id = get_user_shop_id());

DROP POLICY IF EXISTS "Users can delete scheduled jobs from their shop" ON scheduled_jobs;
CREATE POLICY "Users can delete scheduled jobs from their shop" ON scheduled_jobs
  FOR DELETE USING (shop_id = get_user_shop_id());

-- 10. Grant permissions on new tables and type
GRANT USAGE ON TYPE membership_role TO authenticated;
GRANT ALL ON user_shop_memberships TO authenticated;
GRANT ALL ON invitations TO authenticated;
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
-- Add REPLICA IDENTITY FULL to tables used by Supabase Realtime
-- Ensures UPDATE and DELETE events carry the complete old row in the payload,
-- not just the primary key. Needed for incremental UI updates without re-fetching.

ALTER TABLE jobs REPLICA IDENTITY FULL;
ALTER TABLE scheduled_jobs REPLICA IDENTITY FULL;
ALTER TABLE mechanics REPLICA IDENTITY FULL;
-- Seed data is handled by supabase/seed.sql (runs during `supabase db reset`)
-- See that file for auth users, test shop, mechanics, and memberships.

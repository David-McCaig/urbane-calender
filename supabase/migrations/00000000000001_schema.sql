-- Schema: tables, types, functions, triggers, indexes
-- Squashed from migrations 20241201–20260628 into final form

-- 1. Enum for membership roles
DO $$ BEGIN
  CREATE TYPE membership_role AS ENUM ('owner', 'manager', 'mechanic');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tables ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mechanics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  specialty TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN mechanics.user_id IS
  'Nullable FK to auth.users. Populated when a mechanic record is auto-created during onboarding or invitation acceptance. NULL for legacy seed data.';

CREATE TABLE IF NOT EXISTS work_order_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  duration INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, workorder_id)
);

CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  time_slot INTEGER NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mechanic_id, date, time_slot),
  UNIQUE(job_id, date)
);

CREATE TABLE IF NOT EXISTS user_shop_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  role membership_role NOT NULL DEFAULT 'mechanic',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, shop_id)
);

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

-- 3. Indexes ---------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_jobs_shop_id ON jobs(shop_id);
CREATE INDEX IF NOT EXISTS idx_jobs_time_in ON jobs(time_in);
CREATE INDEX IF NOT EXISTS idx_mechanics_shop_id ON mechanics(shop_id);
CREATE INDEX IF NOT EXISTS idx_mechanics_user_id ON mechanics(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_shop_id ON scheduled_jobs(shop_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_date ON scheduled_jobs(date);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_mechanic_date ON scheduled_jobs(mechanic_id, date);
CREATE INDEX IF NOT EXISTS idx_user_shop_memberships_user_id ON user_shop_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shop_memberships_shop_id ON user_shop_memberships(shop_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

-- 4. updated_at trigger function -------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Triggers --------------------------------------------------------------

DROP TRIGGER IF EXISTS update_shops_updated_at ON shops;
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mechanics_updated_at ON mechanics;
CREATE TRIGGER update_mechanics_updated_at BEFORE UPDATE ON mechanics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheduled_jobs_updated_at ON scheduled_jobs;
CREATE TRIGGER update_scheduled_jobs_updated_at BEFORE UPDATE ON scheduled_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_shop_memberships_updated_at ON user_shop_memberships;
CREATE TRIGGER update_user_shop_memberships_updated_at
  BEFORE UPDATE ON user_shop_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Helper functions ------------------------------------------------------

-- Returns the current user's active shop ID.
-- Priority: active_shop_id (user_metadata) > shop_id (user_metadata) >
--   shop_id (app_metadata) > first membership row
CREATE OR REPLACE FUNCTION get_user_shop_id()
RETURNS UUID AS $$
DECLARE
  shop_id_val UUID;
  uid UUID;
BEGIN
  BEGIN
    shop_id_val := ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'active_shop_id')::UUID;
    IF shop_id_val IS NOT NULL THEN RETURN shop_id_val; END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    shop_id_val := ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'shop_id')::UUID;
    IF shop_id_val IS NOT NULL THEN RETURN shop_id_val; END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    shop_id_val := ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'shop_id')::UUID;
    IF shop_id_val IS NOT NULL THEN RETURN shop_id_val; END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

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

-- Returns the current user's role in their active shop
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

-- 7. Replica identity for realtime -----------------------------------------

ALTER TABLE jobs REPLICA IDENTITY FULL;
ALTER TABLE scheduled_jobs REPLICA IDENTITY FULL;
ALTER TABLE mechanics REPLICA IDENTITY FULL;

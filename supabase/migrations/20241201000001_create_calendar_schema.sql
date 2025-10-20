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

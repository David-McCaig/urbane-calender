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

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

-- Insert sample shop
INSERT INTO shops (id, name, address, phone, email) VALUES
  ('43f783d1-15b4-4ec5-ada0-3f25ac8e5445', 'Urbane Auto Repair', '123 Main Street, City, State 12345', '(555) 123-4567', 'contact@urbaneautorepair.com')
ON CONFLICT (id) DO NOTHING;

-- Insert sample mechanics
INSERT INTO mechanics (id, shop_id, name, avatar, specialty) VALUES
  ('750e8400-e29b-41d4-a716-446655440001', '43f783d1-15b4-4ec5-ada0-3f25ac8e5445', 'Em Kieffer', 'EK', 'Service Writer'),
  ('750e8400-e29b-41d4-a716-446655440002', '43f783d1-15b4-4ec5-ada0-3f25ac8e5445', 'Rory Hiles', 'RH', 'Service Writer'),
  ('750e8400-e29b-41d4-a716-446655440003', '43f783d1-15b4-4ec5-ada0-3f25ac8e5445', 'Nestor Czernysz', 'NC', 'Mechanic'),
  ('750e8400-e29b-41d4-a716-446655440004', '43f783d1-15b4-4ec5-ada0-3f25ac8e5445', 'Silum Zhang', 'SZ', 'Mechanic'),
  ('750e8400-e29b-41d4-a716-446655440005', '43f783d1-15b4-4ec5-ada0-3f25ac8e5445', 'Sasha Fabrikant', 'SF', 'Service Lead')
ON CONFLICT (id) DO NOTHING;

-- Insert sample jobs
INSERT INTO jobs (id, shop_id, workorder_id, time_in, eta_out, customer_id, hook_in, workorder_status_id, sale_id, sale_line_id, duration) VALUES
  ('850e8400-e29b-41d4-a716-446655440001', '43f783d1-15b4-4ec5-ada0-3f25ac8e5445', 'WO-001', '2024-12-01 15:11:28+00:00', '2024-12-01 16:11:28+00:00', 'CUST-001', 'Oil Change', '550e8400-e29b-41d4-a716-446655440005', '0', 'SL-001', 1),
  ('850e8400-e29b-41d4-a716-446655440002', '43f783d1-15b4-4ec5-ada0-3f25ac8e5445', 'WO-002', '2024-12-01 14:00:00+00:00', '2024-12-01 16:00:00+00:00', 'CUST-002', 'Brake Repair', '550e8400-e29b-41d4-a716-446655440005', '0', 'SL-002', 1),
  ('850e8400-e29b-41d4-a716-446655440003', '43f783d1-15b4-4ec5-ada0-3f25ac8e5445', 'WO-003', '2024-12-01 13:30:00+00:00', '2024-12-01 15:00:00+00:00', 'CUST-003', 'Engine Diagnostic', '550e8400-e29b-41d4-a716-446655440005', '0', 'SL-003', 1),
  ('850e8400-e29b-41d4-a716-446655440004', '43f783d1-15b4-4ec5-ada0-3f25ac8e5445', 'WO-004', '2024-12-01 10:00:00+00:00', '2024-12-01 13:00:00+00:00', 'CUST-004', 'Transmission Service', '550e8400-e29b-41d4-a716-446655440001', '0', 'SL-004', 3),
  ('850e8400-e29b-41d4-a716-446655440005', '43f783d1-15b4-4ec5-ada0-3f25ac8e5445', 'WO-005', '2024-12-01 09:00:00+00:00', '2024-12-01 11:00:00+00:00', 'CUST-005', 'Tire Rotation', '550e8400-e29b-41d4-a716-446655440001', '0', 'SL-005', 2),
  ('850e8400-e29b-41d4-a716-446655440006', '43f783d1-15b4-4ec5-ada0-3f25ac8e5445', 'WO-006', '2024-12-01 08:30:00+00:00', '2024-12-01 10:30:00+00:00', 'CUST-006', 'AC Repair', '550e8400-e29b-41d4-a716-446655440002', '0', 'SL-006', 2)
ON CONFLICT (id) DO NOTHING;

-- Insert sample scheduled jobs (mechanic assignments)
INSERT INTO scheduled_jobs (id, job_id, shop_id, mechanic_id, time_slot, date) VALUES
  ('950e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440004', '43f783d1-15b4-4ec5-ada0-3f25ac8e5445', '750e8400-e29b-41d4-a716-446655440003', 4, '2024-12-01'), -- Transmission Service at 11:00 AM with Nestor
  ('950e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440005', '43f783d1-15b4-4ec5-ada0-3f25ac8e5445', '750e8400-e29b-41d4-a716-446655440004', 0, '2024-12-01'), -- Tire Rotation at 10:00 AM with Silum
  ('950e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440006', '43f783d1-15b4-4ec5-ada0-3f25ac8e5445', '750e8400-e29b-41d4-a716-446655440005', 2, '2024-12-01')  -- AC Repair at 10:30 AM with Sasha
ON CONFLICT (id) DO NOTHING;

-- Enable real-time for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE shops;
ALTER PUBLICATION supabase_realtime ADD TABLE mechanics;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE scheduled_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE work_order_statuses;

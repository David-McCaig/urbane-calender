-- Reference seed data — runs during migrations (both local `db reset` and live `db push`).
-- No auth dependency — shop, mechanics, memberships, and jobs live in supabase/seed.sql.

-- Work order statuses (global) -----------------------------------------------

INSERT INTO work_order_statuses (id, name, description, color) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'New', 'New work order created', '#3B82F6'),
  ('550e8400-e29b-41d4-a716-446655440002', 'In Progress', 'Work is in progress', '#F59E0B'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Waiting for Parts', 'Waiting for parts to arrive', '#EF4444'),
  ('550e8400-e29b-41d4-a716-446655440004', 'On Hold', 'Work is temporarily on hold', '#6B7280'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Completed', 'Work has been completed', '#10B981'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Cancelled', 'Work order has been cancelled', '#DC2626')
ON CONFLICT (id) DO NOTHING;

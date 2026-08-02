-- Drop FK constraint on jobs.workorder_status_id so it can store
-- Lightspeed-native status IDs (integers-as-strings like "14") instead
-- of local work_order_statuses UUIDs.
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_workorder_status_id_fkey;

-- Change column type from UUID to TEXT so it can hold either legacy UUIDs
-- or Lightspeed status IDs. Existing values are preserved.
ALTER TABLE jobs ALTER COLUMN workorder_status_id TYPE TEXT;

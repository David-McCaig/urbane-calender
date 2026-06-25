-- Add REPLICA IDENTITY FULL to tables used by Supabase Realtime
-- Ensures UPDATE and DELETE events carry the complete old row in the payload,
-- not just the primary key. Needed for incremental UI updates without re-fetching.

ALTER TABLE jobs REPLICA IDENTITY FULL;
ALTER TABLE scheduled_jobs REPLICA IDENTITY FULL;
ALTER TABLE mechanics REPLICA IDENTITY FULL;

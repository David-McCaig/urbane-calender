-- Add user_id FK column to mechanics table, linking mechanic records to auth.users
ALTER TABLE mechanics
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for looking up a mechanic profile by user (dashboard / profile queries)
CREATE INDEX IF NOT EXISTS idx_mechanics_user_id ON mechanics(user_id);

COMMENT ON COLUMN mechanics.user_id IS
  'Nullable FK to auth.users. Populated when a mechanic record is auto-created during onboarding. NULL for legacy seed data.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'scheduled_jobs_time_slot_daily_check'
      AND conrelid = 'public.scheduled_jobs'::regclass
  ) THEN
    -- Existing slots are offsets from 10 AM. Slot 40 is 10 AM when slots
    -- are absolute quarter-hours measured from midnight.
    UPDATE public.scheduled_jobs
    SET time_slot = time_slot + 40;

    ALTER TABLE public.scheduled_jobs
      ADD CONSTRAINT scheduled_jobs_time_slot_daily_check
      CHECK (time_slot >= 0 AND time_slot < 96);
  END IF;
END
$$;

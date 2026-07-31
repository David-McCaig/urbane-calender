-- Calendar resizing snaps to 15-minute increments, so durations need to store
-- fractional hours (for example, 1.25 and 2.5) rather than integers only.
ALTER TABLE public.jobs
  ALTER COLUMN duration TYPE NUMERIC(4, 2)
  USING duration::NUMERIC(4, 2);

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_duration_quarter_hour_check;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_duration_quarter_hour_check
  CHECK (
    duration >= 0.25
    AND duration * 4 = TRUNC(duration * 4)
  );

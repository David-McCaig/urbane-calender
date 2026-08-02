-- Daily mechanic availability, with room for future imported schedule sources.

CREATE UNIQUE INDEX IF NOT EXISTS mechanics_shop_id_id_key
  ON public.mechanics (shop_id, id);

CREATE TABLE IF NOT EXISTS public.mechanic_day_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  mechanic_id UUID NOT NULL,
  date DATE NOT NULL,
  is_working BOOLEAN NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'when_i_work')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mechanic_day_statuses_mechanic_shop_fkey
    FOREIGN KEY (shop_id, mechanic_id)
    REFERENCES public.mechanics(shop_id, id)
    ON DELETE CASCADE,
  CONSTRAINT mechanic_day_statuses_shop_mechanic_date_source_key
    UNIQUE (shop_id, mechanic_id, date, source)
);

CREATE INDEX IF NOT EXISTS mechanic_day_statuses_shop_date_idx
  ON public.mechanic_day_statuses (shop_id, date);

DROP TRIGGER IF EXISTS update_mechanic_day_statuses_updated_at
  ON public.mechanic_day_statuses;
CREATE TRIGGER update_mechanic_day_statuses_updated_at
  BEFORE UPDATE ON public.mechanic_day_statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.mechanic_day_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view mechanic day statuses" ON public.mechanic_day_statuses;
CREATE POLICY "Members can view mechanic day statuses"
  ON public.mechanic_day_statuses
  FOR SELECT
  TO authenticated
  USING (shop_id = (SELECT public.get_user_shop_id()));

DROP POLICY IF EXISTS "Members can insert mechanic day statuses" ON public.mechanic_day_statuses;
CREATE POLICY "Members can insert mechanic day statuses"
  ON public.mechanic_day_statuses
  FOR INSERT
  TO authenticated
  WITH CHECK (shop_id = (SELECT public.get_user_shop_id()));

DROP POLICY IF EXISTS "Members can update mechanic day statuses" ON public.mechanic_day_statuses;
CREATE POLICY "Members can update mechanic day statuses"
  ON public.mechanic_day_statuses
  FOR UPDATE
  TO authenticated
  USING (shop_id = (SELECT public.get_user_shop_id()))
  WITH CHECK (shop_id = (SELECT public.get_user_shop_id()));

DROP POLICY IF EXISTS "Members can delete mechanic day statuses" ON public.mechanic_day_statuses;
CREATE POLICY "Members can delete mechanic day statuses"
  ON public.mechanic_day_statuses
  FOR DELETE
  TO authenticated
  USING (shop_id = (SELECT public.get_user_shop_id()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mechanic_day_statuses TO authenticated;
GRANT ALL ON public.mechanic_day_statuses TO service_role;

ALTER TABLE public.mechanic_day_statuses REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mechanic_day_statuses;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

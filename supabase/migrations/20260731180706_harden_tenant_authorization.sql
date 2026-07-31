-- Harden tenant authorization against user-editable JWT metadata and row moves.

-- Resolve metadata only as a UI preference. The selected shop is authoritative
-- only when the authenticated user has a matching membership.
CREATE OR REPLACE FUNCTION public.get_user_shop_id()
RETURNS UUID
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
  candidate_shop_id UUID;
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    candidate_shop_id := ((auth.jwt() -> 'user_metadata' ->> 'active_shop_id'))::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    candidate_shop_id := NULL;
  END;

  IF candidate_shop_id IS NULL THEN
    BEGIN
      candidate_shop_id := ((auth.jwt() -> 'user_metadata' ->> 'shop_id'))::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      candidate_shop_id := NULL;
    END;
  END IF;

  IF candidate_shop_id IS NULL THEN
    BEGIN
      candidate_shop_id := ((auth.jwt() -> 'app_metadata' ->> 'shop_id'))::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      candidate_shop_id := NULL;
    END;
  END IF;

  IF candidate_shop_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.user_shop_memberships AS membership
    WHERE membership.user_id = uid
      AND membership.shop_id = candidate_shop_id
  ) THEN
    RETURN candidate_shop_id;
  END IF;

  SELECT membership.shop_id
  INTO candidate_shop_id
  FROM public.user_shop_memberships AS membership
  WHERE membership.user_id = uid
  ORDER BY membership.created_at ASC
  LIMIT 1;

  RETURN candidate_shop_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_shop_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_shop_id() TO authenticated, service_role;

-- Lock the companion role helper to explicit schemas as it also runs with the
-- migration owner's privileges.
CREATE OR REPLACE FUNCTION public.get_user_shop_role()
RETURNS public.membership_role
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
  role_value public.membership_role;
  uid UUID := auth.uid();
  active_shop_id UUID := public.get_user_shop_id();
BEGIN
  IF uid IS NOT NULL AND active_shop_id IS NOT NULL THEN
    SELECT membership.role
    INTO role_value
    FROM public.user_shop_memberships AS membership
    WHERE membership.user_id = uid
      AND membership.shop_id = active_shop_id;
  END IF;

  RETURN role_value;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_shop_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_shop_role() TO authenticated, service_role;

-- Memberships are created only by the server-side bootstrap and invitation
-- flows. Allowing users to insert their own row lets them choose any shop and
-- role through the Data API.
DROP POLICY IF EXISTS "Users can insert own membership" ON public.user_shop_memberships;
DROP POLICY IF EXISTS "Owners can insert memberships" ON public.user_shop_memberships;

-- Prevent UPDATE operations from moving rows into another tenant.
DROP POLICY IF EXISTS "Users can update their own shop" ON public.shops;
CREATE POLICY "Users can update their own shop" ON public.shops
  FOR UPDATE
  TO authenticated
  USING (
    id = public.get_user_shop_id()
    AND public.get_user_shop_role() = 'owner'
  )
  WITH CHECK (
    id = public.get_user_shop_id()
    AND public.get_user_shop_role() = 'owner'
  );

DROP POLICY IF EXISTS "Users can update mechanics from their shop" ON public.mechanics;
CREATE POLICY "Users can update mechanics from their shop" ON public.mechanics
  FOR UPDATE
  TO authenticated
  USING (
    shop_id = public.get_user_shop_id()
    AND public.get_user_shop_role() IN ('owner', 'manager')
  )
  WITH CHECK (
    shop_id = public.get_user_shop_id()
    AND public.get_user_shop_role() IN ('owner', 'manager')
  );

DROP POLICY IF EXISTS "Users can update jobs from their shop" ON public.jobs;
CREATE POLICY "Users can update jobs from their shop" ON public.jobs
  FOR UPDATE
  TO authenticated
  USING (
    shop_id = public.get_user_shop_id()
    AND public.get_user_shop_role() IN ('owner', 'manager')
  )
  WITH CHECK (
    shop_id = public.get_user_shop_id()
    AND public.get_user_shop_role() IN ('owner', 'manager')
  );

DROP POLICY IF EXISTS "Users can update scheduled jobs from their shop" ON public.scheduled_jobs;
CREATE POLICY "Users can update scheduled jobs from their shop" ON public.scheduled_jobs
  FOR UPDATE
  TO authenticated
  USING (shop_id = public.get_user_shop_id())
  WITH CHECK (shop_id = public.get_user_shop_id());

DROP POLICY IF EXISTS "Owners can update memberships" ON public.user_shop_memberships;
CREATE POLICY "Owners can update memberships" ON public.user_shop_memberships
  FOR UPDATE
  TO authenticated
  USING (
    shop_id = public.get_user_shop_id()
    AND public.get_user_shop_role() = 'owner'
  )
  WITH CHECK (
    shop_id = public.get_user_shop_id()
    AND public.get_user_shop_role() = 'owner'
  );

DROP POLICY IF EXISTS "Members can update integrations for their shop" ON public.lightspeed_integrations;
CREATE POLICY "Members can update integrations for their shop" ON public.lightspeed_integrations
  FOR UPDATE
  TO authenticated
  USING (shop_id = public.get_user_shop_id())
  WITH CHECK (shop_id = public.get_user_shop_id());

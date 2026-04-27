-- =========================================================================
-- 1) Tighten profiles SELECT: only see profiles that are connected to you
-- =========================================================================
DROP POLICY IF EXISTS "Authenticated users read profiles" ON public.profiles;

CREATE POLICY "Users read connected profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    -- Always see your own profile
    id = auth.uid()
    -- Job participants on shared jobs
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE (j.homeowner_id = auth.uid() OR j.helper_id = auth.uid())
        AND (j.homeowner_id = profiles.id OR j.helper_id = profiles.id)
    )
    -- Homeowners can see profiles of helpers who expressed interest in their jobs
    OR EXISTS (
      SELECT 1 FROM public.job_interests ji
      JOIN public.jobs j ON j.id = ji.job_id
      WHERE j.homeowner_id = auth.uid() AND ji.helper_id = profiles.id
    )
    -- Helpers can see profiles of homeowners whose jobs they've shown interest in
    OR EXISTS (
      SELECT 1 FROM public.job_interests ji
      JOIN public.jobs j ON j.id = ji.job_id
      WHERE ji.helper_id = auth.uid() AND j.homeowner_id = profiles.id
    )
    -- Confirmed guardian <-> helper links can see each other's profile
    OR EXISTS (
      SELECT 1 FROM public.guardian_helpers gh
      WHERE gh.confirmed = true
        AND ((gh.guardian_id = auth.uid() AND gh.helper_id = profiles.id)
          OR (gh.helper_id = auth.uid() AND gh.guardian_id = profiles.id))
    )
    -- Authenticated users browsing the public helper directory can see active helper names
    OR EXISTS (
      SELECT 1 FROM public.helper_profiles hp
      WHERE hp.id = profiles.id AND hp.is_active = true
    )
  );

-- =========================================================================
-- 2) Guardian link-code brute-force protection
-- =========================================================================

-- Per-helper attempt tracking for guardian link-code lookups
CREATE TABLE IF NOT EXISTS public.guardian_link_attempts (
  helper_id uuid PRIMARY KEY,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guardian_link_attempts ENABLE ROW LEVEL SECURITY;

-- Helpers may view their own attempt counter (for UI lockout messaging)
CREATE POLICY "Helper views own link attempts"
  ON public.guardian_link_attempts FOR SELECT
  TO authenticated
  USING (helper_id = auth.uid());

-- Replace request_guardian_link with a rate-limited version
CREATE OR REPLACE FUNCTION public.request_guardian_link(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_guardian uuid;
  v_helper_role user_role;
  v_under18 boolean;
  v_locked timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Check lockout
  SELECT locked_until INTO v_locked
  FROM public.guardian_link_attempts WHERE helper_id = auth.uid();
  IF v_locked IS NOT NULL AND v_locked > now() THEN
    RAISE EXCEPTION 'Too many attempts. Try again after %', v_locked;
  END IF;

  SELECT role INTO v_helper_role FROM public.profiles WHERE id = auth.uid();
  IF v_helper_role <> 'helper' THEN RAISE EXCEPTION 'Only helper accounts can link a guardian'; END IF;

  SELECT is_under_18 INTO v_under18 FROM public.helper_profiles WHERE id = auth.uid();
  IF NOT COALESCE(v_under18, false) THEN RAISE EXCEPTION 'Only under-18 helpers need a guardian link'; END IF;

  SELECT id INTO v_guardian FROM public.guardian_profiles WHERE link_code = upper(trim(_code));

  IF v_guardian IS NULL THEN
    -- Record failed attempt + lock after 5 within 15 min
    INSERT INTO public.guardian_link_attempts (helper_id, failed_attempts, locked_until, updated_at)
    VALUES (auth.uid(), 1, NULL, now())
    ON CONFLICT (helper_id) DO UPDATE
      SET failed_attempts = public.guardian_link_attempts.failed_attempts + 1,
          locked_until = CASE WHEN public.guardian_link_attempts.failed_attempts + 1 >= 5
                              THEN now() + interval '15 minutes' ELSE NULL END,
          updated_at = now();
    RAISE EXCEPTION 'No guardian found with that code';
  END IF;

  -- Reset attempts on success
  DELETE FROM public.guardian_link_attempts WHERE helper_id = auth.uid();

  INSERT INTO public.guardian_helpers (guardian_id, helper_id, confirmed)
  VALUES (v_guardian, auth.uid(), false)
  ON CONFLICT (guardian_id, helper_id) DO NOTHING;

  RETURN v_guardian;
END;
$function$;
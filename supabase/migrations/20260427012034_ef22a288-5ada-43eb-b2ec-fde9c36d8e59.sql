
-- 1) JOBS: split SELECT policy so PINs are NEVER returned via direct table select.
--    Browsing open jobs returns rows with PIN columns nulled (via column-level grant trick using a view + revoke).
--    Simpler approach: keep the existing SELECT policy, but REVOKE column SELECT on PIN columns from authenticated;
--    homeowners/helpers fetch PINs via the SECURITY DEFINER RPCs (already in place).

REVOKE SELECT (start_pin, completion_pin) ON public.jobs FROM authenticated, anon;

-- Allow the assigned helper to also read their own PINs via a new RPC (mirror of get_job_pins).
CREATE OR REPLACE FUNCTION public.get_job_pins_for_helper(_job_id uuid)
RETURNS TABLE(start_pin text, completion_pin text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT j.start_pin, j.completion_pin
  FROM public.jobs j
  WHERE j.id = _job_id AND j.helper_id = auth.uid();
$$;

-- 2) MESSAGES: tighten is_job_participant — only homeowner + assigned helper.
CREATE OR REPLACE FUNCTION public.is_job_participant(_job_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = _job_id
      AND (j.homeowner_id = _user_id OR j.helper_id = _user_id)
  );
$$;

-- 3) HOMEOWNER_PROFILES: lock down to authenticated owner only (was using `public` role).
DROP POLICY IF EXISTS "Homeowners manage own profile" ON public.homeowner_profiles;
DROP POLICY IF EXISTS "Homeowners view own profile" ON public.homeowner_profiles;

CREATE POLICY "Homeowner reads own profile"
  ON public.homeowner_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Homeowner inserts own profile"
  ON public.homeowner_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Homeowner updates own profile"
  ON public.homeowner_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Homeowner deletes own profile"
  ON public.homeowner_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Also tighten helper_profiles (currently uses `public` role)
DROP POLICY IF EXISTS "Helpers manage own profile" ON public.helper_profiles;
DROP POLICY IF EXISTS "Helpers view own full profile" ON public.helper_profiles;

CREATE POLICY "Helper reads own profile"
  ON public.helper_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Helper inserts own profile"
  ON public.helper_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Helper updates own profile"
  ON public.helper_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Helper deletes own profile"
  ON public.helper_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Also tighten profiles table (uses `public` role)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4) GUARDIAN_PROFILES: prevent the pin_hash column from ever leaving the DB.
REVOKE SELECT (pin_hash) ON public.guardian_profiles FROM authenticated, anon;

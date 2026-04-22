
-- ============================================================
-- 1) Restrict helper_profiles public exposure of guardian data
-- ============================================================
-- Drop the overly permissive public SELECT policy.
DROP POLICY IF EXISTS "Helper profiles viewable by everyone" ON public.helper_profiles;

-- Owner can read full row (already covered by ALL policy "Helpers manage own profile",
-- but keep explicit SELECT for clarity).
CREATE POLICY "Helpers view own full profile"
ON public.helper_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- A safe public view that exposes only NON-sensitive helper marketing fields.
-- Excludes: guardian_email/name/phone/relationship, age, school_name, is_under_18, guardian_approved.
CREATE OR REPLACE VIEW public.helper_profiles_public
WITH (security_invoker = true) AS
SELECT
  id,
  bio,
  hourly_rate,
  per_job_rate,
  rate_type,
  categories,
  is_active,
  school_verified,
  created_at
FROM public.helper_profiles
WHERE is_active = true;

GRANT SELECT ON public.helper_profiles_public TO anon, authenticated;

-- A SECURITY DEFINER function so a homeowner who has an interested under-18 helper
-- on one of their jobs can still see whether guardian has approved (via existing
-- job_guardian_approvals policy) AND see the helper's age/school for that job context.
CREATE OR REPLACE FUNCTION public.get_helper_for_job(_job_id uuid, _helper_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  age integer,
  school_name text,
  bio text,
  hourly_rate numeric,
  per_job_rate numeric,
  rate_type text,
  is_under_18 boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url,
         hp.age, hp.school_name, hp.bio, hp.hourly_rate, hp.per_job_rate, hp.rate_type, hp.is_under_18
  FROM public.profiles p
  LEFT JOIN public.helper_profiles hp ON hp.id = p.id
  WHERE p.id = _helper_id
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = _job_id
        AND j.homeowner_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.job_interests ji WHERE ji.job_id = j.id AND ji.helper_id = _helper_id)
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_helper_for_job(uuid, uuid) TO authenticated;

-- ============================================================
-- 2) Move job PIN verification server-side
-- ============================================================
-- Server-side verifier for the start PIN. Only the assigned helper for the job
-- (in the matched state) may call this with a candidate PIN.
CREATE OR REPLACE FUNCTION public.verify_start_pin(_job_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match boolean := false;
BEGIN
  SELECT (j.helper_id = auth.uid() AND j.status = 'matched' AND j.start_pin = _pin)
    INTO v_match
  FROM public.jobs j
  WHERE j.id = _job_id;

  IF COALESCE(v_match, false) THEN
    UPDATE public.jobs
       SET status = 'in_progress', started_at = now()
     WHERE id = _job_id AND helper_id = auth.uid() AND status = 'matched';
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_start_pin(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_completion_pin(_job_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match boolean := false;
BEGIN
  SELECT (j.helper_id = auth.uid() AND j.status = 'in_progress' AND j.completion_pin = _pin)
    INTO v_match
  FROM public.jobs j
  WHERE j.id = _job_id;

  IF COALESCE(v_match, false) THEN
    UPDATE public.jobs
       SET status = 'completed', completed_at = now()
     WHERE id = _job_id AND helper_id = auth.uid() AND status = 'in_progress';
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_completion_pin(uuid, text) TO authenticated;

-- Hide PIN columns from clients entirely.
-- Drop and recreate the jobs SELECT policy to exclude pin reads via column privileges.
REVOKE SELECT (start_pin, completion_pin) ON public.jobs FROM anon, authenticated;

-- Provide a SECURITY DEFINER function so the homeowner can read their job PINs
-- (they need to display them to share verbally with the helper).
CREATE OR REPLACE FUNCTION public.get_job_pins(_job_id uuid)
RETURNS TABLE (start_pin text, completion_pin text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT j.start_pin, j.completion_pin
  FROM public.jobs j
  WHERE j.id = _job_id
    AND j.homeowner_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_job_pins(uuid) TO authenticated;

-- ============================================================
-- 3) Realtime: scope messages channel by job participation
-- ============================================================
-- The realtime.messages table holds broadcast/presence/postgres_changes events.
-- Restrict reads to authenticated users who are participants of the job whose id
-- matches the channel topic (we use topic = "job-<uuid>").
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'realtime' AND tablename = 'messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';

    -- Drop old policy if present, then create
    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'realtime' AND tablename = 'messages'
        AND policyname = 'Job participants can subscribe'
    ) THEN
      EXECUTE 'DROP POLICY "Job participants can subscribe" ON realtime.messages';
    END IF;

    EXECUTE $POL$
      CREATE POLICY "Job participants can subscribe"
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (
        -- Only allow channel topics that look like job-<uuid> when the user
        -- is a participant of that job. All other topics blocked.
        (realtime.topic() LIKE 'job-%')
        AND public.is_job_participant(
          (substring(realtime.topic() from 5))::uuid,
          (select auth.uid())
        )
      )
    $POL$;
  END IF;
END$$;

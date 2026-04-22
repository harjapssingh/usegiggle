
-- ============================================================
-- pgcrypto for password hashing
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================
-- 2) guardian_profiles table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.guardian_profiles (
  id uuid PRIMARY KEY,                     -- == auth.users.id
  pin_hash text NOT NULL,                  -- bcrypt hash of 4-digit PIN
  link_code text NOT NULL UNIQUE
    DEFAULT upper(substring(encode(extensions.gen_random_bytes(6), 'base32'), 1, 8)),
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guardian_profiles ENABLE ROW LEVEL SECURITY;

-- Guardians read/update their OWN row only. pin_hash is never selected by client
-- (we only ever check it server-side via SECURITY DEFINER functions).
CREATE POLICY "Guardian views own profile"
  ON public.guardian_profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

-- Hide pin_hash from client SELECTs even for the owner.
REVOKE SELECT (pin_hash) ON public.guardian_profiles FROM anon, authenticated;

-- Guardians can update their own non-sensitive fields (locked_until/failed_attempts
-- are only mutated by SECURITY DEFINER functions; pin_hash via dedicated function).
REVOKE UPDATE ON public.guardian_profiles FROM anon, authenticated;
REVOKE INSERT, DELETE ON public.guardian_profiles FROM anon, authenticated;

-- ============================================================
-- 3) guardian_helpers link table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.guardian_helpers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES public.guardian_profiles(id) ON DELETE CASCADE,
  helper_id uuid NOT NULL,                 -- references public.profiles(id)
  confirmed boolean NOT NULL DEFAULT false,
  requested_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  UNIQUE(guardian_id, helper_id)
);

ALTER TABLE public.guardian_helpers ENABLE ROW LEVEL SECURITY;

-- Helper can see their own link rows; guardian can see their own.
CREATE POLICY "Linked parties view link"
  ON public.guardian_helpers FOR SELECT
  TO authenticated
  USING (helper_id = auth.uid() OR guardian_id = auth.uid());

-- All inserts/updates go through SECURITY DEFINER functions only.
REVOKE INSERT, UPDATE, DELETE ON public.guardian_helpers FROM anon, authenticated;

-- ============================================================
-- 4) Per-job approval (replaces old token table)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.job_helper_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  helper_id uuid NOT NULL,
  guardian_id uuid REFERENCES public.guardian_profiles(id),
  approved boolean NOT NULL DEFAULT false,
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  UNIQUE(job_id, helper_id)
);

ALTER TABLE public.job_helper_approvals ENABLE ROW LEVEL SECURITY;

-- Helper sees their own approvals; guardian sees approvals for helpers they're
-- linked to; homeowner sees approvals for jobs they posted.
CREATE POLICY "Approval visible to participants"
  ON public.job_helper_approvals FOR SELECT
  TO authenticated
  USING (
    helper_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.guardian_helpers gh
      WHERE gh.helper_id = job_helper_approvals.helper_id
        AND gh.guardian_id = auth.uid()
        AND gh.confirmed = true
    )
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_helper_approvals.job_id AND j.homeowner_id = auth.uid()
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.job_helper_approvals FROM anon, authenticated;

-- ============================================================
-- 5) Guardian onboarding: set/replace PIN
-- ============================================================
CREATE OR REPLACE FUNCTION public.guardian_setup(_pin text)
RETURNS text                                  -- returns the link code
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_role user_role;
  v_code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS NULL OR v_role <> 'guardian' THEN
    RAISE EXCEPTION 'Only guardian accounts may set a guardian PIN';
  END IF;

  INSERT INTO public.guardian_profiles (id, pin_hash)
  VALUES (auth.uid(), extensions.crypt(_pin, extensions.gen_salt('bf', 10)))
  ON CONFLICT (id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash,
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = now();

  SELECT link_code INTO v_code FROM public.guardian_profiles WHERE id = auth.uid();
  RETURN v_code;
END;
$$;
GRANT EXECUTE ON FUNCTION public.guardian_setup(text) TO authenticated;

-- ============================================================
-- 6) Helper requests a link to a guardian (by link code)
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_guardian_link(_code text)
RETURNS uuid                                  -- returns guardian_id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guardian uuid;
  v_helper_role user_role;
  v_under18 boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT role INTO v_helper_role FROM public.profiles WHERE id = auth.uid();
  IF v_helper_role <> 'helper' THEN RAISE EXCEPTION 'Only helper accounts can link a guardian'; END IF;

  SELECT is_under_18 INTO v_under18 FROM public.helper_profiles WHERE id = auth.uid();
  IF NOT COALESCE(v_under18, false) THEN RAISE EXCEPTION 'Only under-18 helpers need a guardian link'; END IF;

  SELECT id INTO v_guardian FROM public.guardian_profiles WHERE link_code = upper(trim(_code));
  IF v_guardian IS NULL THEN RAISE EXCEPTION 'No guardian found with that code'; END IF;

  INSERT INTO public.guardian_helpers (guardian_id, helper_id, confirmed)
  VALUES (v_guardian, auth.uid(), false)
  ON CONFLICT (guardian_id, helper_id) DO NOTHING;

  RETURN v_guardian;
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_guardian_link(text) TO authenticated;

-- ============================================================
-- 7) Guardian confirms a pending helper link (PIN-protected)
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_guardian_link(_helper_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
  v_locked timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT pin_hash, locked_until INTO v_hash, v_locked
  FROM public.guardian_profiles WHERE id = auth.uid();
  IF v_hash IS NULL THEN RAISE EXCEPTION 'No guardian profile'; END IF;
  IF v_locked IS NOT NULL AND v_locked > now() THEN
    RAISE EXCEPTION 'Account temporarily locked. Try again later.';
  END IF;

  IF extensions.crypt(_pin, v_hash) <> v_hash THEN
    UPDATE public.guardian_profiles
       SET failed_attempts = failed_attempts + 1,
           locked_until = CASE WHEN failed_attempts + 1 >= 5
                               THEN now() + interval '15 minutes'
                               ELSE locked_until END
     WHERE id = auth.uid();
    RETURN false;
  END IF;

  UPDATE public.guardian_helpers
     SET confirmed = true, confirmed_at = now()
   WHERE guardian_id = auth.uid() AND helper_id = _helper_id;

  UPDATE public.guardian_profiles
     SET failed_attempts = 0, locked_until = NULL WHERE id = auth.uid();

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.confirm_guardian_link(uuid, text) TO authenticated;

-- ============================================================
-- 8) Helper requests per-job approval (no link / no email)
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_job_approval(_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- must be a confirmed link to at least one guardian
  IF NOT EXISTS (
    SELECT 1 FROM public.guardian_helpers
    WHERE helper_id = auth.uid() AND confirmed = true
  ) THEN
    RAISE EXCEPTION 'No confirmed guardian linked to this account';
  END IF;

  -- must have expressed interest in this job
  IF NOT EXISTS (
    SELECT 1 FROM public.job_interests
    WHERE job_id = _job_id AND helper_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You must express interest in this job first';
  END IF;

  INSERT INTO public.job_helper_approvals (job_id, helper_id)
  VALUES (_job_id, auth.uid())
  ON CONFLICT (job_id, helper_id) DO NOTHING;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_job_approval(uuid) TO authenticated;

-- ============================================================
-- 9) Guardian approves a job by entering PIN
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_job_with_pin(_job_id uuid, _helper_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
  v_locked timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- must be a confirmed guardian for this helper
  IF NOT EXISTS (
    SELECT 1 FROM public.guardian_helpers
    WHERE guardian_id = auth.uid() AND helper_id = _helper_id AND confirmed = true
  ) THEN
    RAISE EXCEPTION 'Not linked to this helper';
  END IF;

  SELECT pin_hash, locked_until INTO v_hash, v_locked
  FROM public.guardian_profiles WHERE id = auth.uid();
  IF v_locked IS NOT NULL AND v_locked > now() THEN
    RAISE EXCEPTION 'Account temporarily locked. Try again later.';
  END IF;

  IF v_hash IS NULL OR extensions.crypt(_pin, v_hash) <> v_hash THEN
    UPDATE public.guardian_profiles
       SET failed_attempts = failed_attempts + 1,
           locked_until = CASE WHEN failed_attempts + 1 >= 5
                               THEN now() + interval '15 minutes' ELSE locked_until END
     WHERE id = auth.uid();
    RETURN false;
  END IF;

  INSERT INTO public.job_helper_approvals (job_id, helper_id, guardian_id, approved, approved_at)
  VALUES (_job_id, _helper_id, auth.uid(), true, now())
  ON CONFLICT (job_id, helper_id) DO UPDATE
    SET approved = true, approved_at = now(), guardian_id = EXCLUDED.guardian_id;

  UPDATE public.guardian_profiles
     SET failed_attempts = 0, locked_until = NULL WHERE id = auth.uid();

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_job_with_pin(uuid, uuid, text) TO authenticated;

-- ============================================================
-- 10) Guardian dashboard: pending links + pending job approvals
-- ============================================================
CREATE OR REPLACE FUNCTION public.list_guardian_pending()
RETURNS TABLE (
  kind text,                  -- 'link' | 'job'
  helper_id uuid,
  helper_name text,
  job_id uuid,
  job_description text,
  job_category task_category,
  requested_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'link'::text, gh.helper_id, p.full_name, NULL::uuid, NULL::text, NULL::task_category, gh.requested_at
  FROM public.guardian_helpers gh
  JOIN public.profiles p ON p.id = gh.helper_id
  WHERE gh.guardian_id = auth.uid() AND gh.confirmed = false
  UNION ALL
  SELECT 'job'::text, jha.helper_id, p.full_name, j.id, j.description, j.category, jha.requested_at
  FROM public.job_helper_approvals jha
  JOIN public.guardian_helpers gh
    ON gh.helper_id = jha.helper_id AND gh.confirmed = true
  JOIN public.profiles p ON p.id = jha.helper_id
  JOIN public.jobs j ON j.id = jha.job_id
  WHERE gh.guardian_id = auth.uid() AND jha.approved = false
  ORDER BY requested_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.list_guardian_pending() TO authenticated;

-- ============================================================
-- 11) Update job_interests RLS to use the new approval table
-- ============================================================
DROP POLICY IF EXISTS "Helper or homeowner views interest" ON public.job_interests;

CREATE POLICY "Helper or homeowner views interest"
ON public.job_interests
FOR SELECT
TO authenticated
USING (
  helper_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_interests.job_id
      AND j.homeowner_id = auth.uid()
      AND (
        NOT COALESCE(
          (SELECT hp.is_under_18 FROM public.helper_profiles hp WHERE hp.id = job_interests.helper_id),
          false
        )
        OR EXISTS (
          SELECT 1 FROM public.job_helper_approvals jha
          WHERE jha.job_id = job_interests.job_id
            AND jha.helper_id = job_interests.helper_id
            AND jha.approved = true
        )
      )
  )
);

-- ============================================================
-- 12) Drop the legacy public token approval table
-- ============================================================
DROP TABLE IF EXISTS public.job_guardian_approvals;

-- Drop unused guardian email/name/phone columns on helper_profiles (replaced by link)
ALTER TABLE public.helper_profiles
  DROP COLUMN IF EXISTS guardian_email,
  DROP COLUMN IF EXISTS guardian_phone,
  DROP COLUMN IF EXISTS guardian_relationship,
  DROP COLUMN IF EXISTS guardian_approved;
-- Keep guardian_name (handy display) and is_under_18.

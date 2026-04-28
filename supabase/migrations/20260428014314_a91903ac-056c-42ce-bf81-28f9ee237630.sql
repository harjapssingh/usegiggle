-- =========================================================
-- Fix #1: Move job PINs to a separate, tightly-scoped table
-- =========================================================
CREATE TABLE IF NOT EXISTS public.job_pins (
  job_id uuid PRIMARY KEY,
  start_pin text NOT NULL CHECK (start_pin ~ '^[0-9]{4}$'),
  completion_pin text NOT NULL CHECK (completion_pin ~ '^[0-9]{4}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_pins ENABLE ROW LEVEL SECURITY;

-- Deny-by-default: NO policies allow direct client access to this table.
-- All reads/writes go through SECURITY DEFINER functions.
REVOKE ALL ON public.job_pins FROM PUBLIC, anon, authenticated;

-- Backfill from jobs
INSERT INTO public.job_pins (job_id, start_pin, completion_pin)
SELECT id, start_pin, completion_pin
FROM public.jobs
WHERE start_pin IS NOT NULL AND completion_pin IS NOT NULL
ON CONFLICT (job_id) DO NOTHING;

-- Drop the exposed columns from jobs
ALTER TABLE public.jobs DROP COLUMN IF EXISTS start_pin;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS completion_pin;

-- Update functions to use job_pins instead of jobs.start_pin/completion_pin

CREATE OR REPLACE FUNCTION public.get_job_pins(_job_id uuid)
 RETURNS TABLE(start_pin text, completion_pin text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jp.start_pin, jp.completion_pin
  FROM public.job_pins jp
  JOIN public.jobs j ON j.id = jp.job_id
  WHERE jp.job_id = _job_id
    AND j.homeowner_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_job_pins_for_helper(_job_id uuid)
 RETURNS TABLE(start_pin text, completion_pin text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jp.start_pin, jp.completion_pin
  FROM public.job_pins jp
  JOIN public.jobs j ON j.id = jp.job_id
  WHERE jp.job_id = _job_id AND j.helper_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.verify_start_pin(_job_id uuid, _pin text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_match boolean := false;
  v_locked timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT locked_until INTO v_locked
  FROM public.job_pin_attempts WHERE job_id = _job_id AND helper_id = auth.uid();
  IF v_locked IS NOT NULL AND v_locked > now() THEN
    RAISE EXCEPTION 'Locked until %', v_locked;
  END IF;

  SELECT (j.helper_id = auth.uid() AND j.status = 'matched' AND jp.start_pin = _pin)
    INTO v_match
  FROM public.jobs j
  LEFT JOIN public.job_pins jp ON jp.job_id = j.id
  WHERE j.id = _job_id;

  IF COALESCE(v_match, false) THEN
    UPDATE public.jobs
       SET status = 'in_progress', started_at = now()
     WHERE id = _job_id AND helper_id = auth.uid() AND status = 'matched';
    DELETE FROM public.job_pin_attempts WHERE job_id = _job_id AND helper_id = auth.uid();
    RETURN true;
  END IF;

  INSERT INTO public.job_pin_attempts (job_id, helper_id, failed_attempts, locked_until, updated_at)
  VALUES (_job_id, auth.uid(), 1, NULL, now())
  ON CONFLICT (job_id, helper_id) DO UPDATE
    SET failed_attempts = public.job_pin_attempts.failed_attempts + 1,
        locked_until = CASE WHEN public.job_pin_attempts.failed_attempts + 1 >= 5
                            THEN now() + interval '15 minutes' ELSE NULL END,
        updated_at = now();
  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_completion_pin(_job_id uuid, _pin text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_match boolean := false;
  v_locked timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT locked_until INTO v_locked
  FROM public.job_pin_attempts WHERE job_id = _job_id AND helper_id = auth.uid();
  IF v_locked IS NOT NULL AND v_locked > now() THEN
    RAISE EXCEPTION 'Locked until %', v_locked;
  END IF;

  SELECT (j.helper_id = auth.uid() AND j.status = 'in_progress' AND jp.completion_pin = _pin)
    INTO v_match
  FROM public.jobs j
  LEFT JOIN public.job_pins jp ON jp.job_id = j.id
  WHERE j.id = _job_id;

  IF COALESCE(v_match, false) THEN
    UPDATE public.jobs
       SET status = 'completed', completed_at = now()
     WHERE id = _job_id AND helper_id = auth.uid() AND status = 'in_progress';
    DELETE FROM public.job_pin_attempts WHERE job_id = _job_id AND helper_id = auth.uid();
    RETURN true;
  END IF;

  INSERT INTO public.job_pin_attempts (job_id, helper_id, failed_attempts, locked_until, updated_at)
  VALUES (_job_id, auth.uid(), 1, NULL, now())
  ON CONFLICT (job_id, helper_id) DO UPDATE
    SET failed_attempts = public.job_pin_attempts.failed_attempts + 1,
        locked_until = CASE WHEN public.job_pin_attempts.failed_attempts + 1 >= 5
                            THEN now() + interval '15 minutes' ELSE NULL END,
        updated_at = now();
  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_helper(_job_id uuid, _helper_id uuid)
 RETURNS TABLE(start_pin text, completion_pin text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_start text;
  v_complete text;
  v_under18 boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = _job_id AND j.homeowner_id = auth.uid() AND j.status = 'open'
  ) THEN
    RAISE EXCEPTION 'Job not found or not assignable';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.job_interests ji
    WHERE ji.job_id = _job_id AND ji.helper_id = _helper_id
  ) THEN
    RAISE EXCEPTION 'Helper has not expressed interest in this job';
  END IF;

  SELECT COALESCE(hp.is_under_18, false) INTO v_under18
  FROM public.helper_profiles hp WHERE hp.id = _helper_id;

  IF v_under18 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.job_helper_approvals jha
      WHERE jha.job_id = _job_id AND jha.helper_id = _helper_id AND jha.approved = true
    ) THEN
      RAISE EXCEPTION 'Guardian approval required for this helper';
    END IF;
  END IF;

  v_start := public.generate_pin();
  v_complete := public.generate_pin();

  UPDATE public.jobs
     SET helper_id = _helper_id,
         status = 'matched',
         updated_at = now()
   WHERE id = _job_id AND homeowner_id = auth.uid() AND status = 'open';

  INSERT INTO public.job_pins (job_id, start_pin, completion_pin)
  VALUES (_job_id, v_start, v_complete)
  ON CONFLICT (job_id) DO UPDATE
    SET start_pin = EXCLUDED.start_pin,
        completion_pin = EXCLUDED.completion_pin,
        updated_at = now();

  RETURN QUERY SELECT v_start, v_complete;
END;
$function$;

-- =========================================================
-- Fix #2: Prevent pin_hash from being readable by clients
-- =========================================================
-- Revoke column-level SELECT on pin_hash; keep other columns readable
REVOKE SELECT ON public.guardian_profiles FROM authenticated, anon, PUBLIC;
GRANT SELECT (id, link_code, failed_attempts, locked_until, created_at, updated_at)
  ON public.guardian_profiles TO authenticated;
-- pin_hash is intentionally excluded; SECURITY DEFINER functions still access it.
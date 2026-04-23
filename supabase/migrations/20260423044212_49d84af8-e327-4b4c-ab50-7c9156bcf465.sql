-- Track failed PIN attempts per helper per job
CREATE TABLE IF NOT EXISTS public.job_pin_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  helper_id uuid NOT NULL,
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, helper_id)
);

ALTER TABLE public.job_pin_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Helper views own attempts" ON public.job_pin_attempts
  FOR SELECT TO authenticated
  USING (helper_id = auth.uid());

-- Read helper's current lock state for a job
CREATE OR REPLACE FUNCTION public.get_job_pin_lock(_job_id uuid)
RETURNS TABLE(failed_attempts int, locked_until timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT failed_attempts, locked_until
  FROM public.job_pin_attempts
  WHERE job_id = _job_id AND helper_id = auth.uid();
$$;

-- Replace verify_start_pin with lockout logic
CREATE OR REPLACE FUNCTION public.verify_start_pin(_job_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match boolean := false;
  v_locked timestamptz;
  v_attempts int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT locked_until, failed_attempts INTO v_locked, v_attempts
  FROM public.job_pin_attempts WHERE job_id = _job_id AND helper_id = auth.uid();
  IF v_locked IS NOT NULL AND v_locked > now() THEN
    RAISE EXCEPTION 'Locked until %', v_locked;
  END IF;

  SELECT (j.helper_id = auth.uid() AND j.status = 'matched' AND j.start_pin = _pin)
    INTO v_match
  FROM public.jobs j
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
$$;

-- Replace verify_completion_pin with lockout logic
CREATE OR REPLACE FUNCTION public.verify_completion_pin(_job_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
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

  SELECT (j.helper_id = auth.uid() AND j.status = 'in_progress' AND j.completion_pin = _pin)
    INTO v_match
  FROM public.jobs j
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
$$;
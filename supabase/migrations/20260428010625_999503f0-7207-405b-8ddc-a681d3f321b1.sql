-- Stronger PIN generator using pgcrypto random bytes
CREATE OR REPLACE FUNCTION public.generate_pin()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public, extensions
AS $$
  SELECT lpad(((get_byte(extensions.gen_random_bytes(2), 0) * 256 + get_byte(extensions.gen_random_bytes(2), 1)) % 10000)::text, 4, '0');
$$;

-- Format check for PIN columns (allow NULL, but any value must be 4 digits)
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_start_pin_format;
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_completion_pin_format;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_start_pin_format
  CHECK (start_pin IS NULL OR start_pin ~ '^[0-9]{4}$');
ALTER TABLE public.jobs ADD CONSTRAINT jobs_completion_pin_format
  CHECK (completion_pin IS NULL OR completion_pin ~ '^[0-9]{4}$');

-- Atomic server-side helper assignment with PIN generation
CREATE OR REPLACE FUNCTION public.assign_helper(_job_id uuid, _helper_id uuid)
RETURNS TABLE(start_pin text, completion_pin text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_start text;
  v_complete text;
  v_under18 boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Must be the homeowner of an open job
  IF NOT EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = _job_id AND j.homeowner_id = auth.uid() AND j.status = 'open'
  ) THEN
    RAISE EXCEPTION 'Job not found or not assignable';
  END IF;

  -- Helper must have expressed interest
  IF NOT EXISTS (
    SELECT 1 FROM public.job_interests ji
    WHERE ji.job_id = _job_id AND ji.helper_id = _helper_id
  ) THEN
    RAISE EXCEPTION 'Helper has not expressed interest in this job';
  END IF;

  -- If helper is under 18, guardian approval required
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
         start_pin = v_start,
         completion_pin = v_complete,
         updated_at = now()
   WHERE id = _job_id AND homeowner_id = auth.uid() AND status = 'open';

  RETURN QUERY SELECT v_start, v_complete;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_helper(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_helper(uuid, uuid) TO authenticated;

-- Tighten generate_pin execute grants (only used internally now)
REVOKE EXECUTE ON FUNCTION public.generate_pin() FROM PUBLIC, anon;
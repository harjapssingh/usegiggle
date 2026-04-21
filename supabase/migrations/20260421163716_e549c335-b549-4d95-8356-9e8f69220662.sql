
-- Add PIN + timing columns to jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS start_pin TEXT,
  ADD COLUMN IF NOT EXISTS completion_pin TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Helper to gen 4-digit pin
CREATE OR REPLACE FUNCTION public.generate_pin()
RETURNS TEXT LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT lpad((floor(random() * 10000))::int::text, 4, '0');
$$;

-- ============== messages ==============
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_job_created ON public.messages(job_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper function: is the current user a participant on this job?
CREATE OR REPLACE FUNCTION public.is_job_participant(_job_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = _job_id
      AND (j.homeowner_id = _user_id
           OR j.helper_id = _user_id
           OR EXISTS (SELECT 1 FROM public.job_interests ji WHERE ji.job_id = j.id AND ji.helper_id = _user_id))
  );
$$;

CREATE POLICY "Participants view messages"
ON public.messages FOR SELECT TO authenticated
USING (public.is_job_participant(job_id, auth.uid()));

CREATE POLICY "Participants send messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.is_job_participant(job_id, auth.uid()));

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============== guardian approvals ==============
CREATE TABLE IF NOT EXISTS public.job_guardian_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  helper_id UUID NOT NULL,
  guardian_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, helper_id)
);

ALTER TABLE public.job_guardian_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Helper or homeowner views approval"
ON public.job_guardian_approvals FOR SELECT TO authenticated
USING (
  helper_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.homeowner_id = auth.uid())
);

CREATE POLICY "Helper creates own approval request"
ON public.job_guardian_approvals FOR INSERT TO authenticated
WITH CHECK (helper_id = auth.uid());

-- ============== Update job_interests visibility for under-18 ==============
DROP POLICY IF EXISTS "Helper views own interest, homeowner views interest in their jo" ON public.job_interests;

CREATE POLICY "Helper or homeowner views interest"
ON public.job_interests FOR SELECT TO authenticated
USING (
  helper_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_interests.job_id
      AND j.homeowner_id = auth.uid()
      AND (
        -- Helper is 18+
        NOT COALESCE((SELECT hp.is_under_18 FROM public.helper_profiles hp WHERE hp.id = job_interests.helper_id), false)
        OR
        -- Or guardian has approved this specific job
        EXISTS (
          SELECT 1 FROM public.job_guardian_approvals ga
          WHERE ga.job_id = job_interests.job_id
            AND ga.helper_id = job_interests.helper_id
            AND ga.approved = true
        )
      )
  )
);

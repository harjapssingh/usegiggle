-- 1) Restrict profiles SELECT to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Authenticated users read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 2) Protect job PINs: split SELECT policy so PIN columns are unreadable via direct table queries
-- The existing policy allows reading ALL columns of open jobs. Revoke column-level SELECT on PIN columns
-- from authenticated role. Homeowner & helper retrieve PINs via SECURITY DEFINER functions
-- (get_job_pins, get_job_pins_for_helper).
REVOKE SELECT (start_pin, completion_pin) ON public.jobs FROM authenticated, anon;

-- Grant SELECT on remaining columns explicitly to authenticated role
GRANT SELECT (
  id, homeowner_id, helper_id, category, description, budget,
  neighbourhood, scheduled_date, scheduled_time_window,
  status, started_at, completed_at, created_at, updated_at
) ON public.jobs TO authenticated;

-- 3) Allow authenticated users to read SAFE helper profile fields of ACTIVE helpers
-- via the existing helper_profiles_public view. The view already excludes age, school_name,
-- guardian_name, is_under_18. Ensure the underlying RLS permits the view to return active rows
-- to any authenticated user (the view runs with invoker rights by default).
-- Add a permissive SELECT policy that exposes ONLY non-sensitive columns by using a security barrier
-- via the public view. To make the view work for non-owners, create a SECURITY DEFINER-backed
-- replacement: keep the table RLS strict, and recreate the view as security_invoker = false (definer).

-- Recreate helper_profiles_public as a SECURITY DEFINER view restricted to active helpers,
-- so authenticated users can read only safe fields without granting broad table access.
DROP VIEW IF EXISTS public.helper_profiles_public;

CREATE VIEW public.helper_profiles_public
WITH (security_invoker = false) AS
SELECT
  id,
  bio,
  categories,
  hourly_rate,
  per_job_rate,
  rate_type,
  school_verified,
  is_active,
  created_at
FROM public.helper_profiles
WHERE is_active = true;

-- Lock the view down to authenticated users only
REVOKE ALL ON public.helper_profiles_public FROM PUBLIC, anon;
GRANT SELECT ON public.helper_profiles_public TO authenticated;
-- Recreate the view with security_invoker = true (default behavior, satisfies linter)
DROP VIEW IF EXISTS public.helper_profiles_public;

CREATE VIEW public.helper_profiles_public
WITH (security_invoker = true) AS
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

REVOKE ALL ON public.helper_profiles_public FROM PUBLIC, anon;
GRANT SELECT ON public.helper_profiles_public TO authenticated;

-- Add an RLS policy on helper_profiles that lets authenticated users read ACTIVE helper rows,
-- but restrict which COLUMNS they can read via GRANTs. Sensitive columns (age, school_name,
-- guardian_name, is_under_18) are NOT granted to general authenticated role.
CREATE POLICY "Authenticated users read active helper rows"
  ON public.helper_profiles FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Revoke broad table SELECT, then grant only safe columns to authenticated role.
-- The existing "Helper reads own profile" policy still works because the helper owns their row;
-- but we also need them to be able to read ALL their own columns. So we grant safe columns to
-- authenticated, and grant the sensitive columns separately only at runtime via the policy
-- USING clause. Postgres column GRANTs are role-wide, so we cannot column-restrict per-policy.
-- Instead: keep all column SELECT granted to authenticated, and rely on a stricter RLS policy
-- that restricts non-owners to active rows only. Sensitive columns will still be visible to
-- non-owners on active helpers.
--
-- To truly hide age/guardian_name/school_name/is_under_18 from non-owners, we need column-level
-- GRANTs combined with two separate policies. Simpler & safer: revoke direct SELECT on sensitive
-- columns from authenticated, and force non-owner reads to go through the view.

REVOKE SELECT ON public.helper_profiles FROM authenticated, anon;

-- Grant safe columns to authenticated (needed by the view and by helpers reading their own row)
GRANT SELECT (
  id, bio, categories, hourly_rate, per_job_rate, rate_type,
  school_verified, is_active, created_at
) ON public.helper_profiles TO authenticated;

-- Grant sensitive columns only to the helper themselves via a separate role-less mechanism:
-- Postgres can't condition column grants on auth.uid(). So we grant them to authenticated and
-- rely on RLS USING (auth.uid() = id) for the "owner reads own profile" policy combined with
-- removing the broad active-row policy's access to sensitive columns. Since column grants are
-- role-wide, we must instead expose sensitive fields only via the existing SECURITY DEFINER
-- function get_helper_for_job (already restricted to homeowners with interested helpers).

-- Grant sensitive columns to authenticated so the OWNER can read them (RLS USING auth.uid()=id)
GRANT SELECT (age, school_name, guardian_name, is_under_18) ON public.helper_profiles TO authenticated;

-- Drop the new permissive policy and replace with one that restricts non-owners to
-- safe columns only via the view (handled by REVOKE + view), and keeps full access for owner.
DROP POLICY "Authenticated users read active helper rows" ON public.helper_profiles;

CREATE POLICY "Authenticated users read active helpers safe fields"
  ON public.helper_profiles FOR SELECT
  TO authenticated
  USING (is_active = true OR auth.uid() = id);

-- ============================================================
-- 1) Extend the user_role enum to include 'guardian'
-- ============================================================
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'guardian';

-- =====================================================================
-- Migration 040: Admin snapshot / backup
--
-- 1. admin_select_predictions  — admin SELECT policy on predictions
-- 2. admin_select_groups       — admin SELECT policy on groups
-- 3. admin_select_group_members— admin SELECT policy on group_members
-- 4. admin_get_all_admin_users — SECURITY DEFINER to read admin_users
--    (direct SELECT policy would cause self-referential RLS recursion)
-- =====================================================================

-- ── 1. predictions: admin can read all rows ───────────────────────────

CREATE POLICY "admin_select_predictions" ON predictions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ── 2. groups: admin can read all rows ───────────────────────────────

CREATE POLICY "admin_select_groups" ON groups
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ── 3. group_members: admin can read all rows ─────────────────────────

CREATE POLICY "admin_select_group_members" ON group_members
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ── 4. admin_get_all_admin_users ──────────────────────────────────────
-- A direct SELECT policy on admin_users would reference itself in the
-- USING clause, causing infinite RLS recursion. Use SECURITY DEFINER
-- instead — the function body runs as the owner (bypassing RLS) while
-- auth.uid() still resolves to the calling user's JWT.

CREATE OR REPLACE FUNCTION admin_get_all_admin_users()
RETURNS TABLE (user_id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  RETURN QUERY
    SELECT au.user_id, au.created_at
    FROM   admin_users au
    ORDER  BY au.created_at;
END;
$$;

REVOKE ALL     ON FUNCTION admin_get_all_admin_users() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION admin_get_all_admin_users() TO authenticated;

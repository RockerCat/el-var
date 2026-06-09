-- =====================================================================
-- Migration 038: update_match_fixture RPC
--
-- Adds a SECURITY DEFINER function that lets admins update fixture
-- metadata (starts_at, group_code) for a match.
--
-- Same pattern as update_match_result and admin_edit_match_full:
-- bypasses RLS so the matches table needs no direct UPDATE policy.
-- =====================================================================

CREATE OR REPLACE FUNCTION update_match_fixture(
  p_match_id   UUID,
  p_starts_at  TIMESTAMPTZ,
  p_group_code TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM matches WHERE id = p_match_id) THEN
    RAISE EXCEPTION 'match_not_found';
  END IF;

  UPDATE matches
  SET
    starts_at  = p_starts_at,
    group_code = p_group_code
  WHERE id = p_match_id;
END;
$$;

REVOKE ALL     ON FUNCTION update_match_fixture(UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION update_match_fixture(UUID, TIMESTAMPTZ, TEXT) TO authenticated;

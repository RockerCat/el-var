-- =====================================================================
-- Migration 048: save_winner_side RPC
--
-- The matches table has no direct UPDATE policy for authenticated users
-- (all writes go through SECURITY DEFINER functions). This function
-- persists winner_side for knockout matches decided by penalties,
-- replacing the previously silent-failing direct .update() call in
-- updateMatchResultAction and advancedEditMatchAction.
-- =====================================================================

CREATE OR REPLACE FUNCTION save_winner_side(
  p_match_id    UUID,
  p_winner_side TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  IF p_winner_side IS NOT NULL AND p_winner_side NOT IN ('home', 'away') THEN
    RAISE EXCEPTION 'invalid_winner_side';
  END IF;

  UPDATE matches SET winner_side = p_winner_side WHERE id = p_match_id;
END;
$$;

REVOKE ALL     ON FUNCTION save_winner_side(UUID, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION save_winner_side(UUID, TEXT) TO authenticated;

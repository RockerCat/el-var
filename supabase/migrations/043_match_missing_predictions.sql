-- =====================================================================
-- El VAR — Migration 043: Missing predictions for a match (admin view)
--
-- get_match_missing_predictions() returns active, non-disabled,
-- non-admin participants who have NOT submitted a prediction for the
-- given match. Read-only — does not touch predictions/matches/scoring.
-- =====================================================================

CREATE OR REPLACE FUNCTION get_match_missing_predictions(p_match_id UUID)
RETURNS TABLE (
  user_id      UUID,
  display_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users adm WHERE adm.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    gm.user_id,
    COALESCE(au.raw_user_meta_data->>'username',
             SPLIT_PART(au.email, '@', 1))::TEXT AS display_name
  FROM   group_members gm
  JOIN   auth.users au ON au.id = gm.user_id
  WHERE  NOT EXISTS (
           SELECT 1 FROM admin_users a WHERE a.user_id = gm.user_id
         )
    AND  NOT EXISTS (
           SELECT 1 FROM user_profiles up
           WHERE up.user_id = gm.user_id AND up.is_disabled = true
         )
    AND  NOT EXISTS (
           SELECT 1 FROM predictions p
           WHERE p.match_id = p_match_id AND p.user_id = gm.user_id
         )
  ORDER BY display_name;
END;
$$;

REVOKE ALL     ON FUNCTION get_match_missing_predictions(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_match_missing_predictions(UUID) TO authenticated;

-- =====================================================================
-- El VAR — Migration 044: Predicted-at timestamp + missing predictions
-- for the match detail page's "Tabla de pronósticos" section.
--
-- 1) get_match_detail_predictions now also returns predicted_at
--    (predictions.updated_at — reflects edits made before kickoff).
-- 2) get_match_missing_predictions_for_group returns group members who
--    have NOT submitted a prediction for a given match. Unlike
--    get_match_missing_predictions() (admin-only, migration 043), this
--    is callable by any member of the group — needed so participants
--    can see the "Sin pronóstico" section on the match detail page.
-- =====================================================================

DROP FUNCTION IF EXISTS get_match_detail_predictions(uuid, uuid);

CREATE FUNCTION get_match_detail_predictions(
  p_match_id uuid,
  p_group_id uuid
)
RETURNS TABLE (
  user_id       uuid,
  display_name  text,
  pred_home     int,
  pred_away     int,
  points        int,
  points_reason text,
  predicted_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM group_members AS gm_check
    WHERE gm_check.group_id = p_group_id
      AND gm_check.user_id  = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    COALESCE(
      au.raw_user_meta_data->>'username',
      split_part(au.email, '@', 1)
    )::text                    AS display_name,
    p.home_score::int          AS pred_home,
    p.away_score::int          AS pred_away,
    COALESCE(p.points, 0)::int AS points,
    p.points_reason,
    p.updated_at                AS predicted_at
  FROM predictions p
  JOIN group_members gm
    ON  gm.user_id  = p.user_id
    AND gm.group_id = p_group_id
  JOIN auth.users au
    ON  au.id = p.user_id
  LEFT JOIN user_profiles up
    ON  up.user_id = p.user_id
  WHERE p.match_id = p_match_id
    AND (up.user_id IS NULL OR up.is_disabled = false)
  ORDER BY p.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION get_match_detail_predictions(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION get_match_missing_predictions_for_group(
  p_match_id uuid,
  p_group_id uuid
)
RETURNS TABLE (
  user_id      uuid,
  display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM group_members AS gm_check
    WHERE gm_check.group_id = p_group_id
      AND gm_check.user_id  = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    gm.user_id,
    COALESCE(au.raw_user_meta_data->>'username',
             split_part(au.email, '@', 1))::text AS display_name
  FROM   group_members gm
  JOIN   auth.users au ON au.id = gm.user_id
  WHERE  gm.group_id = p_group_id
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

REVOKE ALL     ON FUNCTION get_match_missing_predictions_for_group(uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_match_missing_predictions_for_group(uuid, uuid) TO authenticated;

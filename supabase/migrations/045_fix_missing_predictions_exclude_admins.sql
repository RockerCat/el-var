-- =====================================================================
-- El VAR — Migration 045: Fix get_match_missing_predictions_for_group
--
-- Migration 044 forgot to exclude admins from the "Sin pronóstico"
-- list (the admin-only get_match_missing_predictions from migration
-- 043 already excluded them). Admins don't participate in
-- predictions, so they should never show up as "missing" a forecast.
-- =====================================================================

DROP FUNCTION IF EXISTS get_match_missing_predictions_for_group(uuid, uuid);

CREATE FUNCTION get_match_missing_predictions_for_group(
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
           SELECT 1 FROM admin_users adm WHERE adm.user_id = gm.user_id
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

REVOKE ALL     ON FUNCTION get_match_missing_predictions_for_group(uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_match_missing_predictions_for_group(uuid, uuid) TO authenticated;

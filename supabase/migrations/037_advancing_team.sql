-- =====================================================================
-- Migration 037: Advancing team for knockout rounds
--
-- Adds advancing_team_id to matches so admins can record which team
-- advanced to the next round when a knockout match ends in a draw
-- (decided by penalty shootout).
--
-- SCORING GUARANTEE:
--   calculate_match_points() uses ONLY home_score and away_score.
--   advancing_team_id is NEVER read by the scoring function.
--   Penalties do not affect points — only regulation + extra time scores do.
--
-- USAGE:
--   - Group stage (stage = 'group'): always NULL, not applicable.
--   - Knockout draw: admin sets this to the team that won on penalties.
--   - Knockout non-draw: can be inferred from scores; stored for convenience.
-- =====================================================================

-- 1. Add the column ────────────────────────────────────────────────────

ALTER TABLE matches
  ADD COLUMN advancing_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- 2. Recreate update_match_result with advancing_team_id support ───────
--
-- Must drop the old signature before recreating because PostgreSQL does
-- not allow CREATE OR REPLACE to add parameters to existing functions.

DROP FUNCTION IF EXISTS update_match_result(UUID, TEXT, INT, INT);

CREATE FUNCTION update_match_result(
  p_match_id          UUID,
  p_status            TEXT,
  p_home_score        INT,
  p_away_score        INT,
  p_advancing_team_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_scored  INT := 0;
BEGIN
  v_user_id := auth.uid();

  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  IF p_status NOT IN ('scheduled', 'live', 'finished') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  IF p_home_score IS NOT NULL AND (p_home_score < 0 OR p_home_score > 30) THEN
    RAISE EXCEPTION 'invalid_scores';
  END IF;
  IF p_away_score IS NOT NULL AND (p_away_score < 0 OR p_away_score > 30) THEN
    RAISE EXCEPTION 'invalid_scores';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM matches WHERE id = p_match_id) THEN
    RAISE EXCEPTION 'match_not_found';
  END IF;

  UPDATE matches
  SET
    status            = p_status,
    home_score        = p_home_score,
    away_score        = p_away_score,
    advancing_team_id = p_advancing_team_id
  WHERE id = p_match_id;

  -- Score predictions when match finishes.
  -- advancing_team_id is NOT used here — scoring is purely home_score vs away_score.
  IF p_status = 'finished'
     AND p_home_score IS NOT NULL
     AND p_away_score IS NOT NULL
  THEN
    v_scored := calculate_match_points(p_match_id);
  END IF;

  RETURN jsonb_build_object('scored', v_scored);
END;
$$;

REVOKE ALL     ON FUNCTION update_match_result(UUID, TEXT, INT, INT, UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION update_match_result(UUID, TEXT, INT, INT, UUID) TO authenticated;

-- 3. Recreate admin_edit_match_full with advancing_team_id support ─────

DROP FUNCTION IF EXISTS admin_edit_match_full(
  UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, INT, INT, TEXT, INT, TEXT
);

CREATE FUNCTION admin_edit_match_full(
  p_match_id          UUID,
  p_home_team_id      UUID,
  p_away_team_id      UUID,
  p_home_placeholder  TEXT,
  p_away_placeholder  TEXT,
  p_starts_at         TIMESTAMPTZ,
  p_stage             TEXT,
  p_status            TEXT,
  p_home_score        INT,
  p_away_score        INT,
  p_group_code        TEXT,
  p_match_number      INT,
  p_venue             TEXT,
  p_advancing_team_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_scored  INT := 0;
BEGIN
  v_user_id := auth.uid();

  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM matches WHERE id = p_match_id) THEN
    RAISE EXCEPTION 'match_not_found';
  END IF;

  IF p_status NOT IN ('scheduled', 'live', 'finished') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  IF p_stage NOT IN ('group', 'round_of_32', 'round_of_16', 'quarter_final',
                     'semi_final', 'third_place', 'final') THEN
    RAISE EXCEPTION 'invalid_stage';
  END IF;

  IF p_home_team_id IS NOT NULL
     AND p_away_team_id IS NOT NULL
     AND p_home_team_id = p_away_team_id THEN
    RAISE EXCEPTION 'same_team_both_sides';
  END IF;

  IF p_status = 'finished'
     AND (p_home_score IS NULL OR p_away_score IS NULL) THEN
    RAISE EXCEPTION 'finished_requires_scores';
  END IF;

  IF p_home_score IS NOT NULL AND (p_home_score < 0 OR p_home_score > 30) THEN
    RAISE EXCEPTION 'invalid_scores';
  END IF;
  IF p_away_score IS NOT NULL AND (p_away_score < 0 OR p_away_score > 30) THEN
    RAISE EXCEPTION 'invalid_scores';
  END IF;

  UPDATE matches
  SET
    home_team_id      = p_home_team_id,
    away_team_id      = p_away_team_id,
    home_placeholder  = CASE WHEN p_home_team_id IS NOT NULL THEN NULL
                             ELSE p_home_placeholder END,
    away_placeholder  = CASE WHEN p_away_team_id IS NOT NULL THEN NULL
                             ELSE p_away_placeholder END,
    starts_at         = p_starts_at,
    stage             = p_stage,
    status            = p_status,
    home_score        = p_home_score,
    away_score        = p_away_score,
    group_code        = p_group_code,
    match_number      = p_match_number,
    venue             = p_venue,
    advancing_team_id = p_advancing_team_id
  WHERE id = p_match_id;

  -- Re-calculate points if now finished with scores.
  -- advancing_team_id is NOT used here — scoring is purely home_score vs away_score.
  IF p_status = 'finished'
     AND p_home_score IS NOT NULL
     AND p_away_score IS NOT NULL THEN
    BEGIN
      v_scored := calculate_match_points(p_match_id);
    EXCEPTION WHEN OTHERS THEN
      v_scored := 0;
    END;
  END IF;

  RETURN jsonb_build_object('scored', v_scored);
END;
$$;

REVOKE ALL ON FUNCTION admin_edit_match_full(
  UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, INT, INT, TEXT, INT, TEXT, UUID
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION admin_edit_match_full(
  UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, INT, INT, TEXT, INT, TEXT, UUID
) TO authenticated;

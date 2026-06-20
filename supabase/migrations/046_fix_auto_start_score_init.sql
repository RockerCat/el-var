-- =====================================================================
-- Migration 046: fix_auto_start_score_init
--
-- Bug: when mark_due_matches_live() transitions a match scheduled → live,
-- home_score/away_score were left untouched (null), breaking any "live"
-- simulation that reads the current score (e.g. "if it ended now").
--
-- Fix: initialize null scores to 0 at the moment of auto-start only.
--   • COALESCE never overwrites an existing score.
--   • Only affects rows matching status='scheduled' AND starts_at<=now()
--     (same WHERE clause as before — live/finished rows are never touched).
--   • Does not trigger scoring, news, or manual close logic.
-- =====================================================================

CREATE OR REPLACE FUNCTION mark_due_matches_live()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE matches
  SET status     = 'live',
      home_score = COALESCE(home_score, 0),
      away_score = COALESCE(away_score, 0)
  WHERE status = 'scheduled'
    AND starts_at <= now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL     ON FUNCTION mark_due_matches_live() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION mark_due_matches_live() TO authenticated;

-- =====================================================================
-- Migration 039: mark_due_matches_live
--
-- Lazy "scheduled → live" transition triggered server-side whenever
-- a page that displays matches is loaded. No cron job required.
--
-- Rules enforced by the function:
--   • Only transitions scheduled → live (never touches live/finished).
--   • Uses database NOW() — never client time.
--   • Does not touch scores, predictions, or point calculations.
--   • Idempotent: repeated calls have no additional effect.
--
-- SECURITY DEFINER is required because the matches table has no direct
-- UPDATE policy for authenticated users (by design — see 008_admin.sql).
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
  SET status = 'live'
  WHERE status = 'scheduled'
    AND starts_at <= now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL     ON FUNCTION mark_due_matches_live() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION mark_due_matches_live() TO authenticated;

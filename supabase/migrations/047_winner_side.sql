-- winner_side: tracks who won a knockout match on penalties.
-- Used exclusively for bracket propagation (Winner Mxx / Loser Mxx resolution).
-- Does NOT affect scoring — penalty results never count for points.
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS winner_side TEXT
    CHECK (winner_side IN ('home', 'away'));

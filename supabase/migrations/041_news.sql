-- =====================================================================
-- Migration 041: News table
--
-- Creates a news feed for tournament events. The first source of news
-- is automatic match-close events (generated server-side in admin.ts).
--
-- RLS: authenticated users may read; writes are server-only
--      (SECURITY DEFINER service role via server-side actions).
-- =====================================================================

CREATE TABLE news (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title            TEXT        NOT NULL,
  summary          TEXT        NOT NULL,
  content          TEXT        NOT NULL,
  related_match_id UUID        REFERENCES matches(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_news_created_at      ON news(created_at DESC);
CREATE INDEX idx_news_related_match   ON news(related_match_id);

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_read_authenticated" ON news
  FOR SELECT TO authenticated USING (true);

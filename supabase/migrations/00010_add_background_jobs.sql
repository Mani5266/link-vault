-- ============================================================
-- Migration 00010: Background Jobs Infrastructure
-- Adds: processing_status to links, digests table, content_decay_scores table
-- ============================================================

-- 1. Add processing_status column to links
ALTER TABLE links
  ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT NULL
  CHECK (processing_status IN ('pending', 'processing', 'complete', 'failed'));

-- Index for querying links by processing status
CREATE INDEX IF NOT EXISTS idx_links_processing_status
  ON links (processing_status)
  WHERE processing_status IS NOT NULL;

-- 2. Digests table — stores generated weekly digests
CREATE TABLE IF NOT EXISTS digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  themes JSONB NOT NULL DEFAULT '[]'::jsonb,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  period_days INTEGER NOT NULL DEFAULT 7,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digests_user_id ON digests (user_id);
CREATE INDEX IF NOT EXISTS idx_digests_created_at ON digests (user_id, created_at DESC);

-- RLS for digests
ALTER TABLE digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digests"
  ON digests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage digests"
  ON digests FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Content decay scores table
CREATE TABLE IF NOT EXISTS content_decay_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decay_score INTEGER NOT NULL DEFAULT 0 CHECK (decay_score >= 0 AND decay_score <= 100),
  age_days INTEGER NOT NULL DEFAULT 0,
  decay_rate TEXT NOT NULL DEFAULT 'medium' CHECK (decay_rate IN ('fast', 'medium', 'slow')),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one score per link
CREATE UNIQUE INDEX IF NOT EXISTS idx_decay_scores_link_id
  ON content_decay_scores (link_id);

CREATE INDEX IF NOT EXISTS idx_decay_scores_user
  ON content_decay_scores (user_id, decay_score DESC);

-- RLS for content_decay_scores
ALTER TABLE content_decay_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own decay scores"
  ON content_decay_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage decay scores"
  ON content_decay_scores FOR ALL
  USING (true)
  WITH CHECK (true);

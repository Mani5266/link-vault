-- ============================================================
-- Migration: Add reading queue fields to links
-- ============================================================

ALTER TABLE links
  ADD COLUMN IF NOT EXISTS reading_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL;

-- Index for reading queue queries
CREATE INDEX IF NOT EXISTS idx_links_user_reading_status
  ON links(user_id, reading_status, created_at DESC);

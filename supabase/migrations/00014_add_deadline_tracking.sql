-- ============================================================
-- Migration 00014: Add deadline tracking for links
-- AI-detected or manually-set deadlines on saved links
-- ============================================================

-- Add deadline columns
ALTER TABLE links ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE links ADD COLUMN IF NOT EXISTS deadline_label TEXT DEFAULT NULL;

-- Index for efficient deadline queries (only links that have deadlines)
CREATE INDEX IF NOT EXISTS idx_links_deadline_at ON links (deadline_at ASC) WHERE deadline_at IS NOT NULL AND deleted_at IS NULL;

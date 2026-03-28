-- ============================================================
-- Migration 00013: Add soft-delete (trash) support for links
-- Adds deleted_at column, index, and auto-cleanup function
-- ============================================================

-- Add deleted_at column (null = not deleted)
ALTER TABLE links ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient trash queries
CREATE INDEX IF NOT EXISTS idx_links_deleted_at ON links (deleted_at) WHERE deleted_at IS NOT NULL;

-- Partial index: exclude deleted links from normal queries (improves default query perf)
CREATE INDEX IF NOT EXISTS idx_links_active ON links (user_id, created_at DESC) WHERE deleted_at IS NULL;

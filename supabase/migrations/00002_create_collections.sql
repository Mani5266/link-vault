-- ============================================================
-- Migration: Create collections table
-- Folders/categories for organizing saved links
-- ============================================================

CREATE TABLE IF NOT EXISTS collections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  emoji       TEXT DEFAULT '📁',
  color       TEXT DEFAULT '#6366f1',
  is_default  BOOLEAN DEFAULT false,
  position    INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Enforce unique slugs per user
  UNIQUE(user_id, slug)
);

-- Enable Row Level Security
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Users can only access their own collections
CREATE POLICY "Users can view own collections"
  ON collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own collections"
  ON collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON collections FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(user_id, slug);

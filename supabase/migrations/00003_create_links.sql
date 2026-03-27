-- ============================================================
-- Migration: Create links table
-- Core table storing all saved links with AI-generated metadata
-- ============================================================

CREATE TABLE IF NOT EXISTS links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  collection_id   UUID REFERENCES collections(id) ON DELETE SET NULL,
  url             TEXT NOT NULL,
  title           TEXT,
  description     TEXT,
  tags            TEXT[] DEFAULT '{}',
  category        TEXT,
  emoji           TEXT,
  domain          TEXT,
  favicon_url     TEXT,
  is_pinned       BOOLEAN DEFAULT false,
  ai_processed    BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Prevent duplicate URLs per user
  UNIQUE(user_id, url)
);

-- Enable Row Level Security
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- Users can only access their own links
CREATE POLICY "Users can view own links"
  ON links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own links"
  ON links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own links"
  ON links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own links"
  ON links FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Indexes for performance
-- ============================================================

-- Primary lookup: all links for a user, sorted by date
CREATE INDEX IF NOT EXISTS idx_links_user_id_created
  ON links(user_id, created_at DESC);

-- Filter by collection
CREATE INDEX IF NOT EXISTS idx_links_collection_id
  ON links(collection_id);

-- Filter by category
CREATE INDEX IF NOT EXISTS idx_links_user_category
  ON links(user_id, category);

-- Pinned items query
CREATE INDEX IF NOT EXISTS idx_links_user_pinned
  ON links(user_id, is_pinned DESC, created_at DESC);

-- Full-text search support
CREATE INDEX IF NOT EXISTS idx_links_domain
  ON links(user_id, domain);

-- GIN index for tag array search
CREATE INDEX IF NOT EXISTS idx_links_tags
  ON links USING GIN(tags);

-- ============================================================
-- Trigger: Auto-update updated_at timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER links_updated_at
  BEFORE UPDATE ON links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

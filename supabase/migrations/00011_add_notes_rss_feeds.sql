-- ============================================================
-- Migration 00011: Notes, RSS Feeds, Knowledge Graph support
-- Adds: link_notes, rss_feeds, rss_feed_items tables
-- ============================================================

-- 1. Link Notes — personal notes/annotations attached to links
CREATE TABLE IF NOT EXISTS link_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_link_notes_link ON link_notes (link_id);
CREATE INDEX IF NOT EXISTS idx_link_notes_user ON link_notes (user_id);

ALTER TABLE link_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes"
  ON link_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notes"
  ON link_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON link_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON link_notes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage notes"
  ON link_notes FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. RSS Feeds — monitored feeds that auto-save new articles as links
CREATE TABLE IF NOT EXISTS rss_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feed_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  site_url TEXT,
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  check_interval_minutes INTEGER NOT NULL DEFAULT 60,
  last_checked_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rss_feeds_user_url
  ON rss_feeds (user_id, feed_url);

CREATE INDEX IF NOT EXISTS idx_rss_feeds_active
  ON rss_feeds (is_active, last_checked_at)
  WHERE is_active = true;

ALTER TABLE rss_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feeds"
  ON rss_feeds FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own feeds"
  ON rss_feeds FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage feeds"
  ON rss_feeds FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. RSS Feed Items — individual articles from feeds (tracks what's been seen)
CREATE TABLE IF NOT EXISTS rss_feed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id UUID NOT NULL REFERENCES rss_feeds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guid TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  published_at TIMESTAMPTZ,
  link_id UUID REFERENCES links(id) ON DELETE SET NULL,
  is_saved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rss_items_feed_guid
  ON rss_feed_items (feed_id, guid);

CREATE INDEX IF NOT EXISTS idx_rss_items_user
  ON rss_feed_items (user_id, created_at DESC);

ALTER TABLE rss_feed_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feed items"
  ON rss_feed_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage feed items"
  ON rss_feed_items FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Add notes_count to links for quick display (optional, denormalized)
ALTER TABLE links
  ADD COLUMN IF NOT EXISTS notes_count INTEGER NOT NULL DEFAULT 0;

-- 5. Helper functions for notes_count increment/decrement
CREATE OR REPLACE FUNCTION increment_notes_count(lid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE links SET notes_count = notes_count + 1 WHERE id = lid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_notes_count(lid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE links SET notes_count = GREATEST(notes_count - 1, 0) WHERE id = lid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

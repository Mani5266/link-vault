-- ============================================================
-- Migration 00012: Security Hardening (idempotent)
--
-- 1. DROP overly permissive "Service role can manage" RLS policies
-- 2. Add proper user-scoped RLS policies for authenticated users
-- 3. Fix handle_new_user() with SET search_path = public
-- 4. Add CHECK constraint on links.reading_status
-- 5. DROP + recreate SECURITY DEFINER functions with SET search_path
-- ============================================================

-- 1. DROP overly permissive RLS policies
DROP POLICY IF EXISTS "Service role can manage digests" ON digests;
DROP POLICY IF EXISTS "Service role can manage decay scores" ON content_decay_scores;
DROP POLICY IF EXISTS "Service role can manage notes" ON link_notes;
DROP POLICY IF EXISTS "Service role can manage feeds" ON rss_feeds;
DROP POLICY IF EXISTS "Service role can manage feed items" ON rss_feed_items;

-- 2. User-scoped policies (drop + create)
DROP POLICY IF EXISTS "Users can view own digests" ON digests;
CREATE POLICY "Users can view own digests"
  ON digests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own decay scores" ON content_decay_scores;
CREATE POLICY "Users can view own decay scores"
  ON content_decay_scores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own notes" ON link_notes;
CREATE POLICY "Users can manage own notes"
  ON link_notes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own feeds" ON rss_feeds;
CREATE POLICY "Users can manage own feeds"
  ON rss_feeds FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own feed items" ON rss_feed_items;
CREATE POLICY "Users can view own feed items"
  ON rss_feed_items FOR SELECT
  TO authenticated
  USING (
    feed_id IN (
      SELECT id FROM rss_feeds WHERE user_id = auth.uid()
    )
  );

-- 3. Fix handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. CHECK constraint on reading_status
ALTER TABLE links DROP CONSTRAINT IF EXISTS chk_reading_status;
ALTER TABLE links ADD CONSTRAINT chk_reading_status
  CHECK (reading_status IS NULL OR reading_status IN ('unread', 'read'));

-- 5. DROP + recreate SECURITY DEFINER functions with SET search_path
DROP FUNCTION IF EXISTS get_user_tags(UUID);
CREATE FUNCTION get_user_tags(p_user_id UUID)
RETURNS TABLE (tag TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT unnest(links.tags) AS tag, COUNT(*) AS count
  FROM public.links
  WHERE links.user_id = p_user_id
  GROUP BY tag
  ORDER BY count DESC, tag ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP FUNCTION IF EXISTS get_collection_link_counts(UUID);
CREATE FUNCTION get_collection_link_counts(p_user_id UUID)
RETURNS TABLE (collection_id UUID, link_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT l.collection_id, COUNT(*) AS link_count
  FROM public.links l
  WHERE l.user_id = p_user_id
    AND l.collection_id IS NOT NULL
  GROUP BY l.collection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION increment_notes_count(lid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.links SET notes_count = notes_count + 1 WHERE id = lid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION decrement_notes_count(lid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.links SET notes_count = GREATEST(0, notes_count - 1) WHERE id = lid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

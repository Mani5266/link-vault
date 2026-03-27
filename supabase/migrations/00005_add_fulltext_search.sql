-- ============================================================
-- Migration: Add full-text search (tsvector) to links table
-- Replaces ILIKE pattern matching with PostgreSQL full-text search
-- for better performance, relevance ranking, and word stemming.
-- ============================================================

-- 1. Add the tsvector column (stored/materialized for performance)
ALTER TABLE links ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Create a function that builds the tsvector from multiple fields.
--    - title gets weight A (highest relevance)
--    - description gets weight B
--    - domain gets weight C
--    - tags are joined into a space-separated string and get weight C
CREATE OR REPLACE FUNCTION links_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.domain, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to auto-update search_vector on INSERT or UPDATE
--    Only fires when searchable fields change.
DROP TRIGGER IF EXISTS links_search_vector_trigger ON links;
CREATE TRIGGER links_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description, domain, tags
  ON links
  FOR EACH ROW
  EXECUTE FUNCTION links_search_vector_update();

-- 4. Create GIN index for fast full-text queries
CREATE INDEX IF NOT EXISTS idx_links_search_vector
  ON links USING GIN(search_vector);

-- 5. Backfill existing rows (touch each row to fire the trigger)
UPDATE links SET
  search_vector =
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(domain, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'C')
WHERE search_vector IS NULL;

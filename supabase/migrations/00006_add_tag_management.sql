-- ============================================================
-- Migration 00006: Tag management functions
-- PostgreSQL functions for querying and manipulating tags
-- stored as TEXT[] arrays on the links table.
-- ============================================================

-- ============================================================
-- get_user_tags: Get all unique tags with counts for a user
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_tags(p_user_id UUID)
RETURNS TABLE(tag_name TEXT, tag_count BIGINT)
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT
    unnest(tags) AS tag_name,
    COUNT(*)     AS tag_count
  FROM links
  WHERE user_id = p_user_id
    AND array_length(tags, 1) > 0
  GROUP BY tag_name
  ORDER BY tag_count DESC, tag_name ASC;
$$;

-- ============================================================
-- rename_user_tag: Rename a tag across all of a user's links
-- Returns the number of links updated.
-- If a link already has the new tag, the old one is removed
-- to avoid duplicates within the array.
-- ============================================================
CREATE OR REPLACE FUNCTION rename_user_tag(
  p_user_id UUID,
  p_old_tag TEXT,
  p_new_tag TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected INTEGER;
BEGIN
  -- Update links that have the old tag
  WITH updated AS (
    UPDATE links
    SET
      tags = (
        -- Remove old tag, add new tag if not already present
        SELECT ARRAY(
          SELECT DISTINCT tag
          FROM (
            -- All existing tags except the old one
            SELECT unnest(
              array_remove(tags, p_old_tag)
            ) AS tag
            UNION
            -- Plus the new tag
            SELECT p_new_tag
          ) sub
        )
      ),
      updated_at = NOW()
    WHERE user_id = p_user_id
      AND p_old_tag = ANY(tags)
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO affected FROM updated;

  RETURN affected;
END;
$$;

-- ============================================================
-- delete_user_tag: Remove a tag from all of a user's links
-- Returns the number of links updated.
-- ============================================================
CREATE OR REPLACE FUNCTION delete_user_tag(
  p_user_id UUID,
  p_tag TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected INTEGER;
BEGIN
  WITH updated AS (
    UPDATE links
    SET
      tags = array_remove(tags, p_tag),
      updated_at = NOW()
    WHERE user_id = p_user_id
      AND p_tag = ANY(tags)
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO affected FROM updated;

  RETURN affected;
END;
$$;

-- ============================================================
-- merge_user_tags: Merge multiple source tags into one target
-- Removes all source tags and adds the target tag.
-- Returns the number of links updated.
-- ============================================================
CREATE OR REPLACE FUNCTION merge_user_tags(
  p_user_id UUID,
  p_source_tags TEXT[],
  p_target_tag TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected INTEGER;
BEGIN
  WITH updated AS (
    UPDATE links
    SET
      tags = (
        SELECT ARRAY(
          SELECT DISTINCT tag
          FROM (
            -- Keep existing tags that are NOT source tags
            SELECT unnest(tags) AS tag
            EXCEPT
            SELECT unnest(p_source_tags)
            -- Plus the target tag
            UNION
            SELECT p_target_tag
          ) sub
        )
      ),
      updated_at = NOW()
    WHERE user_id = p_user_id
      AND tags && p_source_tags  -- array overlap operator
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO affected FROM updated;

  RETURN affected;
END;
$$;

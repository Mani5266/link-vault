-- ============================================================
-- Migration 00009: Add collection nesting (2-level max)
-- Adds parent_id column to collections table for sub-collections
-- ============================================================

-- Add parent_id column (nullable — NULL means top-level collection)
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES collections(id) ON DELETE CASCADE;

-- Index for fast lookups of children by parent
CREATE INDEX IF NOT EXISTS idx_collections_parent_id ON collections(parent_id);

-- Add a CHECK constraint to enforce max 2 levels:
-- A collection with a parent_id cannot itself be a parent.
-- This is enforced application-side as well, but this is a safety net.
-- Note: We use a trigger instead of a CHECK constraint because 
-- CHECK constraints cannot reference other rows.

CREATE OR REPLACE FUNCTION enforce_max_nesting_depth()
RETURNS TRIGGER AS $$
BEGIN
  -- If this collection has a parent, verify the parent is top-level (has no parent itself)
  IF NEW.parent_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM collections WHERE id = NEW.parent_id AND parent_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Sub-collections cannot have their own sub-collections (max 2 levels)';
    END IF;
  END IF;

  -- If this collection is being moved to top-level, that's always fine
  -- If this collection already has children, it cannot be made a sub-collection
  IF NEW.parent_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM collections WHERE parent_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Cannot make a parent collection into a sub-collection (it has children)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS trg_enforce_max_nesting ON collections;

-- Create trigger on INSERT and UPDATE
CREATE TRIGGER trg_enforce_max_nesting
  BEFORE INSERT OR UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_nesting_depth();

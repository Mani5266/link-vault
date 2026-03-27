-- ============================================================
-- Migration 00008: Smart Collections
-- Rule-based auto-populated collections
-- ============================================================

CREATE TABLE IF NOT EXISTS smart_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '',
  rules JSONB NOT NULL DEFAULT '[]',
  match_mode TEXT NOT NULL DEFAULT 'all' CHECK (match_mode IN ('all', 'any')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_smart_collections_user
  ON smart_collections(user_id, created_at DESC);

-- RLS
ALTER TABLE smart_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own smart collections"
  ON smart_collections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Migration: Additional RLS policies and service role access
-- ============================================================

-- Allow the service role (backend API) to manage data on behalf of users.
-- The service role key bypasses RLS by default in Supabase,
-- so these policies are mainly for the anon/authenticated key.

-- Ensure RLS is enabled on all tables (idempotent)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Additional helper functions
-- ============================================================

-- Function to get link count per collection for a user
CREATE OR REPLACE FUNCTION get_collection_link_counts(p_user_id UUID)
RETURNS TABLE(collection_id UUID, link_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT l.collection_id, COUNT(l.id) as link_count
  FROM links l
  WHERE l.user_id = p_user_id
  GROUP BY l.collection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

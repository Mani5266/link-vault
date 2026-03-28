// ============================================================
// Collection Types — Folders/categories for organizing links
// ============================================================

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  emoji: string;
  color: string;
  is_default: boolean;
  position: number;
  parent_id: string | null;
  created_at: string;
  link_count?: number;
}

export interface CollectionInput {
  name: string;
  emoji?: string;
  color?: string;
  parent_id?: string | null;
}

export interface CollectionUpdate {
  name?: string;
  emoji?: string;
  color?: string;
  position?: number;
  parent_id?: string | null;
}

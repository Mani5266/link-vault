// ============================================================
// Link Types — Core data model for saved links
// ============================================================

export type ProcessingStatus = "pending" | "processing" | "complete" | "failed";

export interface Link {
  id: string;
  user_id: string;
  collection_id: string | null;
  url: string;
  title: string | null;
  description: string | null;
  tags: string[];
  category: LinkCategory | null;
  emoji: string | null;
  domain: string | null;
  favicon_url: string | null;
  is_pinned: boolean;
  ai_processed: boolean;
  processing_status: ProcessingStatus | null;
  reading_status: ReadingStatus | null;
  read_at: string | null;
  notes_count: number;
  created_at: string;
  updated_at: string;
}

export interface LinkInput {
  url: string;
  collection_id?: string | null;
}

export interface LinkUpdate {
  title?: string;
  description?: string;
  tags?: string[];
  category?: LinkCategory;
  emoji?: string;
  collection_id?: string | null;
  is_pinned?: boolean;
  reading_status?: ReadingStatus | null;
  read_at?: string | null;
}

export interface LinkWithCollection extends Link {
  collection?: {
    id: string;
    name: string;
    emoji: string;
    slug: string;
  } | null;
}

export type ReadingStatus = "unread" | "read";

export type LinkCategory =
  | "video"
  | "article"
  | "recipe"
  | "product"
  | "tutorial"
  | "social"
  | "tool"
  | "news"
  | "music"
  | "podcast"
  | "other";

export type LinkSortField = "created_at" | "title" | "domain" | "category";
export type SortDirection = "asc" | "desc";

export interface LinkFilters {
  collection_id?: string | null;
  category?: LinkCategory;
  search?: string;
  is_pinned?: boolean;
  reading_status?: ReadingStatus | null;
  sort_by?: LinkSortField;
  sort_dir?: SortDirection;
  page?: number;
  limit?: number;
}

// ============================================================
// Bookmark Import Types
// ============================================================

export interface BookmarkImportItem {
  url: string;
  title?: string;
  /** Original bookmark date (Unix timestamp in seconds) */
  add_date?: number;
}

export interface BookmarkImportResult {
  imported: number;
  duplicates: number;
  errors: number;
}

// ============================================================
// Bookmark Export Types
// ============================================================

export type ExportFormat = "json" | "csv" | "html" | "markdown";

/** Shape returned by the export endpoint — link data enriched with collection name */
export interface ExportableLink {
  url: string;
  title: string | null;
  description: string | null;
  tags: string[];
  category: LinkCategory | null;
  domain: string | null;
  is_pinned: boolean;
  collection_name: string | null;
  created_at: string;
}

// ============================================================
// Tag Management Types
// ============================================================

/** A tag with usage count across all of a user's links */
export interface TagWithCount {
  name: string;
  count: number;
}

/** Input for renaming a tag across all links */
export interface TagRenameInput {
  old_name: string;
  new_name: string;
}

/** Input for merging multiple tags into one */
export interface TagMergeInput {
  source_tags: string[];
  target_tag: string;
}

// ============================================================
// Duplicate Detection Types
// ============================================================

/** A group of links detected as near-duplicates */
export interface DuplicateGroup {
  /** The canonical key used to group these links */
  canonical_url: string;
  /** All links in this duplicate group */
  links: Link[];
}

/** Input for merging a duplicate group — keep one, delete the rest */
export interface DuplicateMergeInput {
  /** The link ID to keep as the winner */
  keep_id: string;
  /** The link IDs to delete (losers) */
  delete_ids: string[];
}

// ============================================================
// Link Health Check Types
// ============================================================

export type LinkHealthStatus = "healthy" | "redirect" | "broken" | "timeout" | "error";

/** Result of checking a single link's health */
export interface LinkHealthResult {
  link_id: string;
  url: string;
  title: string | null;
  domain: string | null;
  favicon_url: string | null;
  status: LinkHealthStatus;
  http_code: number | null;
  error: string | null;
  response_time_ms: number;
}

// ============================================================
// Smart Collection Types
// ============================================================

/** A rule-based filter condition for smart collections */
export interface SmartCollectionRule {
  field: "category" | "domain" | "tag" | "is_pinned" | "reading_status";
  operator: "equals" | "contains" | "not_equals";
  value: string;
}

/** A smart collection auto-populated by filter rules */
export interface SmartCollection {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  rules: SmartCollectionRule[];
  /** "all" = every rule must match, "any" = at least one must match */
  match_mode: "all" | "any";
  created_at: string;
  updated_at: string;
  /** Populated at query time, not stored */
  link_count?: number;
}

export interface SmartCollectionInput {
  name: string;
  emoji?: string;
  rules: SmartCollectionRule[];
  match_mode?: "all" | "any";
}

export interface SmartCollectionUpdate {
  name?: string;
  emoji?: string;
  rules?: SmartCollectionRule[];
  match_mode?: "all" | "any";
}

// ============================================================
// Link Notes Types
// ============================================================

export interface LinkNote {
  id: string;
  link_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface LinkNoteInput {
  content: string;
}

// ============================================================
// RSS Feed Types
// ============================================================

export interface RssFeed {
  id: string;
  user_id: string;
  feed_url: string;
  title: string | null;
  description: string | null;
  site_url: string | null;
  collection_id: string | null;
  is_active: boolean;
  check_interval_minutes: number;
  last_checked_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface RssFeedInput {
  feed_url: string;
  collection_id?: string | null;
}

export interface RssFeedItem {
  id: string;
  feed_id: string;
  user_id: string;
  guid: string;
  url: string;
  title: string | null;
  description: string | null;
  published_at: string | null;
  link_id: string | null;
  is_saved: boolean;
  created_at: string;
}

// ============================================================
// Knowledge Graph Types
// ============================================================

export interface GraphNode {
  id: string;
  label: string;
  type: "link" | "tag" | "category" | "domain";
  size?: number;
  color?: string;
  url?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

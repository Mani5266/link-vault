// ============================================================
// AI Types — Request/Response shapes for Gemini AI summarization
// ============================================================

export interface AISummaryRequest {
  url: string;
  collection_name?: string;
}

export interface AISummaryResponse {
  title: string;
  description: string;
  tags: string[];
  category: string;
  emoji: string;
}

export interface AITagSuggestionRequest {
  url: string;
  title?: string;
  description?: string;
  existing_tags?: string[];
}

export interface AITagSuggestionResponse {
  suggestions: string[];
}

export interface AISemanticSearchRequest {
  query: string;
}

export interface AISemanticSearchResult {
  /** Keywords extracted from the natural language query for text search */
  keywords: string;
  /** Optional category filter inferred from the query */
  category?: string;
  /** Optional tag filter inferred from the query */
  tag?: string;
  /** Optional reading status filter */
  reading_status?: string;
  /** Optional pinned filter */
  is_pinned?: boolean;
  /** Human-readable interpretation of what the AI understood */
  interpretation: string;
}

export interface AIDigestRequest {
  /** Number of days to look back (default 7) */
  days?: number;
}

export interface AIDigestResponse {
  /** The digest summary text */
  summary: string;
  /** Highlighted/top links from the period */
  highlights: Array<{
    title: string;
    url: string;
    reason: string;
  }>;
  /** Themes or topics detected across saved links */
  themes: string[];
  /** Quick stats */
  stats: {
    total_links: number;
    categories: Record<string, number>;
    period_start: string;
    period_end: string;
  };
}

export interface AIProcessingState {
  status: "idle" | "processing" | "success" | "error" | "fallback";
  error?: string;
}

// ============================================================
// Digest History Types
// ============================================================

export interface DigestRecord {
  id: string;
  user_id: string;
  summary: string;
  highlights: Array<{ title: string; url: string; reason: string }>;
  themes: string[];
  stats: {
    total_links: number;
    categories: Record<string, number>;
    period_start: string;
    period_end: string;
  };
  period_days: number;
  period_start: string;
  period_end: string;
  created_at: string;
}

// ============================================================
// Content Decay Types
// ============================================================

export interface ContentDecayScore {
  link_id: string;
  user_id: string;
  decay_score: number;
  age_days: number;
  decay_rate: string;
  scanned_at: string;
  /** Joined from links table for display */
  link?: {
    title: string | null;
    url: string;
    domain: string | null;
    category: string | null;
    created_at: string;
    reading_status: string | null;
  };
}

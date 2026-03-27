// ============================================================
// Application Limits — Rate limits, validation bounds
// ============================================================

export const LIMITS = {
  /** Maximum tags per link */
  MAX_TAGS_PER_LINK: 5,

  /** Maximum title length */
  MAX_TITLE_LENGTH: 200,

  /** Maximum description length */
  MAX_DESCRIPTION_LENGTH: 500,

  /** Maximum tag length */
  MAX_TAG_LENGTH: 30,

  /** Maximum URL length */
  MAX_URL_LENGTH: 2048,

  /** Maximum collection name length */
  MAX_COLLECTION_NAME_LENGTH: 50,

  /** Maximum custom collections per user */
  MAX_CUSTOM_COLLECTIONS: 20,

  /** Default page size for paginated results */
  DEFAULT_PAGE_SIZE: 20,

  /** Maximum page size */
  MAX_PAGE_SIZE: 100,

  /** AI rate limit: max requests per window */
  AI_RATE_LIMIT_MAX: 10,

  /** AI rate limit: window in milliseconds (1 minute) */
  AI_RATE_LIMIT_WINDOW_MS: 60_000,

  /** AI request timeout in milliseconds */
  AI_TIMEOUT_MS: 15_000,

  /** Maximum bookmarks per import */
  MAX_IMPORT_BOOKMARKS: 500,

  /** Maximum import HTML file size in bytes (5 MB) */
  MAX_IMPORT_FILE_SIZE: 5 * 1024 * 1024,

  /** Import rate limit: max imports per window */
  IMPORT_RATE_LIMIT_MAX: 5,

  /** Import rate limit: window in milliseconds (1 hour) */
  IMPORT_RATE_LIMIT_WINDOW_MS: 3_600_000,
} as const;

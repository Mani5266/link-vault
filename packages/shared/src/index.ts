// ============================================================
// @linkvault/shared — Barrel Export
// ============================================================

// Types
export type {
  Link,
  LinkInput,
  LinkUpdate,
  LinkWithCollection,
  LinkCategory,
  LinkSortField,
  SortDirection,
  LinkFilters,
  ReadingStatus,
  BookmarkImportItem,
  BookmarkImportResult,
  ExportFormat,
  ExportableLink,
  TagWithCount,
  TagRenameInput,
  TagMergeInput,
  DuplicateGroup,
  DuplicateMergeInput,
  LinkHealthStatus,
  LinkHealthResult,
  SmartCollectionRule,
  SmartCollection,
  SmartCollectionInput,
  SmartCollectionUpdate,
} from "./types/link.types";

export type {
  Collection,
  CollectionInput,
  CollectionUpdate,
} from "./types/collection.types";

export type {
  AISummaryRequest,
  AISummaryResponse,
  AIProcessingState,
  AITagSuggestionRequest,
  AITagSuggestionResponse,
  AISemanticSearchRequest,
  AISemanticSearchResult,
  AIDigestRequest,
  AIDigestResponse,
} from "./types/ai.types";

export type { UserProfile, AuthState } from "./types/user.types";

export type {
  ApiResponse,
  ApiErrorResponse,
  PaginatedResponse,
} from "./types/api.types";

// Constants
export { LINK_CATEGORIES } from "./constants/categories";
export type { CategoryValue } from "./constants/categories";
export { DEFAULT_COLLECTIONS } from "./constants/collections";
export type { DefaultCollection } from "./constants/collections";
export { LIMITS } from "./constants/limits";

// Validators
export {
  isValidUrl,
  extractDomain,
  getFaviconUrl,
  normalizeUrl,
  isSocialMediaUrl,
} from "./validators/url";

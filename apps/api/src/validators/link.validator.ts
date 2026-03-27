import { z } from "zod";
import { LIMITS } from "@linkvault/shared";

export const createLinkSchema = z.object({
  url: z
    .string()
    .url("Must be a valid URL")
    .max(LIMITS.MAX_URL_LENGTH, `URL must be under ${LIMITS.MAX_URL_LENGTH} characters`),
  collection_id: z.string().uuid().nullable().optional(),
});

export const updateLinkSchema = z.object({
  title: z
    .string()
    .max(LIMITS.MAX_TITLE_LENGTH)
    .optional(),
  description: z
    .string()
    .max(LIMITS.MAX_DESCRIPTION_LENGTH)
    .optional(),
  tags: z
    .array(z.string().max(LIMITS.MAX_TAG_LENGTH))
    .max(LIMITS.MAX_TAGS_PER_LINK)
    .optional(),
  category: z.string().optional(),
  emoji: z.string().optional(),
  collection_id: z.string().uuid().nullable().optional(),
  is_pinned: z.boolean().optional(),
  reading_status: z.enum(["unread", "read"]).nullable().optional(),
  read_at: z.string().nullable().optional(),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

export const bulkMoveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
  collection_id: z.string().uuid().nullable(),
});

export const linkQuerySchema = z.object({
  collection_id: z.string().uuid().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  is_pinned: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  reading_status: z.enum(["unread", "read"]).optional(),
  sort_by: z.enum(["created_at", "title", "domain", "category"]).optional(),
  sort_dir: z.enum(["asc", "desc"]).optional(),
  page: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .optional(),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive().max(LIMITS.MAX_PAGE_SIZE))
    .optional(),
});

export const importBookmarksSchema = z.object({
  html: z
    .string()
    .min(1, "Bookmark file content is required")
    .max(LIMITS.MAX_IMPORT_FILE_SIZE, `File exceeds maximum size of ${Math.round(LIMITS.MAX_IMPORT_FILE_SIZE / 1024 / 1024)} MB`),
  collection_id: z.string().uuid().nullable().optional(),
});

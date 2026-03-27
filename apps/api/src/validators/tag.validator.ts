import { z } from "zod";
import { LIMITS } from "@linkvault/shared";

export const renameTagSchema = z.object({
  old_name: z
    .string()
    .trim()
    .min(1, "Old tag name is required")
    .max(LIMITS.MAX_TAG_LENGTH),
  new_name: z
    .string()
    .trim()
    .min(1, "New tag name is required")
    .max(LIMITS.MAX_TAG_LENGTH),
});

export const deleteTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tag name is required")
    .max(LIMITS.MAX_TAG_LENGTH),
});

export const mergeTagsSchema = z.object({
  source_tags: z
    .array(z.string().trim().min(1).max(LIMITS.MAX_TAG_LENGTH))
    .min(1, "At least one source tag is required")
    .max(20, "Cannot merge more than 20 tags at once"),
  target_tag: z
    .string()
    .trim()
    .min(1, "Target tag name is required")
    .max(LIMITS.MAX_TAG_LENGTH),
});

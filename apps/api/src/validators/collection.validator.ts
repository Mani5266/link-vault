import { z } from "zod";
import { LIMITS } from "@linkvault/shared";

export const createCollectionSchema = z.object({
  name: z
    .string()
    .min(1, "Collection name is required")
    .max(LIMITS.MAX_COLLECTION_NAME_LENGTH),
  emoji: z.string().optional().default("📁"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color")
    .optional()
    .default("#6366f1"),
  parent_id: z.string().uuid("Must be a valid collection ID").nullable().optional(),
});

export const updateCollectionSchema = z.object({
  name: z.string().max(LIMITS.MAX_COLLECTION_NAME_LENGTH).optional(),
  emoji: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  position: z.number().int().min(0).optional(),
  parent_id: z.string().uuid("Must be a valid collection ID").nullable().optional(),
});

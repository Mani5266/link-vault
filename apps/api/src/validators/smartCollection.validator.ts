import { z } from "zod";

const ruleSchema = z.object({
  field: z.enum(["category", "domain", "tag", "is_pinned", "reading_status"]),
  operator: z.enum(["equals", "contains", "not_equals"]),
  value: z.string().min(1).max(200),
});

export const createSmartCollectionSchema = z.object({
  name: z.string().min(1).max(60),
  emoji: z.string().max(10).optional(),
  rules: z.array(ruleSchema).min(1).max(10),
  match_mode: z.enum(["all", "any"]).optional(),
});

export const updateSmartCollectionSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  emoji: z.string().max(10).optional(),
  rules: z.array(ruleSchema).min(1).max(10).optional(),
  match_mode: z.enum(["all", "any"]).optional(),
});

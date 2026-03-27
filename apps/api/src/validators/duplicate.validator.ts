import { z } from "zod";

export const mergeDuplicatesSchema = z.object({
  keep_id: z.string().uuid("keep_id must be a valid UUID"),
  delete_ids: z
    .array(z.string().uuid("Each delete_id must be a valid UUID"))
    .min(1, "At least one duplicate link ID is required")
    .max(50, "Cannot merge more than 50 duplicates at once"),
});

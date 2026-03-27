import { supabaseAdmin } from "../config/supabase";
import { logger } from "../utils/logger";
import type { TagWithCount } from "@linkvault/shared";
import { LIMITS } from "@linkvault/shared";

// ============================================================
// TagService — Manages tags across user's links
// Tags are stored as TEXT[] on the links table. Operations use
// PostgreSQL array functions to query and manipulate them.
// ============================================================

export class TagService {
  /**
   * Get all unique tags for a user with usage counts.
   * Uses unnest() to flatten the TEXT[] arrays, then GROUP BY.
   */
  static async getUserTags(userId: string): Promise<TagWithCount[]> {
    const { data, error } = await supabaseAdmin.rpc("get_user_tags", {
      p_user_id: userId,
    });

    if (error) {
      logger.error({ error }, "Failed to fetch user tags");
      throw new Error("Failed to fetch tags");
    }

    return (data || []).map((row: { tag_name: string; tag_count: number }) => ({
      name: row.tag_name,
      count: row.tag_count,
    }));
  }

  /**
   * Rename a tag across all of a user's links.
   * Replaces old_name with new_name in every links.tags array.
   * If a link already has new_name, the old_name is simply removed
   * to avoid duplicates within the array.
   */
  static async renameTag(
    userId: string,
    oldName: string,
    newName: string
  ): Promise<number> {
    // Validate
    if (!oldName.trim() || !newName.trim()) {
      throw Object.assign(new Error("Tag names cannot be empty"), {
        statusCode: 400,
      });
    }
    if (oldName.trim().toLowerCase() === newName.trim().toLowerCase()) {
      throw Object.assign(new Error("New tag name must be different"), {
        statusCode: 400,
      });
    }
    if (newName.trim().length > LIMITS.MAX_TAG_LENGTH) {
      throw Object.assign(
        new Error(`Tag name must be under ${LIMITS.MAX_TAG_LENGTH} characters`),
        { statusCode: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc("rename_user_tag", {
      p_user_id: userId,
      p_old_tag: oldName.trim(),
      p_new_tag: newName.trim(),
    });

    if (error) {
      logger.error({ error }, "Failed to rename tag");
      throw new Error("Failed to rename tag");
    }

    return data || 0;
  }

  /**
   * Delete a tag from all of a user's links.
   * Removes the tag from every links.tags array where it appears.
   */
  static async deleteTag(userId: string, tagName: string): Promise<number> {
    if (!tagName.trim()) {
      throw Object.assign(new Error("Tag name cannot be empty"), {
        statusCode: 400,
      });
    }

    const { data, error } = await supabaseAdmin.rpc("delete_user_tag", {
      p_user_id: userId,
      p_tag: tagName.trim(),
    });

    if (error) {
      logger.error({ error }, "Failed to delete tag");
      throw new Error("Failed to delete tag");
    }

    return data || 0;
  }

  /**
   * Merge multiple source tags into a single target tag.
   * For each link that has any of the source tags:
   *  - Remove all source tags
   *  - Add the target tag (if not already present)
   *  - Respect MAX_TAGS_PER_LINK limit
   */
  static async mergeTags(
    userId: string,
    sourceTags: string[],
    targetTag: string
  ): Promise<number> {
    if (sourceTags.length === 0) {
      throw Object.assign(new Error("At least one source tag is required"), {
        statusCode: 400,
      });
    }
    if (!targetTag.trim()) {
      throw Object.assign(new Error("Target tag name cannot be empty"), {
        statusCode: 400,
      });
    }
    if (targetTag.trim().length > LIMITS.MAX_TAG_LENGTH) {
      throw Object.assign(
        new Error(`Tag name must be under ${LIMITS.MAX_TAG_LENGTH} characters`),
        { statusCode: 400 }
      );
    }

    const trimmedSources = sourceTags.map((t) => t.trim()).filter(Boolean);

    const { data, error } = await supabaseAdmin.rpc("merge_user_tags", {
      p_user_id: userId,
      p_source_tags: trimmedSources,
      p_target_tag: targetTag.trim(),
    });

    if (error) {
      logger.error({ error }, "Failed to merge tags");
      throw new Error("Failed to merge tags");
    }

    return data || 0;
  }
}

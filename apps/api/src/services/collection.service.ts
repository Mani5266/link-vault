import { supabaseAdmin } from "../config/supabase";
import { DEFAULT_COLLECTIONS } from "@linkvault/shared";
import { logger } from "../utils/logger";
import type { Collection } from "@linkvault/shared";

export class CollectionService {
  /**
   * Get all collections for a user, including link counts.
   */
  static async getCollections(userId: string): Promise<Collection[]> {
    const { data, error } = await supabaseAdmin
      .from("collections")
      .select("*, links:links(count)")
      .eq("user_id", userId)
      .order("position", { ascending: true });

    if (error) {
      logger.error({ error }, "Failed to fetch collections");
      throw new Error("Failed to fetch collections");
    }

    // Transform the count from Supabase's format
    return (data || []).map((col: any) => ({
      ...col,
      link_count: col.links?.[0]?.count || 0,
      links: undefined,
    }));
  }

  /**
   * Create a new collection.
   */
  static async createCollection(
    userId: string,
    input: { name: string; emoji?: string; color?: string }
  ): Promise<Collection> {
    const slug = input.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Get the next position
    const { count } = await supabaseAdmin
      .from("collections")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const { data, error } = await supabaseAdmin
      .from("collections")
      .insert({
        user_id: userId,
        name: input.name,
        slug,
        emoji: input.emoji || "📁",
        color: input.color || "#6366f1",
        is_default: false,
        position: (count || 0),
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, "Failed to create collection");
      throw new Error("Failed to create collection");
    }

    return { ...data, link_count: 0 };
  }

  /**
   * Update a collection.
   */
  static async updateCollection(
    userId: string,
    collectionId: string,
    updates: Partial<Collection>
  ): Promise<Collection> {
    const { data, error } = await supabaseAdmin
      .from("collections")
      .update(updates)
      .eq("id", collectionId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      logger.error({ error }, "Failed to update collection");
      throw new Error("Failed to update collection");
    }

    return data;
  }

  /**
   * Delete a collection. Links in this collection become uncategorized.
   */
  static async deleteCollection(
    userId: string,
    collectionId: string
  ): Promise<void> {
    // First, unlink all links from this collection
    await supabaseAdmin
      .from("links")
      .update({ collection_id: null })
      .eq("collection_id", collectionId)
      .eq("user_id", userId);

    const { error } = await supabaseAdmin
      .from("collections")
      .delete()
      .eq("id", collectionId)
      .eq("user_id", userId);

    if (error) {
      logger.error({ error }, "Failed to delete collection");
      throw new Error("Failed to delete collection");
    }
  }

  /**
   * Seed default collections for a new user.
   */
  static async seedDefaults(userId: string): Promise<void> {
    const collections = DEFAULT_COLLECTIONS.map((col) => ({
      user_id: userId,
      name: col.name,
      slug: col.slug,
      emoji: col.emoji,
      color: col.color,
      is_default: true,
      position: col.position,
    }));

    const { error } = await supabaseAdmin
      .from("collections")
      .insert(collections);

    if (error) {
      logger.error({ error }, "Failed to seed default collections");
      // Non-critical — don't throw, just log
    }
  }
}

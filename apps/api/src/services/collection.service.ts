import { supabaseAdmin } from "../config/supabase";
import { DEFAULT_COLLECTIONS } from "@linkvault/shared";
import { logger } from "../utils/logger";
import type { Collection } from "@linkvault/shared";

export class CollectionService {
  /**
   * Get all collections for a user, including link counts.
   * Returns flat list — frontend builds the tree using parent_id.
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
   * Create a new collection, optionally nested under a parent.
   * parent_id must reference a top-level collection (one with parent_id = null).
   */
  static async createCollection(
    userId: string,
    input: { name: string; emoji?: string; color?: string; parent_id?: string | null }
  ): Promise<Collection> {
    const parentId = input.parent_id || null;

    // Validate parent exists and is top-level
    if (parentId) {
      const { data: parent, error: parentError } = await supabaseAdmin
        .from("collections")
        .select("id, parent_id")
        .eq("id", parentId)
        .eq("user_id", userId)
        .single();

      if (parentError || !parent) {
        throw new Error("Parent collection not found");
      }
      if (parent.parent_id !== null) {
        throw new Error("Cannot nest more than one level deep");
      }
    }

    const slug = input.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Get the next position scoped to siblings (same parent_id)
    let query = supabaseAdmin
      .from("collections")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (parentId) {
      query = query.eq("parent_id", parentId);
    } else {
      query = query.is("parent_id", null);
    }

    const { count } = await query;

    const { data, error } = await supabaseAdmin
      .from("collections")
      .insert({
        user_id: userId,
        name: input.name,
        slug,
        emoji: input.emoji || "📁",
        color: input.color || "#6366f1",
        is_default: false,
        position: count || 0,
        parent_id: parentId,
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
    // If moving to a new parent, validate the parent
    if (updates.parent_id !== undefined && updates.parent_id !== null) {
      const { data: parent, error: parentError } = await supabaseAdmin
        .from("collections")
        .select("id, parent_id")
        .eq("id", updates.parent_id)
        .eq("user_id", userId)
        .single();

      if (parentError || !parent) {
        throw new Error("Parent collection not found");
      }
      if (parent.parent_id !== null) {
        throw new Error("Cannot nest more than one level deep");
      }
    }

    // If trying to become a sub-collection, verify it has no children
    if (updates.parent_id !== undefined && updates.parent_id !== null) {
      const { count } = await supabaseAdmin
        .from("collections")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", collectionId);

      if (count && count > 0) {
        throw new Error("Cannot move a collection that has sub-collections");
      }
    }

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
   * Delete a collection. Links in this collection (and any child collections)
   * become uncategorized. Child collections are cascade-deleted by the DB.
   */
  static async deleteCollection(
    userId: string,
    collectionId: string
  ): Promise<void> {
    // Find child collection IDs so we can unlink their links too
    const { data: children } = await supabaseAdmin
      .from("collections")
      .select("id")
      .eq("parent_id", collectionId)
      .eq("user_id", userId);

    const childIds = (children || []).map((c: any) => c.id);

    // Unlink links from this collection
    await supabaseAdmin
      .from("links")
      .update({ collection_id: null })
      .eq("collection_id", collectionId)
      .eq("user_id", userId);

    // Unlink links from child collections
    if (childIds.length > 0) {
      await supabaseAdmin
        .from("links")
        .update({ collection_id: null })
        .in("collection_id", childIds)
        .eq("user_id", userId);
    }

    // Delete the collection (children cascade-deleted by DB)
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

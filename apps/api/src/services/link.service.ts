import { supabaseAdmin } from "../config/supabase";
import { normalizeUrl, extractDomain, getFaviconUrl } from "@linkvault/shared";
import { logger } from "../utils/logger";
import { escapePostgrestIlike } from "../utils/sanitize";
import type { Link, LinkFilters, BookmarkImportItem, BookmarkImportResult, ExportableLink } from "@linkvault/shared";
import { LIMITS } from "@linkvault/shared";

export class LinkService {
  /**
   * Get all links for a user with optional filtering, search, and pagination.
   */
  static async getLinks(
    userId: string,
    filters: LinkFilters = {}
  ): Promise<{ data: Link[]; total: number }> {
    const {
      collection_id,
      category,
      search,
      is_pinned,
      reading_status,
      sort_by = "created_at",
      sort_dir = "desc",
      page = 1,
      limit = LIMITS.DEFAULT_PAGE_SIZE,
    } = filters;

    let query = supabaseAdmin
      .from("links")
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    if (collection_id) {
      query = query.eq("collection_id", collection_id);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (is_pinned !== undefined) {
      query = query.eq("is_pinned", is_pinned);
    }

    if (reading_status) {
      query = query.eq("reading_status", reading_status);
    }

    if (search) {
      const trimmed = search.trim();

      if (trimmed.length >= 3) {
        // Use PostgreSQL full-text search with websearch_to_tsquery
        // for word stemming, relevance ranking, and natural language queries.
        // The search_vector column is a weighted tsvector combining
        // title (A), description (B), domain (C), and tags (C).
        query = query.textSearch("search_vector", trimmed, {
          type: "websearch",
          config: "english",
        });
      } else {
        // For very short queries (1-2 chars), fall back to ILIKE
        // since tsvector doesn't handle partial single-character matches.
        // Escape special chars to prevent PostgREST filter injection.
        const escaped = escapePostgrestIlike(trimmed);
        query = query.or(
          `title.ilike.%${escaped}%,description.ilike.%${escaped}%,domain.ilike.%${escaped}%`
        );
      }
    }

    // Sort pinned items first, then by the selected field
    query = query
      .order("is_pinned", { ascending: false })
      .order(sort_by, { ascending: sort_dir === "asc" });

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      logger.error({ error }, "Failed to fetch links");
      throw new Error("Failed to fetch links");
    }

    return { data: data || [], total: count || 0 };
  }

  /**
   * Get a single link by ID.
   */
  static async getLinkById(
    userId: string,
    linkId: string
  ): Promise<Link | null> {
    const { data, error } = await supabaseAdmin
      .from("links")
      .select("*")
      .eq("id", linkId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      logger.error({ error }, "Failed to fetch link");
      throw new Error("Failed to fetch link");
    }

    return data;
  }

  /**
   * Create a new link.
   * Stores the URL with only the hostname lowercased so case-sensitive
   * paths/params remain intact for opening.
   * Uses case-insensitive comparison for duplicate checking.
   * If a duplicate exists with a corrupted (fully-lowercased) URL,
   * automatically repairs it with the correct casing.
   */
  static async createLink(
    userId: string,
    url: string,
    collectionId?: string | null
  ): Promise<Link> {
    const normalizedUrl = normalizeUrl(url);
    const domain = extractDomain(url);
    const faviconUrl = domain ? getFaviconUrl(domain) : null;

    // Check for duplicates using case-insensitive comparison
    const { data: existing } = await supabaseAdmin
      .from("links")
      .select("*")
      .eq("user_id", userId)
      .ilike("url", normalizedUrl)
      .single();

    if (existing) {
      // If the stored URL differs in casing, repair it silently
      if (existing.url !== normalizedUrl) {
        const { data: repaired } = await supabaseAdmin
          .from("links")
          .update({ url: normalizedUrl, updated_at: new Date().toISOString() })
          .eq("id", existing.id)
          .eq("user_id", userId)
          .select()
          .single();

        if (repaired) return repaired;
      }

      const error: any = new Error("This link has already been saved");
      error.statusCode = 409;
      throw error;
    }

    const { data, error } = await supabaseAdmin
      .from("links")
      .insert({
        user_id: userId,
        url: normalizedUrl,
        collection_id: collectionId || null,
        domain,
        favicon_url: faviconUrl,
        is_pinned: false,
        ai_processed: false,
        tags: [],
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, "Failed to create link");
      throw new Error("Failed to create link");
    }

    return data;
  }

  /**
   * Update a link.
   */
  static async updateLink(
    userId: string,
    linkId: string,
    updates: Partial<Link>
  ): Promise<Link> {
    const { data, error } = await supabaseAdmin
      .from("links")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", linkId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      logger.error({ error }, "Failed to update link");
      throw new Error("Failed to update link");
    }

    return data;
  }

  /**
   * Delete a link.
   */
  static async deleteLink(userId: string, linkId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("links")
      .delete()
      .eq("id", linkId)
      .eq("user_id", userId);

    if (error) {
      logger.error({ error }, "Failed to delete link");
      throw new Error("Failed to delete link");
    }
  }

  /**
   * Bulk delete links.
   */
  static async bulkDelete(userId: string, ids: string[]): Promise<void> {
    const { error } = await supabaseAdmin
      .from("links")
      .delete()
      .eq("user_id", userId)
      .in("id", ids);

    if (error) {
      logger.error({ error }, "Failed to bulk delete links");
      throw new Error("Failed to bulk delete links");
    }
  }

  /**
   * Bulk move links to a different collection.
   */
  static async bulkMove(
    userId: string,
    ids: string[],
    collectionId: string | null
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from("links")
      .update({
        collection_id: collectionId,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .in("id", ids);

    if (error) {
      logger.error({ error }, "Failed to bulk move links");
      throw new Error("Failed to bulk move links");
    }
  }

  /**
   * Get all links for a user in a flat, exportable format.
   * Joins collection names so exports include folder info.
   * No pagination — returns everything for export.
   */
  static async getExportableLinks(userId: string): Promise<ExportableLink[]> {
    // Supabase PostgREST supports foreign-key joins via `collection:collections(name)`
    const { data, error } = await supabaseAdmin
      .from("links")
      .select("url, title, description, tags, category, domain, is_pinned, created_at, collection:collections(name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ error }, "Failed to fetch links for export");
      throw new Error("Failed to fetch links for export");
    }

    return (data || []).map((row: any) => ({
      url: row.url,
      title: row.title,
      description: row.description,
      tags: row.tags || [],
      category: row.category,
      domain: row.domain,
      is_pinned: row.is_pinned,
      collection_name: row.collection?.name || null,
      created_at: row.created_at,
    }));
  }

  /**
   * Bulk-create links from imported bookmarks.
   * Skips duplicates (case-insensitive URL match against existing user links).
   * Inserts in batches to avoid hitting Supabase/Postgres limits.
   */
  static async bulkCreate(
    userId: string,
    items: BookmarkImportItem[],
    collectionId?: string | null
  ): Promise<BookmarkImportResult> {
    const result: BookmarkImportResult = {
      imported: 0,
      duplicates: 0,
      errors: 0,
    };

    if (items.length === 0) return result;

    // 1. Fetch ALL existing URLs for this user (lowercase for comparison)
    //    We only need the url column to check for duplicates.
    const { data: existingLinks, error: fetchError } = await supabaseAdmin
      .from("links")
      .select("url")
      .eq("user_id", userId);

    if (fetchError) {
      logger.error({ error: fetchError }, "Failed to fetch existing links for import");
      throw new Error("Failed to check existing links");
    }

    const existingUrls = new Set(
      (existingLinks || []).map((l) => l.url.toLowerCase())
    );

    // 2. Filter out duplicates and prepare rows
    const rows: Array<{
      user_id: string;
      url: string;
      title: string | null;
      collection_id: string | null;
      domain: string | null;
      favicon_url: string | null;
      is_pinned: boolean;
      ai_processed: boolean;
      tags: string[];
      created_at?: string;
    }> = [];

    for (const item of items) {
      let normalizedUrl: string;
      try {
        normalizedUrl = normalizeUrl(item.url);
      } catch {
        result.errors++;
        continue;
      }

      // Check against existing URLs (case-insensitive)
      if (existingUrls.has(normalizedUrl.toLowerCase())) {
        result.duplicates++;
        continue;
      }

      // Mark as seen to avoid duplicates within the import batch
      existingUrls.add(normalizedUrl.toLowerCase());

      const domain = extractDomain(normalizedUrl);
      const faviconUrl = domain ? getFaviconUrl(domain) : null;

      const row: (typeof rows)[number] = {
        user_id: userId,
        url: normalizedUrl,
        title: item.title || null,
        collection_id: collectionId || null,
        domain,
        favicon_url: faviconUrl,
        is_pinned: false,
        ai_processed: false,
        tags: [],
      };

      // Preserve original bookmark date if available
      if (item.add_date && item.add_date > 0) {
        row.created_at = new Date(item.add_date * 1000).toISOString();
      }

      rows.push(row);
    }

    if (rows.length === 0) return result;

    // 3. Insert in batches of 100 to avoid payload limits
    const BATCH_SIZE = 100;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      const { error: insertError, data: insertedData } = await supabaseAdmin
        .from("links")
        .insert(batch)
        .select("id");

      if (insertError) {
        logger.error(
          { error: insertError, batchIndex: i, batchSize: batch.length },
          "Failed to insert bookmark batch"
        );
        result.errors += batch.length;
      } else {
        result.imported += insertedData?.length || batch.length;
      }
    }

    return result;
  }
}

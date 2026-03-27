import { supabaseAdmin } from "../config/supabase";
import { logger } from "../utils/logger";

// ============================================================
// Analytics Service — Computes usage statistics for a user
// ============================================================

export interface AnalyticsData {
  total_links: number;
  total_pinned: number;
  total_unread: number;
  categories: Record<string, number>;
  top_domains: Array<{ domain: string; count: number }>;
  top_tags: Array<{ tag: string; count: number }>;
  activity: Array<{ date: string; count: number }>;
  collections: Array<{ name: string; count: number }>;
}

export class AnalyticsService {
  /**
   * Get comprehensive analytics for a user's link collection.
   */
  static async getAnalytics(userId: string): Promise<AnalyticsData> {
    // Fetch all links for the user (only fields we need)
    const { data: links, error } = await supabaseAdmin
      .from("links")
      .select("category, domain, tags, is_pinned, reading_status, created_at, collection_id")
      .eq("user_id", userId);

    if (error) {
      logger.error({ error }, "Failed to fetch links for analytics");
      throw new Error("Failed to fetch analytics data");
    }

    if (!links || links.length === 0) {
      return {
        total_links: 0,
        total_pinned: 0,
        total_unread: 0,
        categories: {},
        top_domains: [],
        top_tags: [],
        activity: [],
        collections: [],
      };
    }

    // Basic counts
    const total_links = links.length;
    const total_pinned = links.filter((l) => l.is_pinned).length;
    const total_unread = links.filter((l) => l.reading_status === "unread").length;

    // Categories
    const categories: Record<string, number> = {};
    for (const link of links) {
      const cat = link.category || "other";
      categories[cat] = (categories[cat] || 0) + 1;
    }

    // Top domains
    const domainMap: Record<string, number> = {};
    for (const link of links) {
      if (link.domain) {
        domainMap[link.domain] = (domainMap[link.domain] || 0) + 1;
      }
    }
    const top_domains = Object.entries(domainMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));

    // Top tags
    const tagMap: Record<string, number> = {};
    for (const link of links) {
      if (link.tags && Array.isArray(link.tags)) {
        for (const tag of link.tags) {
          tagMap[tag] = (tagMap[tag] || 0) + 1;
        }
      }
    }
    const top_tags = Object.entries(tagMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag, count]) => ({ tag, count }));

    // Activity — links saved per day (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const dayMap: Record<string, number> = {};
    for (let d = 0; d < 30; d++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(thirtyDaysAgo.getDate() + d);
      dayMap[date.toISOString().slice(0, 10)] = 0;
    }

    for (const link of links) {
      const day = link.created_at.slice(0, 10);
      if (dayMap[day] !== undefined) {
        dayMap[day]++;
      }
    }

    const activity = Object.entries(dayMap).map(([date, count]) => ({
      date,
      count,
    }));

    // Collections
    const collectionIds = new Set(
      links.filter((l) => l.collection_id).map((l) => l.collection_id)
    );

    let collectionsData: Array<{ name: string; count: number }> = [];
    if (collectionIds.size > 0) {
      const { data: cols } = await supabaseAdmin
        .from("collections")
        .select("id, name")
        .in("id", Array.from(collectionIds));

      if (cols) {
        const colNameMap = new Map(cols.map((c) => [c.id, c.name]));
        const colCountMap: Record<string, number> = {};
        for (const link of links) {
          if (link.collection_id) {
            const name = colNameMap.get(link.collection_id) || "Unknown";
            colCountMap[name] = (colCountMap[name] || 0) + 1;
          }
        }
        collectionsData = Object.entries(colCountMap)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count }));
      }
    }

    // Add uncategorized count
    const uncategorizedCount = links.filter((l) => !l.collection_id).length;
    if (uncategorizedCount > 0) {
      collectionsData.push({ name: "Uncategorized", count: uncategorizedCount });
    }

    return {
      total_links,
      total_pinned,
      total_unread,
      categories,
      top_domains,
      top_tags,
      activity,
      collections: collectionsData,
    };
  }
}

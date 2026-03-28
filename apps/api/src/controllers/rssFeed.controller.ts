import { Request, Response } from "express";
import { ApiResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import { supabaseAdmin } from "../config/supabase";
import { LinkService } from "../services/link.service";

export class RssFeedController {
  /**
   * GET /api/v1/rss-feeds
   */
  static async getFeeds(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      const { data, error } = await supabaseAdmin
        .from("rss_feeds")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        logger.error({ error }, "Failed to fetch feeds");
        ApiResponse.error(res, "Failed to fetch feeds");
        return;
      }

      ApiResponse.success(res, data || []);
    } catch (error: any) {
      logger.error({ error }, "Failed to get feeds");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * POST /api/v1/rss-feeds
   */
  static async addFeed(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { feed_url, collection_id } = req.body;

      if (!feed_url || typeof feed_url !== "string") {
        ApiResponse.badRequest(res, "Feed URL is required");
        return;
      }

      // Parse the feed to get metadata
      let feedMeta: { title?: string; description?: string; link?: string } = {};
      try {
        const Parser = (await import("rss-parser")).default;
        const parser = new Parser({ timeout: 10000 });
        const feed = await parser.parseURL(feed_url.trim());
        feedMeta = {
          title: feed.title || undefined,
          description: feed.description || undefined,
          link: feed.link || undefined,
        };
      } catch (parseErr) {
        logger.warn({ parseErr, feed_url }, "Failed to parse RSS feed");
        ApiResponse.badRequest(res, "Could not parse the RSS feed. Please check the URL.");
        return;
      }

      const { data, error } = await supabaseAdmin
        .from("rss_feeds")
        .insert({
          user_id: userId,
          feed_url: feed_url.trim(),
          title: feedMeta.title || null,
          description: feedMeta.description || null,
          site_url: feedMeta.link || null,
          collection_id: collection_id || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          ApiResponse.error(res, "You already have this feed", 409, "Conflict");
          return;
        }
        logger.error({ error }, "Failed to add feed");
        ApiResponse.error(res, "Failed to add feed");
        return;
      }

      ApiResponse.created(res, data, "Feed added");
    } catch (error: any) {
      logger.error({ error }, "Failed to add feed");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * DELETE /api/v1/rss-feeds/:id
   */
  static async deleteFeed(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const feedId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const { error } = await supabaseAdmin
        .from("rss_feeds")
        .delete()
        .eq("id", feedId)
        .eq("user_id", userId);

      if (error) {
        logger.error({ error }, "Failed to delete feed");
        ApiResponse.error(res, "Failed to delete feed");
        return;
      }

      ApiResponse.success(res, null, "Feed deleted");
    } catch (error: any) {
      logger.error({ error }, "Failed to delete feed");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * PATCH /api/v1/rss-feeds/:id
   */
  static async updateFeed(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const feedId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const { is_active, collection_id } = req.body;

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (typeof is_active === "boolean") updates.is_active = is_active;
      if (collection_id !== undefined) updates.collection_id = collection_id || null;

      const { data, error } = await supabaseAdmin
        .from("rss_feeds")
        .update(updates)
        .eq("id", feedId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        logger.error({ error }, "Failed to update feed");
        ApiResponse.error(res, "Failed to update feed");
        return;
      }

      ApiResponse.success(res, data, "Feed updated");
    } catch (error: any) {
      logger.error({ error }, "Failed to update feed");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * POST /api/v1/rss-feeds/:id/check
   * Check a single feed for new items.
   */
  static async checkFeed(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const feedId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      // Get the feed
      const { data: feed, error: feedErr } = await supabaseAdmin
        .from("rss_feeds")
        .select("*")
        .eq("id", feedId)
        .eq("user_id", userId)
        .single();

      if (feedErr || !feed) {
        ApiResponse.notFound(res, "Feed not found");
        return;
      }

      // Parse the feed
      const Parser = (await import("rss-parser")).default;
      const parser = new Parser({ timeout: 10000 });
      let parsedFeed;
      try {
        parsedFeed = await parser.parseURL(feed.feed_url);
      } catch (parseErr) {
        await supabaseAdmin
          .from("rss_feeds")
          .update({
            last_error: "Failed to parse feed",
            last_checked_at: new Date().toISOString(),
          })
          .eq("id", feedId);

        ApiResponse.error(res, "Failed to parse feed");
        return;
      }

      const items = parsedFeed.items || [];
      let newCount = 0;

      for (const item of items.slice(0, 20)) {
        const guid = item.guid || item.link || item.title || "";
        if (!guid || !item.link) continue;

        // Check if item already exists
        const { data: existing } = await supabaseAdmin
          .from("rss_feed_items")
          .select("id")
          .eq("feed_id", feedId)
          .eq("guid", guid)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Save the item
        await supabaseAdmin.from("rss_feed_items").insert({
          feed_id: feedId,
          user_id: userId,
          guid,
          url: item.link,
          title: item.title || null,
          description: item.contentSnippet || item.content || null,
          published_at: item.isoDate || null,
        });

        // Auto-save as a link
        try {
          const link = await LinkService.createLink(
            userId,
            item.link,
            feed.collection_id
          );

          // Mark item as saved with link reference
          await supabaseAdmin
            .from("rss_feed_items")
            .update({ is_saved: true, link_id: link.id })
            .eq("feed_id", feedId)
            .eq("guid", guid);

          newCount++;
        } catch {
          // Duplicate or other error — skip
        }
      }

      // Update feed check time
      await supabaseAdmin
        .from("rss_feeds")
        .update({
          last_checked_at: new Date().toISOString(),
          last_error: null,
          title: parsedFeed.title || feed.title,
        })
        .eq("id", feedId);

      ApiResponse.success(
        res,
        { new_items: newCount, total_items: items.length },
        `Found ${newCount} new items`
      );
    } catch (error: any) {
      logger.error({ error }, "Failed to check feed");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * GET /api/v1/rss-feeds/:id/items
   * Get recent items for a feed.
   */
  static async getFeedItems(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const feedId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const { data, error } = await supabaseAdmin
        .from("rss_feed_items")
        .select("*")
        .eq("feed_id", feedId)
        .eq("user_id", userId)
        .order("published_at", { ascending: false })
        .limit(50);

      if (error) {
        logger.error({ error }, "Failed to fetch feed items");
        ApiResponse.error(res, "Failed to fetch feed items");
        return;
      }

      ApiResponse.success(res, data || []);
    } catch (error: any) {
      logger.error({ error }, "Failed to get feed items");
      ApiResponse.error(res, error.message);
    }
  }
}

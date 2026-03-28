import { Request, Response } from "express";
import { ApiResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import { supabaseAdmin } from "../config/supabase";
import { getDecayScanQueue } from "../queues";

export class DecayController {
  /**
   * GET /api/v1/decay
   * Get content decay scores for the authenticated user.
   * Returns scores sorted by decay_score descending (most stale first).
   */
  static async getDecayScores(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const page = Number(req.query.page) || 1;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const minScore = Number(req.query.min_score) || 0;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const query = supabaseAdmin
        .from("content_decay_scores")
        .select(
          "*, link:links(title, url, domain, category, created_at, reading_status, favicon_url, emoji)",
          { count: "exact" }
        )
        .eq("user_id", userId)
        .gte("decay_score", minScore)
        .order("decay_score", { ascending: false })
        .range(from, to);

      const { data, count, error } = await query;

      if (error) {
        logger.error({ error }, "Failed to fetch decay scores");
        ApiResponse.error(res, "Failed to fetch decay scores");
        return;
      }

      ApiResponse.paginated(res, data || [], {
        page,
        limit,
        total: count || 0,
      });
    } catch (error: any) {
      logger.error({ error }, "Failed to get decay scores");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * GET /api/v1/decay/summary
   * Get decay summary stats for the dashboard.
   */
  static async getDecaySummary(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      const { data, error } = await supabaseAdmin
        .from("content_decay_scores")
        .select("decay_score, decay_rate")
        .eq("user_id", userId);

      if (error) {
        logger.error({ error }, "Failed to fetch decay summary");
        ApiResponse.error(res, "Failed to fetch decay summary");
        return;
      }

      const scores = data || [];
      const total = scores.length;

      if (total === 0) {
        ApiResponse.success(res, {
          total: 0,
          avg_score: 0,
          fresh: 0,
          aging: 0,
          stale: 0,
          by_rate: { fast: 0, medium: 0, slow: 0 },
          last_scan: null,
        });
        return;
      }

      const avgScore = Math.round(
        scores.reduce((sum, s) => sum + s.decay_score, 0) / total
      );

      // Buckets: fresh (0-30), aging (31-60), stale (61-100)
      const fresh = scores.filter((s) => s.decay_score <= 30).length;
      const aging = scores.filter(
        (s) => s.decay_score > 30 && s.decay_score <= 60
      ).length;
      const stale = scores.filter((s) => s.decay_score > 60).length;

      const byRate = { fast: 0, medium: 0, slow: 0 };
      for (const s of scores) {
        if (s.decay_rate in byRate) {
          byRate[s.decay_rate as keyof typeof byRate]++;
        }
      }

      // Get last scan time
      const { data: lastScan } = await supabaseAdmin
        .from("content_decay_scores")
        .select("scanned_at")
        .eq("user_id", userId)
        .order("scanned_at", { ascending: false })
        .limit(1)
        .single();

      ApiResponse.success(res, {
        total,
        avg_score: avgScore,
        fresh,
        aging,
        stale,
        by_rate: byRate,
        last_scan: lastScan?.scanned_at || null,
      });
    } catch (error: any) {
      logger.error({ error }, "Failed to get decay summary");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * POST /api/v1/decay/scan
   * Trigger an on-demand decay scan.
   */
  static async triggerScan(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      const queue = getDecayScanQueue();
      if (queue) {
        await queue.add("on-demand-scan", { userId });
        ApiResponse.success(res, { queued: true }, "Decay scan queued");
      } else {
        // Inline fallback
        const { calculateDecayScore } = await import("../workers/decay.worker");

        const { data: links, error } = await supabaseAdmin
          .from("links")
          .select("id, created_at, category, reading_status, is_pinned")
          .eq("user_id", userId);

        if (error || !links) {
          ApiResponse.error(res, "Failed to fetch links for scan");
          return;
        }

        // Delete old scores
        await supabaseAdmin
          .from("content_decay_scores")
          .delete()
          .eq("user_id", userId);

        const scores = links.map((link) => {
          const result = calculateDecayScore(
            link.created_at,
            link.category,
            link.reading_status,
            link.is_pinned
          );
          return {
            link_id: link.id,
            user_id: userId,
            decay_score: result.score,
            age_days: result.factors.age_days,
            decay_rate: result.factors.category_decay_rate,
            scanned_at: new Date().toISOString(),
          };
        });

        // Insert in batches
        const BATCH = 100;
        for (let i = 0; i < scores.length; i += BATCH) {
          await supabaseAdmin
            .from("content_decay_scores")
            .insert(scores.slice(i, i + BATCH));
        }

        ApiResponse.success(
          res,
          { scanned: links.length },
          `Scanned ${links.length} links`
        );
      }
    } catch (error: any) {
      logger.error({ error }, "Failed to trigger decay scan");
      ApiResponse.error(res, error.message);
    }
  }
}

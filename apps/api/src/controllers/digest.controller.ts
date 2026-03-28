import { Request, Response } from "express";
import { ApiResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import { supabaseAdmin } from "../config/supabase";
import { getDigestQueue } from "../queues";

export class DigestController {
  /**
   * GET /api/v1/digests
   * Get digest history for the authenticated user.
   */
  static async getDigests(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const page = Number(req.query.page) || 1;
      const limit = Math.min(Number(req.query.limit) || 10, 50);
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, count, error } = await supabaseAdmin
        .from("digests")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        logger.error({ error }, "Failed to fetch digests");
        ApiResponse.error(res, "Failed to fetch digests");
        return;
      }

      ApiResponse.paginated(res, data || [], {
        page,
        limit,
        total: count || 0,
      });
    } catch (error: any) {
      logger.error({ error }, "Failed to get digests");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * POST /api/v1/digests/generate
   * Trigger on-demand digest generation.
   * Uses queue if available, otherwise generates inline.
   */
  static async generateDigest(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const days = req.body.days && Number(req.body.days) > 0
        ? Math.min(Number(req.body.days), 30)
        : 7;

      const queue = getDigestQueue();
      if (queue) {
        await queue.add("on-demand-digest", { userId, days });
        ApiResponse.success(res, { queued: true }, "Digest generation queued");
      } else {
        // Inline fallback — generate and store immediately
        const { AIService } = await import("../services/ai.service");
        const digest = await AIService.generateDigest(userId, days);

        const periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - days);

        await supabaseAdmin.from("digests").insert({
          user_id: userId,
          summary: digest.summary,
          highlights: digest.highlights,
          themes: digest.themes,
          stats: digest.stats,
          period_days: days,
          period_start: periodStart.toISOString(),
          period_end: new Date().toISOString(),
        });

        ApiResponse.success(res, digest, "Digest generated");
      }
    } catch (error: any) {
      logger.error({ error }, "Failed to generate digest");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * DELETE /api/v1/digests/:id
   * Delete a digest record.
   */
  static async deleteDigest(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const { error } = await supabaseAdmin
        .from("digests")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        logger.error({ error }, "Failed to delete digest");
        ApiResponse.error(res, "Failed to delete digest");
        return;
      }

      ApiResponse.success(res, null, "Digest deleted");
    } catch (error: any) {
      logger.error({ error }, "Failed to delete digest");
      ApiResponse.error(res, error.message);
    }
  }
}

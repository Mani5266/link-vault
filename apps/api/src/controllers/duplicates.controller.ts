import { Request, Response } from "express";
import { DuplicateService } from "../services/duplicate.service";
import { ApiResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import { isUUID } from "../utils/validate";

// ============================================================
// DuplicatesController — Handles duplicate detection endpoints
// ============================================================

export class DuplicatesController {
  /**
   * GET /api/v1/duplicates
   * Find all duplicate link groups for the authenticated user.
   */
  static async getDuplicates(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const groups = await DuplicateService.findDuplicates(userId);

      ApiResponse.success(res, {
        groups,
        total_groups: groups.length,
        total_duplicates: groups.reduce((sum, g) => sum + g.links.length, 0),
      });
    } catch (error: any) {
      logger.error({ error }, "Failed to find duplicates");
      ApiResponse.error(res, "Failed to find duplicates");
    }
  }

  /**
   * POST /api/v1/duplicates/merge
   * Merge a duplicate group — keep one link, delete the rest.
   */
  static async mergeDuplicates(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { keep_id, delete_ids } = req.body;

      if (!isUUID(keep_id)) {
        ApiResponse.badRequest(res, "Invalid keep_id");
        return;
      }
      if (!Array.isArray(delete_ids) || delete_ids.length === 0 || !delete_ids.every(isUUID)) {
        ApiResponse.badRequest(res, "Invalid or missing delete_ids");
        return;
      }

      const result = await DuplicateService.mergeDuplicates(
        userId,
        keep_id,
        delete_ids
      );

      ApiResponse.success(
        res,
        result,
        `Merged ${result.merged} duplicate${result.merged === 1 ? "" : "s"}`
      );
    } catch (error: any) {
      const status = error.statusCode || 500;
      logger.error({ error }, "Failed to merge duplicates");
      ApiResponse.error(
        res,
        "Failed to merge duplicates",
        status
      );
    }
  }
}

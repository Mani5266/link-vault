import { Request, Response } from "express";
import { TagService } from "../services/tag.service";
import { ApiResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";

// ============================================================
// TagsController — Handles tag management endpoints
// ============================================================

export class TagsController {
  /**
   * GET /api/v1/tags
   * Get all unique tags for the authenticated user with usage counts.
   */
  static async getTags(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const tags = await TagService.getUserTags(userId);
      ApiResponse.success(res, tags);
    } catch (error: any) {
      logger.error({ error }, "Failed to get tags");
      ApiResponse.error(res, "Failed to fetch tags");
    }
  }

  /**
   * PATCH /api/v1/tags/rename
   * Rename a tag across all of the user's links.
   */
  static async renameTag(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { old_name, new_name } = req.body;

      const affected = await TagService.renameTag(userId, old_name, new_name);

      ApiResponse.success(res, {
        affected,
        old_name,
        new_name,
      }, `Tag renamed: "${old_name}" → "${new_name}" (${affected} link${affected === 1 ? "" : "s"} updated)`);
    } catch (error: any) {
      const status = error.statusCode || 500;
      logger.error({ error }, "Failed to rename tag");
      ApiResponse.error(res, "Failed to rename tag", status);
    }
  }

  /**
   * POST /api/v1/tags/delete
   * Delete a tag from all of the user's links.
   * Uses POST instead of DELETE to send a body.
   */
  static async deleteTag(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { name } = req.body;

      const affected = await TagService.deleteTag(userId, name);

      ApiResponse.success(res, {
        affected,
        deleted_tag: name,
      }, `Tag "${name}" removed from ${affected} link${affected === 1 ? "" : "s"}`);
    } catch (error: any) {
      const status = error.statusCode || 500;
      logger.error({ error }, "Failed to delete tag");
      ApiResponse.error(res, "Failed to delete tag", status);
    }
  }

  /**
   * POST /api/v1/tags/merge
   * Merge multiple source tags into a single target tag.
   */
  static async mergeTags(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { source_tags, target_tag } = req.body;

      const affected = await TagService.mergeTags(userId, source_tags, target_tag);

      ApiResponse.success(res, {
        affected,
        source_tags,
        target_tag,
      }, `Merged ${source_tags.length} tag${source_tags.length === 1 ? "" : "s"} into "${target_tag}" (${affected} link${affected === 1 ? "" : "s"} updated)`);
    } catch (error: any) {
      const status = error.statusCode || 500;
      logger.error({ error }, "Failed to merge tags");
      ApiResponse.error(res, "Failed to merge tags", status);
    }
  }
}

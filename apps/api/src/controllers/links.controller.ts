import { Request, Response } from "express";
import { LinkService } from "../services/link.service";
import { AIService } from "../services/ai.service";
import { ApiResponse } from "../utils/apiResponse";
import { parseBookmarksHtml } from "../utils/bookmarkParser";
import { logger } from "../utils/logger";
import { getValidUUIDParam, isUUID } from "../utils/validate";
import type { LinkFilters } from "@linkvault/shared";
import { LIMITS } from "@linkvault/shared";
import { getAIProcessingQueue } from "../queues";

function getParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}

export class LinksController {
  /**
   * GET /api/v1/links
   */
  static async getLinks(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const filters: LinkFilters = req.query as any;

      const { data, total } = await LinkService.getLinks(userId, filters);

      ApiResponse.paginated(res, data, {
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 20,
        total,
      });
    } catch (error: any) {
      logger.error({ error }, "Failed to get links");
      ApiResponse.error(res, "Failed to load links");
    }
  }

  /**
   * GET /api/v1/links/:id
   */
  static async getLinkById(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = getValidUUIDParam(req.params.id);
      if (!id) {
        ApiResponse.badRequest(res, "Invalid link ID");
        return;
      }

      const link = await LinkService.getLinkById(userId, id);

      if (!link) {
        ApiResponse.notFound(res, "Link not found");
        return;
      }

      ApiResponse.success(res, link);
    } catch (error: any) {
      logger.error({ error }, "Failed to get link");
      ApiResponse.error(res, "Failed to load link");
    }
  }

  /**
   * POST /api/v1/links
   * Creates a link and enqueues AI processing (background job).
   * Falls back to inline processing if Redis/BullMQ is unavailable.
   */
  static async createLink(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { url, collection_id } = req.body;

      // Create the link first (fast)
      const link = await LinkService.createLink(userId, url, collection_id);

      // Try to enqueue background AI processing
      const queue = getAIProcessingQueue();
      if (queue) {
        // Background processing — set status to pending and return immediately
        try {
          await LinkService.updateLink(userId, link.id, {
            processing_status: "pending" as any,
          });
        } catch (statusErr) {
          logger.warn({ statusErr }, "Failed to set processing_status, continuing without it");
        }

        await queue.add("process-link", {
          linkId: link.id,
          userId,
          url,
          collectionId: collection_id || null,
        });

        const updatedLink = await LinkService.getLinkById(userId, link.id);
        ApiResponse.created(
          res,
          updatedLink || link,
          "Link saved — AI analysis in progress"
        );
      } else {
        // Fallback: inline processing (Redis unavailable)
        try {
          const aiResult = await AIService.summarizeUrl(url, undefined);

          const updateData: Record<string, unknown> = {
            title: aiResult.title,
            description: aiResult.description,
            tags: aiResult.tags,
            category: aiResult.category,
            emoji: aiResult.emoji,
            ai_processed: true,
            processing_status: "complete",
          };

          const updatedLink = await LinkService.updateLink(userId, link.id, updateData as any);

          ApiResponse.created(res, updatedLink, "Link saved and analyzed by AI");
        } catch (aiError) {
          logger.warn({ aiError }, "AI processing failed, returning basic link");

          // Return the saved link even if AI failed
          ApiResponse.created(
            res,
            link,
            "Link saved (AI analysis unavailable)"
          );
        }
      }
    } catch (error: any) {
      if (error.statusCode === 409) {
        ApiResponse.error(res, error.message, 409, "Conflict");
        return;
      }
      logger.error({ error }, "Failed to create link");
      ApiResponse.error(res, "Failed to create link");
    }
  }

  /**
   * PATCH /api/v1/links/:id
   */
  static async updateLink(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = getValidUUIDParam(req.params.id);
      if (!id) {
        ApiResponse.badRequest(res, "Invalid link ID");
        return;
      }

      const link = await LinkService.updateLink(userId, id, req.body);
      ApiResponse.success(res, link, "Link updated");
    } catch (error: any) {
      logger.error({ error }, "Failed to update link");
      ApiResponse.error(res, "Failed to update link");
    }
  }

  /**
   * DELETE /api/v1/links/:id
   */
  static async deleteLink(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = getValidUUIDParam(req.params.id);
      if (!id) {
        ApiResponse.badRequest(res, "Invalid link ID");
        return;
      }

      await LinkService.deleteLink(userId, id);
      ApiResponse.success(res, null, "Link deleted");
    } catch (error: any) {
      logger.error({ error }, "Failed to delete link");
      ApiResponse.error(res, "Failed to delete link");
    }
  }

  /**
   * POST /api/v1/links/bulk-delete
   */
  static async bulkDelete(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0 || !ids.every(isUUID)) {
        ApiResponse.badRequest(res, "Invalid or missing link IDs");
        return;
      }

      await LinkService.bulkDelete(userId, ids);
      ApiResponse.success(res, null, `${ids.length} links deleted`);
    } catch (error: any) {
      logger.error({ error }, "Failed to bulk delete links");
      ApiResponse.error(res, "Failed to delete links");
    }
  }

  /**
   * PATCH /api/v1/links/bulk-move
   */
  static async bulkMove(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { ids, collection_id } = req.body;

      if (!Array.isArray(ids) || ids.length === 0 || !ids.every(isUUID)) {
        ApiResponse.badRequest(res, "Invalid or missing link IDs");
        return;
      }
      if (collection_id !== null && collection_id !== undefined && !isUUID(collection_id)) {
        ApiResponse.badRequest(res, "Invalid collection ID");
        return;
      }

      await LinkService.bulkMove(userId, ids, collection_id);
      ApiResponse.success(res, null, `${ids.length} links moved`);
    } catch (error: any) {
      logger.error({ error }, "Failed to bulk move links");
      ApiResponse.error(res, "Failed to move links");
    }
  }

  /**
   * GET /api/v1/links/export
   * Returns all links for the authenticated user in a flat exportable format.
   */
  static async exportLinks(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      const links = await LinkService.getExportableLinks(userId);

      ApiResponse.success(res, links, `${links.length} links exported`);
    } catch (error: any) {
      logger.error({ error }, "Failed to export links");
      ApiResponse.error(res, "Failed to export links");
    }
  }

  /**
   * POST /api/v1/links/import
   * Import bookmarks from a browser HTML export file.
   */
  static async importBookmarks(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { html, collection_id } = req.body;

      // Parse the bookmarks HTML
      const bookmarks = parseBookmarksHtml(html);

      if (bookmarks.length === 0) {
        ApiResponse.badRequest(
          res,
          "No valid bookmarks found in the uploaded file."
        );
        return;
      }

      if (bookmarks.length > LIMITS.MAX_IMPORT_BOOKMARKS) {
        ApiResponse.badRequest(
          res,
          `Too many bookmarks (${bookmarks.length}). Maximum is ${LIMITS.MAX_IMPORT_BOOKMARKS} per import.`
        );
        return;
      }

      logger.info(
        { userId, bookmarkCount: bookmarks.length },
        "Starting bookmark import"
      );

      const result = await LinkService.bulkCreate(
        userId,
        bookmarks,
        collection_id
      );

      logger.info(
        { userId, ...result },
        "Bookmark import completed"
      );

      ApiResponse.success(res, result, `Imported ${result.imported} bookmarks`);
    } catch (error: any) {
      logger.error({ error }, "Failed to import bookmarks");
      ApiResponse.error(res, "Failed to import bookmarks");
    }
  }

  /**
   * POST /api/v1/links/:id/restore
   * Restore a soft-deleted link from trash.
   */
  static async restoreLink(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = getValidUUIDParam(req.params.id);
      if (!id) {
        ApiResponse.badRequest(res, "Invalid link ID");
        return;
      }

      await LinkService.restoreLink(userId, id);
      ApiResponse.success(res, null, "Link restored");
    } catch (error: any) {
      logger.error({ error }, "Failed to restore link");
      ApiResponse.error(res, "Failed to restore link");
    }
  }

  /**
   * DELETE /api/v1/links/:id/permanent
   * Permanently delete a link from trash.
   */
  static async permanentDelete(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = getValidUUIDParam(req.params.id);
      if (!id) {
        ApiResponse.badRequest(res, "Invalid link ID");
        return;
      }

      await LinkService.permanentDelete(userId, id);
      ApiResponse.success(res, null, "Link permanently deleted");
    } catch (error: any) {
      logger.error({ error }, "Failed to permanently delete link");
      ApiResponse.error(res, "Failed to permanently delete link");
    }
  }

  /**
   * DELETE /api/v1/links/trash
   * Empty trash — permanently delete all soft-deleted links.
   */
  static async emptyTrash(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      await LinkService.emptyTrash(userId);
      ApiResponse.success(res, null, "Trash emptied");
    } catch (error: any) {
      logger.error({ error }, "Failed to empty trash");
      ApiResponse.error(res, "Failed to empty trash");
    }
  }
}

import { Request, Response } from "express";
import { LinkService } from "../services/link.service";
import { AIService } from "../services/ai.service";
import { ApiResponse } from "../utils/apiResponse";
import { parseBookmarksHtml } from "../utils/bookmarkParser";
import { logger } from "../utils/logger";
import type { LinkFilters } from "@linkvault/shared";
import { LIMITS } from "@linkvault/shared";

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
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * GET /api/v1/links/:id
   */
  static async getLinkById(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = getParam(req.params.id);

      const link = await LinkService.getLinkById(userId, id);

      if (!link) {
        ApiResponse.notFound(res, "Link not found");
        return;
      }

      ApiResponse.success(res, link);
    } catch (error: any) {
      logger.error({ error }, "Failed to get link");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * POST /api/v1/links
   * Creates a link and triggers AI summarization.
   */
  static async createLink(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { url, collection_id } = req.body;

      // Create the link first (fast)
      const link = await LinkService.createLink(userId, url, collection_id);

      // Trigger AI summarization (may take a few seconds)
      // We do this inline for MVP — could be moved to a queue later
      try {
        const aiResult = await AIService.summarizeUrl(url, undefined);

        // Update the link with AI data
        const updatedLink = await LinkService.updateLink(userId, link.id, {
          title: aiResult.title,
          description: aiResult.description,
          tags: aiResult.tags,
          category: aiResult.category as any,
          emoji: aiResult.emoji,
          ai_processed: true,
        });

        ApiResponse.created(res, updatedLink, "Link saved and analyzed by AI");
      } catch (aiError) {
        // AI failed, but link is saved — return the basic link
        logger.warn({ aiError }, "AI summarization failed, returning basic link");
        ApiResponse.created(
          res,
          link,
          "Link saved (AI analysis unavailable)"
        );
      }
    } catch (error: any) {
      if (error.statusCode === 409) {
        ApiResponse.error(res, error.message, 409, "Conflict");
        return;
      }
      logger.error({ error }, "Failed to create link");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * PATCH /api/v1/links/:id
   */
  static async updateLink(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = getParam(req.params.id);

      const link = await LinkService.updateLink(userId, id, req.body);
      ApiResponse.success(res, link, "Link updated");
    } catch (error: any) {
      logger.error({ error }, "Failed to update link");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * DELETE /api/v1/links/:id
   */
  static async deleteLink(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = getParam(req.params.id);

      await LinkService.deleteLink(userId, id);
      ApiResponse.success(res, null, "Link deleted");
    } catch (error: any) {
      logger.error({ error }, "Failed to delete link");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * POST /api/v1/links/bulk-delete
   */
  static async bulkDelete(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { ids } = req.body;

      await LinkService.bulkDelete(userId, ids);
      ApiResponse.success(res, null, `${ids.length} links deleted`);
    } catch (error: any) {
      logger.error({ error }, "Failed to bulk delete links");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * PATCH /api/v1/links/bulk-move
   */
  static async bulkMove(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { ids, collection_id } = req.body;

      await LinkService.bulkMove(userId, ids, collection_id);
      ApiResponse.success(res, null, `${ids.length} links moved`);
    } catch (error: any) {
      logger.error({ error }, "Failed to bulk move links");
      ApiResponse.error(res, error.message);
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
      ApiResponse.error(res, error.message);
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
      ApiResponse.error(res, error.message);
    }
  }
}

import { Request, Response } from "express";
import { CollectionService } from "../services/collection.service";
import { ApiResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";

function getParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}

export class CollectionsController {
  /**
   * GET /api/collections
   */
  static async getCollections(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const collections = await CollectionService.getCollections(userId);
      ApiResponse.success(res, collections);
    } catch (error: any) {
      logger.error({ error }, "Failed to get collections");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * POST /api/collections
   */
  static async createCollection(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const collection = await CollectionService.createCollection(
        userId,
        req.body
      );
      ApiResponse.created(res, collection, "Collection created");
    } catch (error: any) {
      logger.error({ error }, "Failed to create collection");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * PATCH /api/collections/:id
   */
  static async updateCollection(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = getParam(req.params.id);

      const collection = await CollectionService.updateCollection(
        userId,
        id,
        req.body
      );
      ApiResponse.success(res, collection, "Collection updated");
    } catch (error: any) {
      logger.error({ error }, "Failed to update collection");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * DELETE /api/collections/:id
   */
  static async deleteCollection(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = getParam(req.params.id);

      await CollectionService.deleteCollection(userId, id);
      ApiResponse.success(res, null, "Collection deleted");
    } catch (error: any) {
      logger.error({ error }, "Failed to delete collection");
      ApiResponse.error(res, error.message);
    }
  }
}

import { Request, Response } from "express";
import { SmartCollectionService } from "../services/smartCollection.service";
import { ApiResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import { getValidUUIDParam } from "../utils/validate";

export class SmartCollectionsController {
  /** GET /api/v1/smart-collections */
  static async getAll(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const data = await SmartCollectionService.getAll(userId);
      ApiResponse.success(res, data);
    } catch (error: any) {
      logger.error({ error }, "Failed to get smart collections");
      ApiResponse.error(res, "Failed to fetch smart collections");
    }
  }

  /** GET /api/v1/smart-collections/:id */
  static async getById(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = getValidUUIDParam(req.params.id);
      if (!id) {
        ApiResponse.badRequest(res, "Invalid smart collection ID");
        return;
      }
      const sc = await SmartCollectionService.getById(userId, id);
      if (!sc) {
        ApiResponse.notFound(res, "Smart collection not found");
        return;
      }
      ApiResponse.success(res, sc);
    } catch (error: any) {
      logger.error({ error }, "Failed to get smart collection");
      ApiResponse.error(res, "Failed to fetch smart collection");
    }
  }

  /** GET /api/v1/smart-collections/:id/links */
  static async getLinks(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = getValidUUIDParam(req.params.id);
      if (!id) {
        ApiResponse.badRequest(res, "Invalid smart collection ID");
        return;
      }
      const sc = await SmartCollectionService.getById(userId, id);
      if (!sc) {
        ApiResponse.notFound(res, "Smart collection not found");
        return;
      }
      const { links, count } = await SmartCollectionService.queryLinks(
        userId,
        sc.rules,
        sc.match_mode
      );
      ApiResponse.success(res, { links, total: count });
    } catch (error: any) {
      logger.error({ error }, "Failed to get smart collection links");
      ApiResponse.error(res, "Failed to fetch smart collection links");
    }
  }

  /** POST /api/v1/smart-collections */
  static async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const sc = await SmartCollectionService.create(userId, req.body);
      ApiResponse.created(res, sc, "Smart collection created");
    } catch (error: any) {
      logger.error({ error }, "Failed to create smart collection");
      ApiResponse.error(res, "Failed to create smart collection");
    }
  }

  /** PATCH /api/v1/smart-collections/:id */
  static async update(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = getValidUUIDParam(req.params.id);
      if (!id) {
        ApiResponse.badRequest(res, "Invalid smart collection ID");
        return;
      }
      const sc = await SmartCollectionService.update(userId, id, req.body);
      ApiResponse.success(res, sc, "Smart collection updated");
    } catch (error: any) {
      logger.error({ error }, "Failed to update smart collection");
      ApiResponse.error(res, "Failed to update smart collection");
    }
  }

  /** DELETE /api/v1/smart-collections/:id */
  static async remove(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = getValidUUIDParam(req.params.id);
      if (!id) {
        ApiResponse.badRequest(res, "Invalid smart collection ID");
        return;
      }
      await SmartCollectionService.delete(userId, id);
      ApiResponse.success(res, null, "Smart collection deleted");
    } catch (error: any) {
      logger.error({ error }, "Failed to delete smart collection");
      ApiResponse.error(res, "Failed to delete smart collection");
    }
  }
}

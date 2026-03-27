import { Request, Response } from "express";
import { AnalyticsService } from "../services/analytics.service";
import { ApiResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";

export class AnalyticsController {
  /**
   * GET /api/v1/analytics
   * Returns usage analytics for the authenticated user.
   */
  static async getAnalytics(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id as string;
      const data = await AnalyticsService.getAnalytics(userId);
      ApiResponse.success(res, data, "Analytics retrieved");
    } catch (error: any) {
      logger.error({ error }, "Analytics endpoint error");
      ApiResponse.error(res, "Failed to retrieve analytics.", 500);
    }
  }
}

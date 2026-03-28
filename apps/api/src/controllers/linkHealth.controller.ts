import { Request, Response } from "express";
import { HealthCheckService } from "../services/healthCheck.service";
import { ApiResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";

export class LinkHealthController {
  /**
   * POST /api/v1/link-health/scan
   * Scan all links for the authenticated user and return health results.
   */
  static async scan(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      const results = await HealthCheckService.checkAll(userId);

      ApiResponse.success(res, results, `Checked ${results.length} links`);
    } catch (error: any) {
      logger.error({ error }, "Failed to scan link health");
      ApiResponse.error(res, "Failed to scan link health");
    }
  }
}

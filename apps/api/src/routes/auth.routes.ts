import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { CollectionService } from "../services/collection.service";
import { ApiResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";

const router = Router();

/**
 * POST /api/v1/auth/setup
 * Called after first login to seed default collections.
 * Idempotent — safe to call multiple times.
 */
router.post("/setup", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Check if user already has collections
    const existing = await CollectionService.getCollections(userId);

    if (existing.length === 0) {
      // First login — seed default collections
      await CollectionService.seedDefaults(userId);
      const collections = await CollectionService.getCollections(userId);

      logger.info({ userId }, "Default collections seeded for new user");
      ApiResponse.created(
        res,
        collections,
        "Account setup complete. Default collections created."
      );
    } else {
      // Already set up
      ApiResponse.success(
        res,
        existing,
        "Account already set up."
      );
    }
  } catch (error: any) {
    logger.error({ error }, "Account setup failed");
    ApiResponse.error(res, error.message);
  }
});

/**
 * GET /api/v1/auth/me
 * Returns the current user's profile.
 */
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    ApiResponse.success(res, {
      id: user.id,
      email: user.email,
      display_name:
        user.user_metadata?.full_name || user.user_metadata?.name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
    });
  } catch (error: any) {
    logger.error({ error }, "Failed to get user profile");
    ApiResponse.error(res, error.message);
  }
});

export default router;

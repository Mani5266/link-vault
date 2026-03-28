import { Router } from "express";
import { LinkHealthController } from "../controllers/linkHealth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { healthScanRateLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

// All link-health routes require authentication
router.use(authMiddleware);

// POST /api/v1/link-health/scan — scan all links (rate limited: 1 per 10 min)
router.post("/scan", healthScanRateLimiter, LinkHealthController.scan);

export default router;

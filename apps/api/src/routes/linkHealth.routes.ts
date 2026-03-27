import { Router } from "express";
import { LinkHealthController } from "../controllers/linkHealth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// All link-health routes require authentication
router.use(authMiddleware);

// POST /api/v1/link-health/scan — scan all links
router.post("/scan", LinkHealthController.scan);

export default router;

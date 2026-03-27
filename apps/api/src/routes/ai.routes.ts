import { Router } from "express";
import { AIController } from "../controllers/ai.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { aiRateLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

// AI routes require auth + rate limiting
router.use(authMiddleware);

router.post("/summarize", aiRateLimiter, AIController.summarize);
router.post("/suggest-tags", aiRateLimiter, AIController.suggestTags);
router.post("/semantic-search", aiRateLimiter, AIController.semanticSearch);
router.post("/digest", aiRateLimiter, AIController.digest);

export default router;

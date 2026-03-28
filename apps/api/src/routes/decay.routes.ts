import { Router } from "express";
import { DecayController } from "../controllers/decay.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { decayScanRateLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", DecayController.getDecayScores);
router.get("/summary", DecayController.getDecaySummary);
router.post("/scan", decayScanRateLimiter, DecayController.triggerScan);

export default router;

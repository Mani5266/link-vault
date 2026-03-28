import { Router } from "express";
import { DecayController } from "../controllers/decay.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", DecayController.getDecayScores);
router.get("/summary", DecayController.getDecaySummary);
router.post("/scan", DecayController.triggerScan);

export default router;

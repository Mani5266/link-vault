import { Router } from "express";
import { DigestController } from "../controllers/digest.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { aiRateLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", DigestController.getDigests);
router.post("/generate", aiRateLimiter, DigestController.generateDigest);
router.delete("/:id", DigestController.deleteDigest);

export default router;

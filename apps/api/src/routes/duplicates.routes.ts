import { Router } from "express";
import { DuplicatesController } from "../controllers/duplicates.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { mergeDuplicatesSchema } from "../validators/duplicate.validator";

const router = Router();

// All duplicate routes require authentication
router.use(authMiddleware);

// GET /api/v1/duplicates — find duplicate groups
router.get("/", DuplicatesController.getDuplicates);

// POST /api/v1/duplicates/merge — merge a duplicate group
router.post(
  "/merge",
  validate(mergeDuplicatesSchema),
  DuplicatesController.mergeDuplicates
);

export default router;

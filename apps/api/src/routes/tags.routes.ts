import { Router } from "express";
import { TagsController } from "../controllers/tags.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  renameTagSchema,
  deleteTagSchema,
  mergeTagsSchema,
} from "../validators/tag.validator";

const router = Router();

// All tag routes require authentication
router.use(authMiddleware);

// GET /api/v1/tags — list all tags with counts
router.get("/", TagsController.getTags);

// PATCH /api/v1/tags/rename — rename a tag globally
router.patch("/rename", validate(renameTagSchema), TagsController.renameTag);

// POST /api/v1/tags/delete — delete a tag globally
router.post("/delete", validate(deleteTagSchema), TagsController.deleteTag);

// POST /api/v1/tags/merge — merge multiple tags into one
router.post("/merge", validate(mergeTagsSchema), TagsController.mergeTags);

export default router;

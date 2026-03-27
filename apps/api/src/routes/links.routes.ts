import { Router } from "express";
import { LinksController } from "../controllers/links.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { importRateLimiter } from "../middleware/rateLimit.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createLinkSchema,
  updateLinkSchema,
  bulkDeleteSchema,
  bulkMoveSchema,
  linkQuerySchema,
  importBookmarksSchema,
} from "../validators/link.validator";

const router = Router();

// All link routes require authentication
router.use(authMiddleware);

router.get("/", validate(linkQuerySchema, "query"), LinksController.getLinks);

// Import must be registered before /:id to avoid route conflict
router.post(
  "/import",
  importRateLimiter,
  validate(importBookmarksSchema),
  LinksController.importBookmarks
);

// Export must be registered before /:id to avoid route conflict
router.get("/export", LinksController.exportLinks);

router.get("/:id", LinksController.getLinkById);
router.post("/", validate(createLinkSchema), LinksController.createLink);
router.patch("/:id", validate(updateLinkSchema), LinksController.updateLink);
router.delete("/:id", LinksController.deleteLink);
router.post(
  "/bulk-delete",
  validate(bulkDeleteSchema),
  LinksController.bulkDelete
);
router.patch(
  "/bulk-move",
  validate(bulkMoveSchema),
  LinksController.bulkMove
);

export default router;

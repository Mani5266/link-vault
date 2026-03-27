import { Router } from "express";
import { CollectionsController } from "../controllers/collections.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createCollectionSchema,
  updateCollectionSchema,
} from "../validators/collection.validator";

const router = Router();

// All collection routes require authentication
router.use(authMiddleware);

router.get("/", CollectionsController.getCollections);
router.post(
  "/",
  validate(createCollectionSchema),
  CollectionsController.createCollection
);
router.patch(
  "/:id",
  validate(updateCollectionSchema),
  CollectionsController.updateCollection
);
router.delete("/:id", CollectionsController.deleteCollection);

export default router;

import { Router } from "express";
import { SmartCollectionsController } from "../controllers/smartCollections.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createSmartCollectionSchema,
  updateSmartCollectionSchema,
} from "../validators/smartCollection.validator";

const router = Router();

router.use(authMiddleware);

router.get("/", SmartCollectionsController.getAll);
router.get("/:id", SmartCollectionsController.getById);
router.get("/:id/links", SmartCollectionsController.getLinks);
router.post(
  "/",
  validate(createSmartCollectionSchema),
  SmartCollectionsController.create
);
router.patch(
  "/:id",
  validate(updateSmartCollectionSchema),
  SmartCollectionsController.update
);
router.delete("/:id", SmartCollectionsController.remove);

export default router;

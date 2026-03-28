import { Router } from "express";
import { RssFeedController } from "../controllers/rssFeed.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", RssFeedController.getFeeds);
router.post("/", RssFeedController.addFeed);
router.patch("/:id", RssFeedController.updateFeed);
router.delete("/:id", RssFeedController.deleteFeed);
router.post("/:id/check", RssFeedController.checkFeed);
router.get("/:id/items", RssFeedController.getFeedItems);

export default router;

import { Router } from "express";
import { GraphController } from "../controllers/graph.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", GraphController.getGraph);

export default router;

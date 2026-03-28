import { Router } from "express";
import linksRoutes from "./links.routes";
import collectionsRoutes from "./collections.routes";
import aiRoutes from "./ai.routes";
import authRoutes from "./auth.routes";
import tagsRoutes from "./tags.routes";
import duplicatesRoutes from "./duplicates.routes";
import linkHealthRoutes from "./linkHealth.routes";
import smartCollectionsRoutes from "./smartCollections.routes";
import analyticsRoutes from "./analytics.routes";
import healthRoutes from "./health.routes";
import digestRoutes from "./digest.routes";
import decayRoutes from "./decay.routes";

// ============================================================
// Versioned routes — mounted at /api/v1
// ============================================================

const v1Router = Router();

v1Router.use("/auth", authRoutes);
v1Router.use("/links", linksRoutes);
v1Router.use("/collections", collectionsRoutes);
v1Router.use("/ai", aiRoutes);
v1Router.use("/tags", tagsRoutes);
v1Router.use("/duplicates", duplicatesRoutes);
v1Router.use("/link-health", linkHealthRoutes);
v1Router.use("/smart-collections", smartCollectionsRoutes);
v1Router.use("/analytics", analyticsRoutes);
v1Router.use("/digests", digestRoutes);
v1Router.use("/decay", decayRoutes);

// ============================================================
// Unversioned routes — mounted at /api
// Health check should not be versioned so monitoring tools
// don't need to update when a new API version ships.
// ============================================================

const apiRouter = Router();

apiRouter.use("/health", healthRoutes);
apiRouter.use("/v1", v1Router);

export default apiRouter;

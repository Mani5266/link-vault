// Sentry must be imported before all other modules
import "./instrument";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import * as Sentry from "@sentry/node";
import { env } from "./config/env";
import { corsOptions } from "./config/cors";
import { generalRateLimiter } from "./middleware/rateLimit.middleware";
import { errorHandler } from "./middleware/errorHandler.middleware";
import routes from "./routes";
import { logger } from "./utils/logger";
import { getRedisConnection, closeRedisConnection } from "./config/redis";
import { closeAllQueues } from "./queues";
import {
  startAIWorker,
  stopAIWorker,
  startDigestWorker,
  stopDigestWorker,
  scheduleWeeklyDigests,
  startDecayWorker,
  stopDecayWorker,
  scheduleDailyDecayScans,
} from "./workers";

const app = express();

// ============================================================
// Security & Parsing Middleware
// ============================================================
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "6mb" }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// Logging
// ============================================================
if (env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ============================================================
// Rate Limiting
// ============================================================
app.use("/api", generalRateLimiter);

// ============================================================
// Routes
// ============================================================
app.use("/api", routes);

// ============================================================
// 404 Handler
// ============================================================
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: "The requested endpoint does not exist",
    statusCode: 404,
  });
});

// ============================================================
// Global Error Handler
// ============================================================
// Sentry error handler must come before our custom error handler
// so Sentry captures errors before we format the response.
Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

// ============================================================
// Start Server + Background Workers
// ============================================================
const server = app.listen(env.PORT, async () => {
  logger.info(`LinkVault API running on port ${env.PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`CORS origin: ${env.CORS_ORIGIN}`);

  // Start background workers if Redis is available
  const redis = getRedisConnection();
  if (redis) {
    startAIWorker();
    startDigestWorker();
    startDecayWorker();

    // Register scheduled jobs
    await scheduleWeeklyDigests();
    await scheduleDailyDecayScans();

    logger.info("Background workers started");
  } else {
    logger.info("Running without background workers (no Redis)");
  }
});

// ============================================================
// Graceful Shutdown
// ============================================================
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully`);

  server.close(async () => {
    try {
      await stopAIWorker();
      await stopDigestWorker();
      await stopDecayWorker();
      await closeAllQueues();
      await closeRedisConnection();
      logger.info("Shutdown complete");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error during shutdown");
      process.exit(1);
    }
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default app;

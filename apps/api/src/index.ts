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
// Start Server
// ============================================================
app.listen(env.PORT, () => {
  logger.info(`LinkVault API running on port ${env.PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`CORS origin: ${env.CORS_ORIGIN}`);
});

export default app;

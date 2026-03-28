import { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import { logger } from "../utils/logger";

/**
 * Global error handling middleware.
 * Catches unhandled errors, reports them to Sentry,
 * and returns a consistent error response.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error(
    {
      error: err.message,
      stack: err.stack,
    },
    "Unhandled error"
  );

  // Sentry.setupExpressErrorHandler already captures most errors,
  // but capture explicitly as a safety net for edge cases.
  Sentry.captureException(err);

  const statusCode = (err as any).statusCode || 500;
  // Always return generic message — never leak error details to clients
  const message = statusCode < 500
    ? err.message // Client errors (4xx) are typically safe to expose
    : "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    error: statusCode < 500 ? (err.name || "Error") : "Internal Server Error",
    message,
    statusCode,
  });
}

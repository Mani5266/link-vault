import rateLimit from "express-rate-limit";
import { env } from "../config/env";
import { LIMITS } from "@linkvault/shared";

/**
 * Rate limiter for the AI summarization endpoint.
 * Prevents abuse of the Gemini API.
 */
export const aiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: "Too Many Requests",
    message: "AI rate limit exceeded. Please try again later.",
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per user (using their user ID from auth)
    return (req as any).user?.id || req.ip || "anonymous";
  },
});

/**
 * General rate limiter for all API endpoints.
 */
export const generalRateLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 100,
  message: {
    success: false,
    error: "Too Many Requests",
    message: "Rate limit exceeded. Please slow down.",
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for bookmark import.
 * Strict per-user limit since each import can insert hundreds of links.
 */
export const importRateLimiter = rateLimit({
  windowMs: LIMITS.IMPORT_RATE_LIMIT_WINDOW_MS,
  max: LIMITS.IMPORT_RATE_LIMIT_MAX,
  message: {
    success: false,
    error: "Too Many Requests",
    message: "Import rate limit exceeded. Please try again later.",
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req as any).user?.id || req.ip || "anonymous";
  },
});

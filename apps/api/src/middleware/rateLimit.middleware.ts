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
    // Rate limit per user (using their user ID from auth).
    // Require user.id — reject anonymous to prevent bypass.
    const userId = (req as any).user?.id;
    if (!userId) return req.ip || "unknown";
    return userId;
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
    return (req as any).user?.id || req.ip || "unknown";
  },
});

/**
 * Rate limiter for link health scan.
 * Each scan triggers up to 500 outbound HTTP requests — limit to 1 per 10 min.
 */
export const healthScanRateLimiter = rateLimit({
  windowMs: 10 * 60_000, // 10 minutes
  max: 1,
  message: {
    success: false,
    error: "Too Many Requests",
    message: "Health scan is limited to once every 10 minutes.",
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `health:${(req as any).user?.id || req.ip || "unknown"}`;
  },
});

/**
 * Rate limiter for RSS feed check.
 * Prevents spamming outbound requests to feed URLs.
 */
export const rssFeedCheckRateLimiter = rateLimit({
  windowMs: 2 * 60_000, // 2 minutes
  max: 5,
  message: {
    success: false,
    error: "Too Many Requests",
    message: "RSS feed check rate limit exceeded. Please wait.",
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `rss:${(req as any).user?.id || req.ip || "unknown"}`;
  },
});

/**
 * Rate limiter for content decay scan.
 * Limit to 1 per 5 minutes per user.
 */
export const decayScanRateLimiter = rateLimit({
  windowMs: 5 * 60_000, // 5 minutes
  max: 1,
  message: {
    success: false,
    error: "Too Many Requests",
    message: "Decay scan is limited to once every 5 minutes.",
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `decay:${(req as any).user?.id || req.ip || "unknown"}`;
  },
});

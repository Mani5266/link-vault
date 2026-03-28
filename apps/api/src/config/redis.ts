import IORedis from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

// ============================================================
// Redis Connection — Shared across BullMQ queues and workers
// ============================================================

let connection: IORedis | null = null;

/**
 * Get (or create) the shared Redis connection.
 * Returns null if REDIS_URL is not configured — features degrade gracefully.
 */
export function getRedisConnection(): IORedis | null {
  if (!env.REDIS_URL) {
    logger.warn("REDIS_URL not set — background jobs disabled, using inline processing");
    return null;
  }

  if (!connection) {
    connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      retryStrategy: (times) => {
        if (times > 5) {
          logger.error("Redis connection failed after 5 retries");
          return null; // Stop retrying
        }
        return Math.min(times * 500, 3000);
      },
    });

    connection.on("connect", () => {
      logger.info("Redis connected");
    });

    connection.on("error", (err) => {
      logger.error({ err }, "Redis connection error");
    });
  }

  return connection;
}

/**
 * Gracefully close the Redis connection.
 */
export async function closeRedisConnection(): Promise<void> {
  if (connection) {
    await connection.quit();
    connection = null;
    logger.info("Redis connection closed");
  }
}

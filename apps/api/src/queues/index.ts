import { Queue } from "bullmq";
import { getRedisConnection } from "../config/redis";
import { logger } from "../utils/logger";

// ============================================================
// Job Type Definitions
// ============================================================

/** AI processing job — scrape + summarize a link */
export interface AIProcessingJobData {
  linkId: string;
  userId: string;
  url: string;
  collectionId: string | null;
}

/** Weekly digest generation job */
export interface DigestJobData {
  userId: string;
  days: number;
}

/** Content decay scan job */
export interface DecayScanJobData {
  userId: string;
}

// ============================================================
// Queue Names
// ============================================================

export const QUEUE_NAMES = {
  AI_PROCESSING: "ai-processing",
  DIGEST: "digest",
  DECAY_SCAN: "decay-scan",
} as const;

// ============================================================
// Queue Instances — lazily created, null if Redis unavailable
// ============================================================

let aiProcessingQueue: Queue<AIProcessingJobData> | null = null;
let digestQueue: Queue<DigestJobData> | null = null;
let decayScanQueue: Queue<DecayScanJobData> | null = null;

export function getAIProcessingQueue(): Queue<AIProcessingJobData> | null {
  if (aiProcessingQueue) return aiProcessingQueue;

  const connection = getRedisConnection();
  if (!connection) return null;

  aiProcessingQueue = new Queue<AIProcessingJobData>(QUEUE_NAMES.AI_PROCESSING, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 200 },
    },
  });

  logger.info("AI processing queue initialized");
  return aiProcessingQueue;
}

export function getDigestQueue(): Queue<DigestJobData> | null {
  if (digestQueue) return digestQueue;

  const connection = getRedisConnection();
  if (!connection) return null;

  digestQueue = new Queue<DigestJobData>(QUEUE_NAMES.DIGEST, {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "fixed", delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });

  logger.info("Digest queue initialized");
  return digestQueue;
}

export function getDecayScanQueue(): Queue<DecayScanJobData> | null {
  if (decayScanQueue) return decayScanQueue;

  const connection = getRedisConnection();
  if (!connection) return null;

  decayScanQueue = new Queue<DecayScanJobData>(QUEUE_NAMES.DECAY_SCAN, {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "fixed", delay: 10000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });

  logger.info("Decay scan queue initialized");
  return decayScanQueue;
}

/**
 * Close all queue instances gracefully.
 */
export async function closeAllQueues(): Promise<void> {
  const queues = [aiProcessingQueue, digestQueue, decayScanQueue].filter(Boolean);
  await Promise.all(queues.map((q) => q!.close()));
  aiProcessingQueue = null;
  digestQueue = null;
  decayScanQueue = null;
  logger.info("All queues closed");
}

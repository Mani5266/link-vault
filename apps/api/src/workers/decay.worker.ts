import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../config/redis";
import { logger } from "../utils/logger";
import { supabaseAdmin } from "../config/supabase";
import type { DecayScanJobData } from "../queues";
import { QUEUE_NAMES, getDecayScanQueue } from "../queues";

// ============================================================
// Content Decay Worker — Scores links by freshness/staleness
// ============================================================

export interface DecayScore {
  link_id: string;
  score: number; // 0-100, higher = more decayed/stale
  factors: {
    age_days: number;
    never_read: boolean;
    category_decay_rate: string; // "fast" | "medium" | "slow"
  };
}

/**
 * Category-based decay rates.
 * News decays fast, tutorials decay slowly.
 */
const CATEGORY_DECAY_RATES: Record<string, { rate: string; halfLife: number }> = {
  news: { rate: "fast", halfLife: 7 },
  social: { rate: "fast", halfLife: 14 },
  product: { rate: "medium", halfLife: 30 },
  video: { rate: "medium", halfLife: 60 },
  article: { rate: "medium", halfLife: 45 },
  recipe: { rate: "slow", halfLife: 365 },
  tutorial: { rate: "slow", halfLife: 180 },
  tool: { rate: "slow", halfLife: 120 },
  music: { rate: "slow", halfLife: 365 },
  podcast: { rate: "medium", halfLife: 30 },
  other: { rate: "medium", halfLife: 60 },
};

interface DecayResult {
  score: number;
  factors: {
    age_days: number;
    never_read: boolean;
    category_decay_rate: string;
  };
}

function calculateDecayScore(
  createdAt: string,
  category: string | null,
  readingStatus: string | null,
  isPinned: boolean
): DecayResult {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const ageDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));

  const config = CATEGORY_DECAY_RATES[category || "other"] || CATEGORY_DECAY_RATES.other;
  const neverRead = readingStatus !== "read";

  // Exponential decay: score = 100 * (1 - e^(-t/halfLife))
  let score = 100 * (1 - Math.exp(-ageDays / config.halfLife));

  // Boost decay for never-read items (they're more stale)
  if (neverRead) {
    score = Math.min(100, score * 1.3);
  }

  // Pinned items decay slower
  if (isPinned) {
    score = score * 0.5;
  }

  return {
    score: Math.round(score),
    factors: {
      age_days: ageDays,
      never_read: neverRead,
      category_decay_rate: config.rate,
    },
  };
}

async function processDecayScan(job: Job<DecayScanJobData>): Promise<void> {
  const { userId } = job.data;

  logger.info({ userId, jobId: job.id }, "Running decay scan");

  // Fetch all user links
  const { data: links, error } = await supabaseAdmin
    .from("links")
    .select("id, created_at, category, reading_status, is_pinned")
    .eq("user_id", userId);

  if (error || !links) {
    logger.error({ error }, "Failed to fetch links for decay scan");
    throw new Error("Failed to fetch links for decay scan");
  }

  // Calculate decay scores
  const scores: Array<{
    link_id: string;
    user_id: string;
    decay_score: number;
    age_days: number;
    decay_rate: string;
    scanned_at: string;
  }> = [];

  for (const link of links) {
    const result = calculateDecayScore(
      link.created_at,
      link.category,
      link.reading_status,
      link.is_pinned
    );

    scores.push({
      link_id: link.id,
      user_id: userId,
      decay_score: result.score,
      age_days: result.factors.age_days,
      decay_rate: result.factors.category_decay_rate,
      scanned_at: new Date().toISOString(),
    });
  }

  if (scores.length === 0) return;

  // Upsert decay scores (replace existing for this user)
  // Delete old scores first, then insert new
  await supabaseAdmin
    .from("content_decay_scores")
    .delete()
    .eq("user_id", userId);

  // Insert in batches
  const BATCH = 100;
  for (let i = 0; i < scores.length; i += BATCH) {
    const batch = scores.slice(i, i + BATCH);
    const { error: insertError } = await supabaseAdmin
      .from("content_decay_scores")
      .insert(batch);

    if (insertError) {
      logger.error({ insertError, batch: i }, "Failed to insert decay scores batch");
    }
  }

  logger.info(
    { userId, linksScanned: links.length, jobId: job.id },
    "Decay scan complete"
  );
}

// ============================================================
// Scheduled Decay Scan — Daily for all active users
// ============================================================

export async function scheduleDailyDecayScans(): Promise<void> {
  const queue = getDecayScanQueue();
  if (!queue) return;

  const existing = await queue.getRepeatableJobs();
  for (const job of existing) {
    if (job.name === "daily-decay-scan") {
      await queue.removeRepeatableByKey(job.key);
    }
  }

  // Schedule: daily at 3 AM UTC
  await queue.add(
    "daily-decay-scan",
    { userId: "__all__" },
    {
      repeat: {
        pattern: "0 3 * * *", // Daily 3 AM UTC
      },
    }
  );

  logger.info("Daily decay scan schedule registered (3 AM UTC)");
}

// ============================================================
// Worker Lifecycle
// ============================================================

let decayWorker: Worker<DecayScanJobData> | null = null;

export function startDecayWorker(): Worker<DecayScanJobData> | null {
  const connection = getRedisConnection();
  if (!connection) return null;

  decayWorker = new Worker<DecayScanJobData>(
    QUEUE_NAMES.DECAY_SCAN,
    async (job) => {
      if (job.data.userId === "__all__") {
        await scanAllUsers();
      } else {
        await processDecayScan(job);
      }
    },
    {
      connection,
      concurrency: 2,
    }
  );

  decayWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Decay scan job completed");
  });

  decayWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "Decay scan job failed");
  });

  logger.info("Decay scan worker started");
  return decayWorker;
}

async function scanAllUsers(): Promise<void> {
  // Find all distinct user_ids who have links
  const { data, error } = await supabaseAdmin
    .from("links")
    .select("user_id")
    .limit(1000);

  if (error || !data) {
    logger.error({ error }, "Failed to find users for decay scan");
    return;
  }

  const uniqueUserIds = [...new Set(data.map((u: any) => u.user_id))];
  logger.info({ userCount: uniqueUserIds.length }, "Running decay scans for all users");

  const queue = getDecayScanQueue();
  if (!queue) return;

  for (const userId of uniqueUserIds) {
    await queue.add("user-decay-scan", { userId });
  }
}

export async function stopDecayWorker(): Promise<void> {
  if (decayWorker) {
    await decayWorker.close();
    decayWorker = null;
    logger.info("Decay scan worker stopped");
  }
}

// Export for on-demand API use
export { calculateDecayScore };

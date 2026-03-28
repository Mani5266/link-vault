import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../config/redis";
import { AIService } from "../services/ai.service";
import { logger } from "../utils/logger";
import { supabaseAdmin } from "../config/supabase";
import type { DigestJobData } from "../queues";
import { QUEUE_NAMES, getDigestQueue } from "../queues";

// ============================================================
// Digest Worker — Generates and stores weekly digests
// ============================================================

async function processDigestJob(job: Job<DigestJobData>): Promise<void> {
  const { userId, days } = job.data;

  logger.info({ userId, days, jobId: job.id }, "Generating digest");

  try {
    const digest = await AIService.generateDigest(userId, days);

    // Store digest in the digests table
    const { error } = await supabaseAdmin.from("digests").insert({
      user_id: userId,
      summary: digest.summary,
      highlights: digest.highlights,
      themes: digest.themes,
      stats: digest.stats,
      period_days: days,
      period_start: digest.stats.period_start,
      period_end: digest.stats.period_end,
    });

    if (error) {
      logger.error({ error }, "Failed to store digest");
      throw new Error("Failed to store digest");
    }

    logger.info({ userId, jobId: job.id }, "Digest generated and stored");
  } catch (error) {
    logger.error({ error, userId, jobId: job.id }, "Digest generation failed");
    throw error;
  }
}

// ============================================================
// Scheduled Digest — Recurring weekly job for all active users
// ============================================================

export async function scheduleWeeklyDigests(): Promise<void> {
  const queue = getDigestQueue();
  if (!queue) return;

  // Remove any existing repeatable job first
  const existing = await queue.getRepeatableJobs();
  for (const job of existing) {
    if (job.name === "weekly-digest-all") {
      await queue.removeRepeatableByKey(job.key);
    }
  }

  // Schedule: every Monday at 9:00 AM UTC
  await queue.add(
    "weekly-digest-all",
    { userId: "__all__", days: 7 },
    {
      repeat: {
        pattern: "0 9 * * 1", // Monday 9 AM UTC
      },
    }
  );

  logger.info("Weekly digest schedule registered (Mondays 9 AM UTC)");
}

// ============================================================
// Worker Lifecycle
// ============================================================

let digestWorker: Worker<DigestJobData> | null = null;

export function startDigestWorker(): Worker<DigestJobData> | null {
  const connection = getRedisConnection();
  if (!connection) return null;

  digestWorker = new Worker<DigestJobData>(
    QUEUE_NAMES.DIGEST,
    async (job) => {
      // If userId is "__all__", generate for all active users
      if (job.data.userId === "__all__") {
        await generateForAllUsers(job.data.days);
      } else {
        await processDigestJob(job);
      }
    },
    {
      connection,
      concurrency: 2,
    }
  );

  digestWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Digest job completed");
  });

  digestWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "Digest job failed");
  });

  logger.info("Digest worker started");
  return digestWorker;
}

/**
 * Generate digests for all users who have saved links in the period.
 */
async function generateForAllUsers(days: number): Promise<void> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Find users who have saved links in the period
  const { data: users, error } = await supabaseAdmin
    .from("links")
    .select("user_id")
    .gte("created_at", since.toISOString())
    .limit(1000);

  if (error || !users) {
    logger.error({ error }, "Failed to find users for digest");
    return;
  }

  const uniqueUserIds = [...new Set(users.map((u: any) => u.user_id))];
  logger.info({ userCount: uniqueUserIds.length }, "Generating digests for active users");

  const queue = getDigestQueue();
  if (!queue) return;

  // Enqueue individual digest jobs
  for (const userId of uniqueUserIds) {
    await queue.add("user-digest", { userId, days });
  }
}

export async function stopDigestWorker(): Promise<void> {
  if (digestWorker) {
    await digestWorker.close();
    digestWorker = null;
    logger.info("Digest worker stopped");
  }
}

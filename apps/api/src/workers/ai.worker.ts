import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../config/redis";
import { AIService } from "../services/ai.service";
import { LinkService } from "../services/link.service";
import { CollectionService } from "../services/collection.service";
import { logger } from "../utils/logger";
import { supabaseAdmin } from "../config/supabase";
import type { AIProcessingJobData } from "../queues";
import { QUEUE_NAMES } from "../queues";

// ============================================================
// AI Processing Worker
// Processes links through the AI pipeline:
//   1. Summarize URL (title, description, tags, category, emoji)
//   2. Smart Inbox — auto-route to best-matching collection
// ============================================================

async function processAIJob(job: Job<AIProcessingJobData>): Promise<void> {
  const { linkId, userId, url, collectionId } = job.data;

  logger.info({ linkId, url, jobId: job.id }, "Processing AI job");

  try {
    // Mark link as processing
    await supabaseAdmin
      .from("links")
      .update({ processing_status: "processing", updated_at: new Date().toISOString() })
      .eq("id", linkId)
      .eq("user_id", userId);

    // Step 1: AI Summarization
    const aiResult = await AIService.summarizeUrl(url, undefined);

    const updatePayload: Record<string, unknown> = {
      title: aiResult.title,
      description: aiResult.description,
      tags: aiResult.tags,
      category: aiResult.category,
      emoji: aiResult.emoji,
      ai_processed: true,
      processing_status: "complete",
      updated_at: new Date().toISOString(),
    };

    // Step 2: Smart Inbox — auto-route to best collection if none assigned
    if (!collectionId) {
      try {
        const bestCollectionId = await findBestCollection(
          userId,
          aiResult.category,
          aiResult.tags,
          aiResult.title,
          aiResult.description
        );
        if (bestCollectionId) {
          updatePayload.collection_id = bestCollectionId;
          logger.info({ linkId, bestCollectionId }, "Smart Inbox: auto-routed link");
        }
      } catch (routeErr) {
        // Non-critical — don't fail the job
        logger.warn({ routeErr, linkId }, "Smart Inbox routing failed");
      }
    }

    await supabaseAdmin
      .from("links")
      .update(updatePayload)
      .eq("id", linkId)
      .eq("user_id", userId);

    logger.info({ linkId, jobId: job.id }, "AI processing complete");
  } catch (error) {
    logger.error({ error, linkId, jobId: job.id }, "AI processing failed");

    // Mark as failed so frontend can show error state
    await supabaseAdmin
      .from("links")
      .update({ processing_status: "failed", updated_at: new Date().toISOString() })
      .eq("id", linkId)
      .eq("user_id", userId);

    throw error; // Let BullMQ retry
  }
}

// ============================================================
// Smart Inbox — Find best matching collection for a link
// ============================================================

async function findBestCollection(
  userId: string,
  category: string,
  tags: string[],
  title: string,
  description: string
): Promise<string | null> {
  // Fetch user's collections
  const collections = await CollectionService.getCollections(userId);

  if (collections.length === 0) return null;

  // Score each collection based on name similarity to AI analysis
  const searchTerms = [
    category,
    ...tags,
    ...title.toLowerCase().split(/\s+/).slice(0, 5),
  ].map((t) => t.toLowerCase());

  let bestScore = 0;
  let bestId: string | null = null;

  for (const col of collections) {
    if (col.is_default && col.name === "Uncategorized") continue;

    const colName = col.name.toLowerCase();
    const colWords = colName.split(/\s+/);
    let score = 0;

    for (const term of searchTerms) {
      // Exact word match in collection name
      if (colWords.includes(term)) {
        score += 3;
      }
      // Partial match (collection name contains the term)
      else if (colName.includes(term)) {
        score += 2;
      }
      // Term contains collection word
      else if (colWords.some((w) => term.includes(w) && w.length > 2)) {
        score += 1;
      }
    }

    // Category-to-collection name heuristics
    const categoryCollectionMap: Record<string, string[]> = {
      video: ["videos", "watch", "media", "youtube"],
      article: ["articles", "reads", "blog", "reading"],
      recipe: ["recipes", "cooking", "food", "kitchen"],
      product: ["products", "shopping", "buy", "wishlist"],
      tutorial: ["tutorials", "learning", "courses", "education"],
      tool: ["tools", "utilities", "software", "dev"],
      news: ["news", "updates", "current"],
      music: ["music", "audio", "songs", "playlist"],
      podcast: ["podcasts", "audio", "listen"],
      social: ["social", "posts"],
    };

    const categoryHints = categoryCollectionMap[category] || [];
    for (const hint of categoryHints) {
      if (colName.includes(hint)) {
        score += 4;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestId = col.id;
    }
  }

  // Only auto-route if confidence is reasonable (score >= 3)
  return bestScore >= 3 ? bestId : null;
}

// ============================================================
// Worker Lifecycle
// ============================================================

let aiWorker: Worker<AIProcessingJobData> | null = null;

export function startAIWorker(): Worker<AIProcessingJobData> | null {
  const connection = getRedisConnection();
  if (!connection) return null;

  aiWorker = new Worker<AIProcessingJobData>(
    QUEUE_NAMES.AI_PROCESSING,
    processAIJob,
    {
      connection,
      concurrency: 3,
      limiter: {
        max: 10,
        duration: 60000, // 10 jobs per minute (Gemini rate limits)
      },
    }
  );

  aiWorker.on("completed", (job) => {
    logger.info({ jobId: job.id, linkId: job.data.linkId }, "AI job completed");
  });

  aiWorker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, linkId: job?.data.linkId, err: err.message },
      "AI job failed"
    );
  });

  logger.info("AI processing worker started");
  return aiWorker;
}

export async function stopAIWorker(): Promise<void> {
  if (aiWorker) {
    await aiWorker.close();
    aiWorker = null;
    logger.info("AI processing worker stopped");
  }
}

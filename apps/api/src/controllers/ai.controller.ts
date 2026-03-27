import { Request, Response } from "express";
import { AIService } from "../services/ai.service";
import { ApiResponse } from "../utils/apiResponse";
import { isValidUrl } from "@linkvault/shared";
import { logger } from "../utils/logger";

export class AIController {
  /**
   * POST /api/ai/summarize
   * Proxy endpoint for AI URL summarization.
   */
  static async summarize(req: Request, res: Response) {
    try {
      const { url, collection_name } = req.body;

      if (!url || !isValidUrl(url)) {
        ApiResponse.badRequest(res, "A valid URL is required");
        return;
      }

      const summary = await AIService.summarizeUrl(url, collection_name);
      ApiResponse.success(res, summary, "URL analyzed successfully");
    } catch (error: any) {
      logger.error({ error }, "AI summarization endpoint error");
      ApiResponse.error(
        res,
        "AI analysis failed. The link can still be saved with basic metadata.",
        502,
        "AI Service Error"
      );
    }
  }

  /**
   * POST /api/ai/suggest-tags
   * Suggest tags for a URL based on its content.
   */
  static async suggestTags(req: Request, res: Response) {
    try {
      const { url, title, description, existing_tags } = req.body;

      if (!url || !isValidUrl(url)) {
        ApiResponse.badRequest(res, "A valid URL is required");
        return;
      }

      const result = await AIService.suggestTags(url, {
        title,
        description,
        existingTags: existing_tags,
      });

      ApiResponse.success(res, result, "Tag suggestions generated");
    } catch (error: any) {
      logger.error({ error }, "AI tag suggestion endpoint error");
      ApiResponse.error(
        res,
        "Tag suggestion failed.",
        502,
        "AI Service Error"
      );
    }
  }

  /**
   * POST /api/ai/semantic-search
   * Interpret a natural language query into structured search parameters.
   */
  static async semanticSearch(req: Request, res: Response) {
    try {
      const { query } = req.body;

      if (!query || typeof query !== "string" || query.trim().length === 0) {
        ApiResponse.badRequest(res, "A search query is required");
        return;
      }

      const result = await AIService.semanticSearch(query.trim());
      ApiResponse.success(res, result, "Query interpreted successfully");
    } catch (error: any) {
      logger.error({ error }, "AI semantic search endpoint error");
      ApiResponse.error(
        res,
        "Semantic search failed.",
        502,
        "AI Service Error"
      );
    }
  }

  /**
   * POST /api/ai/digest
   * Generate an AI-powered digest of recently saved links.
   */
  static async digest(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id as string;
      const days = req.body.days && Number(req.body.days) > 0
        ? Math.min(Number(req.body.days), 30)
        : 7;

      const result = await AIService.generateDigest(userId, days);
      ApiResponse.success(res, result, "Digest generated successfully");
    } catch (error: any) {
      logger.error({ error }, "AI digest endpoint error");
      ApiResponse.error(
        res,
        "Digest generation failed.",
        502,
        "AI Service Error"
      );
    }
  }
}

import { Request, Response } from "express";
import { ApiResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import { supabaseAdmin } from "../config/supabase";
import type { GraphNode, GraphEdge } from "@linkvault/shared";

export class GraphController {
  /**
   * GET /api/v1/graph
   * Returns a knowledge graph with nodes (links, tags, categories, domains)
   * and edges (connections between them).
   */
  static async getGraph(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const limit = Math.min(Number(req.query.limit) || 200, 500);

      // Fetch user's links
      const { data: links, error } = await supabaseAdmin
        .from("links")
        .select("id, title, url, domain, category, tags, favicon_url, emoji")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        logger.error({ error }, "Failed to fetch links for graph");
        ApiResponse.error(res, "Failed to build graph");
        return;
      }

      if (!links || links.length === 0) {
        ApiResponse.success(res, { nodes: [], edges: [] });
        return;
      }

      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];
      const tagNodes = new Map<string, GraphNode>();
      const categoryNodes = new Map<string, GraphNode>();
      const domainNodes = new Map<string, GraphNode>();

      // Tag co-occurrence weights
      const tagCounts = new Map<string, number>();
      const categoryCounts = new Map<string, number>();
      const domainCounts = new Map<string, number>();

      // Add link nodes
      for (const link of links) {
        nodes.push({
          id: `link:${link.id}`,
          label: link.title || link.domain || link.url,
          type: "link",
          url: link.url,
          size: 4,
        });

        // Process tags
        const tags = link.tags || [];
        for (const tag of tags) {
          const tagKey = tag.toLowerCase();
          tagCounts.set(tagKey, (tagCounts.get(tagKey) || 0) + 1);

          if (!tagNodes.has(tagKey)) {
            tagNodes.set(tagKey, {
              id: `tag:${tagKey}`,
              label: tag,
              type: "tag",
              size: 2,
            });
          }

          // Link -> Tag edge
          edges.push({
            source: `link:${link.id}`,
            target: `tag:${tagKey}`,
            weight: 1,
          });
        }

        // Process category
        if (link.category) {
          categoryCounts.set(
            link.category,
            (categoryCounts.get(link.category) || 0) + 1
          );

          if (!categoryNodes.has(link.category)) {
            categoryNodes.set(link.category, {
              id: `cat:${link.category}`,
              label: link.category,
              type: "category",
              size: 3,
            });
          }

          edges.push({
            source: `link:${link.id}`,
            target: `cat:${link.category}`,
            weight: 1,
          });
        }

        // Process domain
        if (link.domain) {
          domainCounts.set(
            link.domain,
            (domainCounts.get(link.domain) || 0) + 1
          );

          if (!domainNodes.has(link.domain)) {
            domainNodes.set(link.domain, {
              id: `dom:${link.domain}`,
              label: link.domain,
              type: "domain",
              size: 2,
            });
          }

          edges.push({
            source: `link:${link.id}`,
            target: `dom:${link.domain}`,
            weight: 1,
          });
        }
      }

      // Update sizes based on connection count
      for (const [key, node] of tagNodes) {
        node.size = Math.min(2 + (tagCounts.get(key) || 0), 10);
        nodes.push(node);
      }
      for (const [key, node] of categoryNodes) {
        node.size = Math.min(3 + (categoryCounts.get(key) || 0), 12);
        nodes.push(node);
      }
      for (const [key, node] of domainNodes) {
        // Only include domains with 2+ links to reduce noise
        const count = domainCounts.get(key) || 0;
        if (count >= 2) {
          node.size = Math.min(2 + count, 10);
          nodes.push(node);
        } else {
          // Remove edges to single-occurrence domains
          const domId = `dom:${key}`;
          const idx = edges.findIndex((e) => e.target === domId);
          if (idx !== -1) edges.splice(idx, 1);
        }
      }

      ApiResponse.success(res, { nodes, edges });
    } catch (error: any) {
      logger.error({ error }, "Failed to build knowledge graph");
      ApiResponse.error(res, "Failed to build knowledge graph");
    }
  }
}

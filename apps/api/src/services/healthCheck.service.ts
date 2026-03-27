import { supabaseAdmin } from "../config/supabase";
import { logger } from "../utils/logger";
import type { Link, LinkHealthResult, LinkHealthStatus } from "@linkvault/shared";

// ============================================================
// HealthCheckService — Check link liveness via HEAD/GET
// ============================================================

const REQUEST_TIMEOUT_MS = 10_000;
const CONCURRENCY_LIMIT = 10;

export class HealthCheckService {
  /**
   * Check all links for a user and return health results.
   * Uses HEAD requests with GET fallback. Runs in batches of CONCURRENCY_LIMIT.
   */
  static async checkAll(userId: string): Promise<LinkHealthResult[]> {
    // Fetch all user links (no pagination — we need all of them)
    const { data: links, error } = await supabaseAdmin
      .from("links")
      .select("id, url, title, domain, favicon_url")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ error }, "Failed to fetch links for health check");
      throw new Error("Failed to fetch links");
    }

    if (!links || links.length === 0) return [];

    const results: LinkHealthResult[] = [];

    // Process in batches
    for (let i = 0; i < links.length; i += CONCURRENCY_LIMIT) {
      const batch = links.slice(i, i + CONCURRENCY_LIMIT);
      const batchResults = await Promise.all(
        batch.map((link) => HealthCheckService.checkOne(link))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Check a single link's health.
   * Tries HEAD first (lightweight), falls back to GET if HEAD returns 405.
   */
  private static async checkOne(
    link: Pick<Link, "id" | "url" | "title" | "domain" | "favicon_url">
  ): Promise<LinkHealthResult> {
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(link.url, {
          method: "HEAD",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "User-Agent": "LinkVault-HealthChecker/1.0",
          },
        });

        // Some servers reject HEAD — retry with GET
        if (response.status === 405 || response.status === 501) {
          response = await fetch(link.url, {
            method: "GET",
            redirect: "manual",
            signal: controller.signal,
            headers: {
              "User-Agent": "LinkVault-HealthChecker/1.0",
            },
          });
        }
      } finally {
        clearTimeout(timer);
      }

      const elapsed = Date.now() - start;
      const status = HealthCheckService.classifyStatus(response.status);

      return {
        link_id: link.id,
        url: link.url,
        title: link.title,
        domain: link.domain,
        favicon_url: link.favicon_url,
        status,
        http_code: response.status,
        error: null,
        response_time_ms: elapsed,
      };
    } catch (err: any) {
      const elapsed = Date.now() - start;
      const isTimeout =
        err.name === "AbortError" || err.code === "ABORT_ERR";

      return {
        link_id: link.id,
        url: link.url,
        title: link.title,
        domain: link.domain,
        favicon_url: link.favicon_url,
        status: isTimeout ? "timeout" : "error",
        http_code: null,
        error: isTimeout
          ? `Timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
          : err.message || "Network error",
        response_time_ms: elapsed,
      };
    }
  }

  /**
   * Classify an HTTP status code into a health status.
   */
  private static classifyStatus(code: number): LinkHealthStatus {
    if (code >= 200 && code < 300) return "healthy";
    if (code >= 300 && code < 400) return "redirect";
    return "broken";
  }
}

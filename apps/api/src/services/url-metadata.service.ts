import { extractDomain, getFaviconUrl } from "@linkvault/shared";
import { logger } from "../utils/logger";

export interface UrlMetadata {
  domain: string | null;
  favicon_url: string | null;
}

/**
 * Extract basic metadata from a URL without making network requests.
 * Used as a fallback when AI is not available.
 */
export class UrlMetadataService {
  static extract(url: string): UrlMetadata {
    try {
      const domain = extractDomain(url);
      const favicon_url = domain ? getFaviconUrl(domain) : null;

      return { domain, favicon_url };
    } catch (error) {
      logger.warn({ error, url }, "Failed to extract URL metadata");
      return { domain: null, favicon_url: null };
    }
  }
}

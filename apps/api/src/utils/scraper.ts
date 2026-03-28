// ============================================================
// URL Scraper — Fetches a URL and extracts structured metadata
// from the HTML: title, meta description, OG tags, headings,
// and a body text excerpt for AI consumption.
// ============================================================

import * as cheerio from "cheerio";
import { logger } from "./logger";
import { validateUrlForFetch } from "./ssrf";

export interface ScrapedMetadata {
  /** <title> tag content */
  title: string | null;
  /** <meta name="description"> content */
  metaDescription: string | null;
  /** og:title */
  ogTitle: string | null;
  /** og:description */
  ogDescription: string | null;
  /** og:image */
  ogImage: string | null;
  /** og:type (article, video, product, etc.) */
  ogType: string | null;
  /** og:site_name */
  ogSiteName: string | null;
  /** twitter:title */
  twitterTitle: string | null;
  /** twitter:description */
  twitterDescription: string | null;
  /** Collected <h1> and <h2> headings (first few) */
  headings: string[];
  /** Extracted body text (truncated to ~2000 chars for AI context) */
  bodyExcerpt: string;
  /** Canonical URL if present */
  canonicalUrl: string | null;
  /** Keywords meta tag */
  keywords: string | null;
  /** Author meta tag */
  author: string | null;
  /** Published date (from article:published_time or similar) */
  publishedDate: string | null;
}

/**
 * Fetches a URL and extracts metadata from the HTML.
 * Returns null if the fetch fails (timeout, network error, non-HTML content, etc.)
 *
 * Designed to be resilient — never throws, always returns ScrapedMetadata or null.
 */
export async function scrapeUrl(url: string): Promise<ScrapedMetadata | null> {
  try {
    // SSRF protection: validate URL before fetching
    await validateUrlForFetch(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Pretend to be a browser to avoid bot-blocking
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    // Only parse HTML responses
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      logger.info({ url, contentType }, "Skipping non-HTML content");
      return null;
    }

    const html = await response.text();

    // Limit HTML size to prevent memory issues (5MB max)
    if (html.length > 5 * 1024 * 1024) {
      logger.warn({ url, size: html.length }, "HTML too large, truncating");
    }
    const truncatedHtml = html.slice(0, 5 * 1024 * 1024);

    return parseHtml(truncatedHtml);
  } catch (error: any) {
    if (error.name === "AbortError") {
      logger.warn({ url }, "URL scrape timed out after 10s");
    } else {
      logger.warn({ url, error: error.message }, "URL scrape failed");
    }
    return null;
  }
}

/**
 * Parses HTML and extracts structured metadata.
 */
function parseHtml(html: string): ScrapedMetadata {
  const $ = cheerio.load(html);

  // Remove scripts, styles, nav, footer, etc. before extracting text
  $("script, style, noscript, nav, footer, header, aside, iframe, svg").remove();

  // --- Meta tags ---
  const title = $("title").first().text().trim() || null;

  const metaDescription =
    getMeta($, "description") ||
    getMeta($, "Description") ||
    null;

  const ogTitle = getOg($, "og:title");
  const ogDescription = getOg($, "og:description");
  const ogImage = getOg($, "og:image");
  const ogType = getOg($, "og:type");
  const ogSiteName = getOg($, "og:site_name");

  const twitterTitle =
    getMeta($, "twitter:title") ||
    getOg($, "twitter:title");
  const twitterDescription =
    getMeta($, "twitter:description") ||
    getOg($, "twitter:description");

  const canonicalUrl =
    $('link[rel="canonical"]').attr("href") || null;

  const keywords = getMeta($, "keywords");
  const author = getMeta($, "author");
  const publishedDate =
    getOg($, "article:published_time") ||
    getMeta($, "date") ||
    getMeta($, "publish-date") ||
    null;

  // --- Headings ---
  const headings: string[] = [];
  $("h1, h2").each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 2 && headings.length < 8) {
      headings.push(text);
    }
  });

  // --- Body text excerpt ---
  // Get the main content area if identifiable, otherwise fall back to body
  const mainContent =
    $("main").text() ||
    $("article").text() ||
    $('[role="main"]').text() ||
    $(".content").text() ||
    $(".post-content").text() ||
    $(".entry-content").text() ||
    $("body").text();

  // Clean up whitespace and truncate
  const bodyExcerpt = mainContent
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);

  return {
    title,
    metaDescription,
    ogTitle,
    ogDescription,
    ogImage,
    ogType,
    ogSiteName,
    twitterTitle,
    twitterDescription,
    headings,
    bodyExcerpt,
    canonicalUrl,
    keywords,
    author,
    publishedDate,
  };
}

/** Get <meta name="..."> content */
function getMeta($: cheerio.CheerioAPI, name: string): string | null {
  const content =
    $(`meta[name="${name}"]`).attr("content") ||
    $(`meta[name="${name}" i]`).attr("content") ||
    $(`meta[property="${name}"]`).attr("content") ||
    null;
  return content?.trim() || null;
}

/** Get <meta property="..."> content (for OG/Twitter tags) */
function getOg($: cheerio.CheerioAPI, property: string): string | null {
  const content =
    $(`meta[property="${property}"]`).attr("content") ||
    $(`meta[name="${property}"]`).attr("content") ||
    null;
  return content?.trim() || null;
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import {
  extractDomain,
  isSocialMediaUrl,
  type AISummaryResponse,
  type AITagSuggestionResponse,
  type AISemanticSearchResult,
  type AIDigestResponse,
} from "@linkvault/shared";
import { scrapeUrl, type ScrapedMetadata } from "../utils/scraper";
import { supabaseAdmin } from "../config/supabase";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// ============================================================
// System Prompt — Instructs Gemini to produce high-quality
// titles and descriptions from REAL page content so users can
// understand 90% of a link just by reading the card.
// ============================================================

const SYSTEM_PROMPT = `You are LinkVault's AI analyst. Your job is to read the content extracted from a web page and generate metadata so precise that a user can understand 90% of what the link contains just by reading the title and description — without ever opening it.

You will receive:
- The URL
- Extracted page content: the page title, meta description, Open Graph tags, headings, and a body text excerpt
- Optionally, a collection name for context (e.g., "Recipes", "Fitness")

Your task: Generate a JSON response with these fields:

{
  "title": "A clear, specific title that captures the essence of the content (max 100 chars). NOT generic — it should name the specific topic, product, recipe, technique, or subject.",
  "description": "A 2-3 sentence summary that tells the user WHAT the content covers, the KEY takeaways or details, and WHY it's useful. Be specific: include names, numbers, steps, ingredients, prices, or key findings when available. (max 400 chars)",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "category": "video|article|recipe|product|tutorial|social|tool|news|music|podcast|other",
  "emoji": "A single emoji that visually represents the specific content",
  "deadline_at": "ISO 8601 date string if the page mentions a deadline, expiration, due date, closing date, end date, or time-limited offer. null if none found.",
  "deadline_label": "A short human-readable label describing the deadline (e.g. 'Application deadline', 'Sale ends', 'Registration closes', 'Early bird ends', 'Event date'). null if no deadline."
}

Quality rules for title:
- BAD: "Article from Medium" / "YouTube Video" / "Blog Post"
- GOOD: "Build a REST API with Node.js and PostgreSQL" / "15-Min Garlic Butter Shrimp Pasta Recipe" / "Sony WH-1000XM5 Review: Best ANC Headphones 2024"
- The title should be self-explanatory — someone seeing it for the first time should immediately know what the link is about.

Quality rules for description:
- BAD: "This article talks about web development." / "A video about cooking."
- GOOD: "Step-by-step guide to building a production REST API using Express.js, TypeScript, and PostgreSQL. Covers project setup, middleware, auth with JWT, CRUD endpoints, error handling, and deployment to Railway."
- GOOD: "Quick weeknight pasta recipe: sauté garlic in butter, add shrimp (cook 2 min per side), toss with linguine, lemon juice, red pepper flakes, and fresh parsley. Ready in 15 minutes."
- Include the most important details: what, how, key specifics, main conclusions.

Other rules:
- Generate 3-5 relevant tags (lowercase, hyphenated if multi-word).
- Choose the most specific category.
- The emoji should match the SPECIFIC content, not just the category.
- For social media posts where body content is limited, infer from the URL path, hashtags, or any available metadata.
- For product pages, include the product name, brand, and key specs in the description.
- For recipes, mention key ingredients and cooking time.
- For tutorials, list what the reader will learn.
- For news articles, state the key facts/developments.
- For deadline_at: Look for any dates related to deadlines, expirations, application closing dates, sale end dates, event dates, registration deadlines, early-bird cutoffs, etc. Convert to ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ). If only a date is mentioned with no time, use end-of-day (23:59:59Z). If no deadline is found, set to null.
- For deadline_label: Provide a short (2-4 word) label describing what the deadline is for. If no deadline, set to null.
- ALWAYS return valid JSON. No markdown, no explanation — just the JSON object.`;

// ============================================================
// Tag Suggestion Prompt — Focused on generating relevant tags
// ============================================================

const TAG_SUGGESTION_PROMPT = `You are LinkVault's tag suggestion engine. Given a URL and its content, suggest highly relevant tags that would help a user organize and find this link later.

Rules:
- Return 5-8 tags as a JSON object: { "tags": ["tag1", "tag2", ...] }
- Tags should be lowercase, hyphenated if multi-word (e.g., "machine-learning", "web-dev")
- Mix specificity levels: include both broad topics (e.g., "javascript") and specific subjects (e.g., "react-hooks")
- Consider the content's domain, technology, topic, format, and audience
- If existing tags are provided, do NOT repeat them — suggest NEW complementary tags
- Prioritize tags that would be useful for search and categorization
- ALWAYS return valid JSON. No markdown, no explanation — just the JSON object.`;

// ============================================================
// Semantic Search Prompt — Interprets natural language queries
// ============================================================

const SEMANTIC_SEARCH_PROMPT = `You are LinkVault's semantic search engine. A user has a collection of saved web links with titles, descriptions, tags, categories, and domains. Given a natural language query, extract the search intent into structured parameters.

Available categories: video, article, recipe, product, tutorial, social, tool, news, music, podcast, other

Return a JSON object:
{
  "keywords": "search keywords to match against link titles and descriptions (simple words, no operators)",
  "category": "one of the categories above if the query implies a specific type, otherwise omit",
  "tag": "a specific tag if the query mentions one, otherwise omit",
  "is_pinned": true/false only if the query specifically asks about pinned/favorited items, otherwise omit,
  "reading_status": "unread" only if the query asks about unread/to-read items, or "read" if asking about read items, otherwise omit,
  "interpretation": "A short sentence describing what you understood the user is looking for"
}

Examples:
- "react tutorials I saved last week" -> { "keywords": "react", "category": "tutorial", "interpretation": "Looking for React tutorials" }
- "cooking recipes with pasta" -> { "keywords": "pasta", "category": "recipe", "interpretation": "Looking for pasta recipes" }
- "my pinned articles" -> { "keywords": "", "category": "article", "is_pinned": true, "interpretation": "Looking for pinned articles" }
- "videos about machine learning" -> { "keywords": "machine learning", "category": "video", "interpretation": "Looking for machine learning videos" }
- "unread links about javascript" -> { "keywords": "javascript", "reading_status": "unread", "interpretation": "Looking for unread JavaScript links" }
- "tools for web development" -> { "keywords": "web development", "category": "tool", "interpretation": "Looking for web development tools" }

Rules:
- Extract the most useful search keywords — remove filler words like "I saved", "my", "show me", etc.
- Only include category/tag/is_pinned/reading_status if the query clearly implies them
- The "keywords" field should be simple words that would match against titles and descriptions
- ALWAYS return valid JSON. No markdown, no explanation — just the JSON object.`;

// ============================================================
// Weekly Digest Prompt — Summarizes recently saved links
// ============================================================

const DIGEST_PROMPT = `You are LinkVault's weekly digest writer. Given a list of links a user saved recently, produce a concise, insightful digest that helps them reflect on what they've been collecting.

Return a JSON object:
{
  "summary": "A 2-4 sentence editorial-style overview of what the user saved this period. Mention the dominant themes, any interesting patterns, and highlight the breadth or depth of their interests. Write in second person ('You saved...', 'Your collection...').",
  "highlights": [
    { "title": "Link title", "url": "https://...", "reason": "Why this link stands out (1 sentence)" }
  ],
  "themes": ["theme1", "theme2", "theme3"]
}

Rules:
- The summary should read like a magazine editor's note — concise, warm, insightful
- Pick 3-5 highlights: the most interesting, unique, or valuable links from the batch
- For each highlight, explain in one sentence why it stands out
- Identify 3-6 themes/topics that span across the saved links
- If there are very few links (1-3), keep the summary brief and the highlights to just those links
- ALWAYS return valid JSON. No markdown, no explanation — just the JSON object.`;

export class AIService {
  /**
   * Scrape a URL's content, then analyze it with Gemini AI.
   * Returns structured metadata with content-aware titles and descriptions.
   */
  static async summarizeUrl(
    url: string,
    collectionName?: string
  ): Promise<AISummaryResponse> {
    const domain = extractDomain(url);
    const isSocial = isSocialMediaUrl(url);

    // Step 1: Scrape the actual page content
    let scraped: ScrapedMetadata | null = null;
    try {
      scraped = await scrapeUrl(url);
      if (scraped) {
        logger.info(
          { url, hasTitle: !!scraped.title, bodyLen: scraped.bodyExcerpt.length },
          "Page scraped successfully"
        );
      }
    } catch (err) {
      logger.warn({ url, err }, "Scraping failed, proceeding with URL-only analysis");
    }

    // Step 2: Build a rich prompt with real content
    try {
      const userPrompt = AIService.buildPrompt(url, domain, isSocial, collectionName, scraped);

      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: SYSTEM_PROMPT,
      });

      const result = await model.generateContent(userPrompt);
      const response = result.response;
      const text = response.text();

      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn({ text }, "AI response did not contain valid JSON");
        return AIService.getFallback(url, domain, scraped);
      }

      const parsed = JSON.parse(jsonMatch[0]) as AISummaryResponse;

      // Validate required fields
      if (!parsed.title || !parsed.description || !parsed.category) {
        logger.warn({ parsed }, "AI response missing required fields");
        return AIService.getFallback(url, domain, scraped);
      }

      return {
        title: parsed.title.slice(0, 200),
        description: parsed.description.slice(0, 500),
        tags: (parsed.tags || []).slice(0, 5),
        category: parsed.category,
        emoji: parsed.emoji || "🔗",
        deadline_at: parsed.deadline_at || null,
        deadline_label: parsed.deadline_label ? parsed.deadline_label.slice(0, 100) : null,
      };
    } catch (error) {
      logger.error({ error, url }, "AI summarization failed");
      return AIService.getFallback(url, domain, scraped);
    }
  }

  /**
   * Build a detailed prompt including scraped page content.
   */
  private static buildPrompt(
    url: string,
    domain: string | null,
    isSocial: boolean,
    collectionName?: string,
    scraped?: ScrapedMetadata | null
  ): string {
    const parts: string[] = [];

    parts.push(`URL: ${url}`);
    if (domain) parts.push(`Domain: ${domain}`);
    if (isSocial) parts.push(`Note: This is a social media link (likely a reel/short video).`);
    if (collectionName) parts.push(`Collection context: "${collectionName}"`);

    if (scraped) {
      parts.push(`\n--- EXTRACTED PAGE CONTENT ---`);

      // Title sources (most specific first)
      const pageTitle = scraped.ogTitle || scraped.twitterTitle || scraped.title;
      if (pageTitle) parts.push(`Page title: ${pageTitle}`);

      if (scraped.ogSiteName) parts.push(`Site name: ${scraped.ogSiteName}`);
      if (scraped.author) parts.push(`Author: ${scraped.author}`);
      if (scraped.publishedDate) parts.push(`Published: ${scraped.publishedDate}`);
      if (scraped.ogType) parts.push(`Content type: ${scraped.ogType}`);

      // Description sources
      const pageDesc = scraped.ogDescription || scraped.twitterDescription || scraped.metaDescription;
      if (pageDesc) parts.push(`Meta description: ${pageDesc}`);

      if (scraped.keywords) parts.push(`Keywords: ${scraped.keywords}`);

      // Headings give structure
      if (scraped.headings.length > 0) {
        parts.push(`\nPage headings:\n${scraped.headings.map((h) => `  - ${h}`).join("\n")}`);
      }

      // Body text — the most valuable signal
      if (scraped.bodyExcerpt && scraped.bodyExcerpt.length > 50) {
        parts.push(`\nBody text excerpt (first ~2000 chars):\n${scraped.bodyExcerpt}`);
      }

      parts.push(`--- END EXTRACTED CONTENT ---`);
    } else {
      parts.push(`\nNote: Page content could not be fetched. Analyze based on URL structure only.`);
    }

    return parts.join("\n");
  }

  /**
   * Fallback metadata when AI is unavailable.
   * Now uses scraped data to provide better defaults.
   */
  static getFallback(
    url: string,
    domain: string | null,
    scraped?: ScrapedMetadata | null
  ): AISummaryResponse {
    const isSocial = isSocialMediaUrl(url);

    // Use scraped metadata for better fallbacks
    const title =
      scraped?.ogTitle ||
      scraped?.twitterTitle ||
      scraped?.title ||
      (domain ? `Link from ${domain}` : "Saved Link");

    const description =
      scraped?.ogDescription ||
      scraped?.twitterDescription ||
      scraped?.metaDescription ||
      (isSocial
        ? `Social media content saved from ${domain || "unknown platform"}. Open the link to view.`
        : `Content saved from ${domain || "the web"}. Open the link to view.`);

    // Try to derive tags from keywords
    let tags: string[] = [];
    if (scraped?.keywords) {
      tags = scraped.keywords
        .split(",")
        .map((k) => k.trim().toLowerCase().replace(/\s+/g, "-"))
        .filter((k) => k.length > 1 && k.length < 30)
        .slice(0, 4);
    }
    if (tags.length === 0 && domain) {
      tags = [domain.split(".")[0]];
    }

    return {
      title: title.slice(0, 200),
      description: description.slice(0, 500),
      tags,
      category: isSocial ? "social" : "other",
      emoji: isSocial ? "📱" : "🔗",
      deadline_at: null,
      deadline_label: null,
    };
  }

  // ============================================================
  // Tag Suggestion — Focused Gemini prompt for tag recommendations
  // ============================================================

  /**
   * Suggest tags for a URL based on its content and optional context.
   * Returns tags the user doesn't already have on the link.
   */
  static async suggestTags(
    url: string,
    options?: {
      title?: string;
      description?: string;
      existingTags?: string[];
    }
  ): Promise<AITagSuggestionResponse> {
    const domain = extractDomain(url);
    const existingTags = options?.existingTags || [];

    // Step 1: Scrape if we don't have enough context
    let scraped: ScrapedMetadata | null = null;
    if (!options?.title && !options?.description) {
      try {
        scraped = await scrapeUrl(url);
      } catch (err) {
        logger.warn({ url, err }, "Scraping failed for tag suggestion");
      }
    }

    try {
      const parts: string[] = [];
      parts.push(`URL: ${url}`);
      if (domain) parts.push(`Domain: ${domain}`);

      // Use provided context or scraped data
      const title = options?.title || scraped?.ogTitle || scraped?.twitterTitle || scraped?.title;
      const desc = options?.description || scraped?.ogDescription || scraped?.metaDescription;

      if (title) parts.push(`Title: ${title}`);
      if (desc) parts.push(`Description: ${desc}`);

      if (scraped?.headings && scraped.headings.length > 0) {
        parts.push(`Headings: ${scraped.headings.slice(0, 5).join(", ")}`);
      }
      if (scraped?.bodyExcerpt && scraped.bodyExcerpt.length > 50) {
        parts.push(`Content excerpt: ${scraped.bodyExcerpt.slice(0, 1000)}`);
      }
      if (scraped?.keywords) {
        parts.push(`Page keywords: ${scraped.keywords}`);
      }

      if (existingTags.length > 0) {
        parts.push(`\nExisting tags on this link (do NOT repeat these): ${existingTags.join(", ")}`);
      }

      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: TAG_SUGGESTION_PROMPT,
      });

      const result = await model.generateContent(parts.join("\n"));
      const text = result.response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn({ text }, "Tag suggestion response did not contain valid JSON");
        return { suggestions: [] };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const rawTags: string[] = Array.isArray(parsed.tags) ? parsed.tags : [];

      // Filter out existing tags (case-insensitive) and clean up
      const existingLower = new Set(existingTags.map((t) => t.toLowerCase()));
      const suggestions = rawTags
        .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
        .filter((t) => t.length > 1 && t.length < 30 && !existingLower.has(t))
        .slice(0, 8);

      return { suggestions };
    } catch (error) {
      logger.error({ error, url }, "AI tag suggestion failed");
      return { suggestions: [] };
    }
  }

  // ============================================================
  // Semantic Search — Interprets natural language into filters
  // ============================================================

  /**
   * Interpret a natural language query into structured search parameters.
   */
  static async semanticSearch(query: string): Promise<AISemanticSearchResult> {
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: SEMANTIC_SEARCH_PROMPT,
      });

      const result = await model.generateContent(
        `User query: "${query}"`
      );
      const text = result.response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn({ text }, "Semantic search response did not contain valid JSON");
        return {
          keywords: query,
          interpretation: `Searching for "${query}"`,
        };
      }

      const parsed = JSON.parse(jsonMatch[0]) as AISemanticSearchResult;

      return {
        keywords: parsed.keywords || query,
        category: parsed.category || undefined,
        tag: parsed.tag || undefined,
        is_pinned: parsed.is_pinned,
        reading_status: parsed.reading_status || undefined,
        interpretation: parsed.interpretation || `Searching for "${query}"`,
      };
    } catch (error) {
      logger.error({ error, query }, "AI semantic search failed");
      return {
        keywords: query,
        interpretation: `Searching for "${query}"`,
      };
    }
  }

  // ============================================================
  // Weekly Digest — Summarizes recently saved links
  // ============================================================

  /**
   * Generate an AI digest of the user's recently saved links.
   */
  static async generateDigest(
    userId: string,
    days: number = 7
  ): Promise<AIDigestResponse> {
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);

    // Fetch recent links from Supabase
    const { data: links, error } = await supabaseAdmin
      .from("links")
      .select("title, url, description, category, tags, created_at")
      .eq("user_id", userId)
      .gte("created_at", periodStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      logger.error({ error }, "Failed to fetch links for digest");
      throw new Error("Failed to fetch recent links");
    }

    if (!links || links.length === 0) {
      return {
        summary: "You haven't saved any links in the past week. Start collecting interesting content and check back for your personalized digest.",
        highlights: [],
        themes: [],
        stats: {
          total_links: 0,
          categories: {},
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
        },
      };
    }

    // Build stats
    const categories: Record<string, number> = {};
    for (const link of links) {
      const cat = link.category || "other";
      categories[cat] = (categories[cat] || 0) + 1;
    }

    // Build the prompt with link data
    const linkList = links
      .map((l, i) => {
        const parts = [`${i + 1}. "${l.title || "Untitled"}"`];
        parts.push(`   URL: ${l.url}`);
        if (l.description) parts.push(`   Description: ${l.description.slice(0, 150)}`);
        if (l.category) parts.push(`   Category: ${l.category}`);
        if (l.tags && l.tags.length > 0) parts.push(`   Tags: ${l.tags.join(", ")}`);
        return parts.join("\n");
      })
      .join("\n\n");

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: DIGEST_PROMPT,
      });

      const userPrompt = `The user saved ${links.length} links in the past ${days} days.\n\n${linkList}`;

      const result = await model.generateContent(userPrompt);
      const text = result.response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn({ text }, "Digest response did not contain valid JSON");
        return {
          summary: `You saved ${links.length} links this week across various topics. Check your collection to revisit them.`,
          highlights: links.slice(0, 3).map((l) => ({
            title: l.title || "Untitled",
            url: l.url,
            reason: "Recently saved",
          })),
          themes: Object.keys(categories),
          stats: {
            total_links: links.length,
            categories,
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
          },
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        summary: parsed.summary || `You saved ${links.length} links this week.`,
        highlights: Array.isArray(parsed.highlights)
          ? parsed.highlights.slice(0, 5).map((h: { title?: string; url?: string; reason?: string }) => ({
              title: h.title || "Untitled",
              url: h.url || "",
              reason: h.reason || "",
            }))
          : [],
        themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 6) : [],
        stats: {
          total_links: links.length,
          categories,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
        },
      };
    } catch (err) {
      logger.error({ err }, "AI digest generation failed");
      return {
        summary: `You saved ${links.length} links this week. Here's a quick look at what you've been collecting.`,
        highlights: links.slice(0, 3).map((l) => ({
          title: l.title || "Untitled",
          url: l.url,
          reason: "Recently saved",
        })),
        themes: Object.keys(categories),
        stats: {
          total_links: links.length,
          categories,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
        },
      };
    }
  }
}

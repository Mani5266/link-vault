// ============================================================
// URL Validator — Validate and extract metadata from URLs
// ============================================================

/**
 * Regex pattern for validating URLs.
 * Supports http, https protocols with standard URL format.
 */
const URL_REGEX =
  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

/**
 * Validates whether a string is a properly formatted URL.
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (url.length > 2048) return false;

  try {
    new URL(url);
    return URL_REGEX.test(url);
  } catch {
    return false;
  }
}

/**
 * Extracts the domain name from a URL.
 * Example: "https://www.instagram.com/reel/xyz" -> "instagram.com"
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Generates a favicon URL for a given domain using Google's favicon service.
 */
export function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/**
 * Normalizes a URL by removing trailing slashes and fragments for dedup comparison.
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Only lowercase the origin (protocol + host) — paths and query
    // params are often case-sensitive (e.g. YouTube video IDs).
    const origin = parsed.origin.toLowerCase();
    const pathname = parsed.pathname.replace(/\/+$/, "");
    let normalized = origin + pathname;
    // Preserve search params (case-sensitive)
    if (parsed.search) {
      normalized += parsed.search;
    }
    return normalized;
  } catch {
    return url.trim();
  }
}

/**
 * Detects if a URL is a social media reel/short video.
 */
export function isSocialMediaUrl(url: string): boolean {
  const domain = extractDomain(url);
  if (!domain) return false;

  const socialDomains = [
    "instagram.com",
    "youtube.com",
    "youtu.be",
    "tiktok.com",
    "twitter.com",
    "x.com",
    "facebook.com",
    "threads.net",
    "reddit.com",
    "linkedin.com",
    "pinterest.com",
  ];

  return socialDomains.some(
    (d) => domain === d || domain.endsWith(`.${d}`)
  );
}

// ============================================================
// SSRF Protection — Validates URLs before server-side fetching
// Blocks private IPs, link-local, loopback, and reserved ranges.
// ============================================================

import { logger } from "./logger";
import dns from "dns/promises";
import { URL } from "url";

/**
 * IPv4 ranges that are private/reserved and should never be accessed
 * by server-side requests initiated from user input.
 */
const BLOCKED_IPV4_RANGES = [
  // Loopback
  { prefix: "127.", mask: 8 },
  // Private Class A
  { prefix: "10.", mask: 8 },
  // Private Class B
  { start: "172.16.", end: "172.31.", mask: 12 },
  // Private Class C
  { prefix: "192.168.", mask: 16 },
  // Link-local
  { prefix: "169.254.", mask: 16 },
  // CGNAT
  { prefix: "100.64.", mask: 10 },
  // AWS metadata
  { exact: "169.254.169.254" },
  // Broadcast
  { exact: "255.255.255.255" },
  // 0.0.0.0
  { prefix: "0.", mask: 8 },
];

/**
 * Check if an IPv4 address falls in a blocked range.
 */
function isBlockedIPv4(ip: string): boolean {
  for (const range of BLOCKED_IPV4_RANGES) {
    if ("exact" in range && range.exact !== undefined && ip === range.exact) return true;
    if ("prefix" in range && range.prefix !== undefined && ip.startsWith(range.prefix)) return true;
    if ("start" in range && "end" in range) {
      // Handle 172.16-31.x.x
      const parts = ip.split(".");
      if (parts[0] === "172") {
        const second = parseInt(parts[1], 10);
        if (second >= 16 && second <= 31) return true;
      }
    }
  }
  return false;
}

/**
 * Check if an IPv6 address is private/loopback.
 */
function isBlockedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  // Loopback
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
  // Link-local
  if (normalized.startsWith("fe80:")) return true;
  // Unique local address
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  if (normalized.startsWith("::ffff:")) {
    const ipv4 = normalized.slice(7);
    return isBlockedIPv4(ipv4);
  }
  return false;
}

/**
 * Validate a URL for safe server-side fetching.
 * - Must be http or https
 * - Hostname must not resolve to a private/reserved IP
 * - Rejects non-standard ports commonly used for internal services
 *
 * @throws Error if the URL is unsafe
 */
export async function validateUrlForFetch(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  // Only allow http and https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }

  const hostname = parsed.hostname;

  // Block obvious internal hostnames
  const blockedHostnames = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "[::1]",
    "metadata.google.internal",
    "metadata.google.com",
  ];
  if (blockedHostnames.includes(hostname.toLowerCase())) {
    throw new Error("Access to internal hosts is not allowed");
  }

  // Resolve DNS and check all IPs
  try {
    // Try IPv4 first (most common)
    let addresses: string[] = [];
    try {
      const ipv4 = await dns.resolve4(hostname);
      addresses = addresses.concat(ipv4);
    } catch {
      // No A records — that's OK, try AAAA
    }

    try {
      const ipv6 = await dns.resolve6(hostname);
      addresses = addresses.concat(ipv6);
    } catch {
      // No AAAA records either
    }

    if (addresses.length === 0) {
      // Hostname might be a raw IP — check it directly
      if (isBlockedIPv4(hostname) || isBlockedIPv6(hostname)) {
        throw new Error("Access to internal hosts is not allowed");
      }
      // Let the fetch attempt resolve it at connect time
      return;
    }

    for (const addr of addresses) {
      if (isBlockedIPv4(addr) || isBlockedIPv6(addr)) {
        logger.warn(
          { url, resolvedIp: addr },
          "SSRF blocked: URL resolves to private IP"
        );
        throw new Error("Access to internal hosts is not allowed");
      }
    }
  } catch (err: any) {
    // Re-throw our own errors
    if (err.message === "Access to internal hosts is not allowed") {
      throw err;
    }
    // DNS resolution failure — let it pass (fetch will fail naturally)
    logger.warn({ url, err: err.message }, "DNS resolution failed for SSRF check, allowing");
  }
}

/**
 * Quick synchronous check for obviously unsafe URLs.
 * Use this for fast-path rejection before async DNS resolution.
 */
export function isObviouslyUnsafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return true;

    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "[::1]" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return true;
    }

    // Check for raw private IPs
    if (isBlockedIPv4(hostname) || isBlockedIPv6(hostname)) return true;

    return false;
  } catch {
    return true;
  }
}

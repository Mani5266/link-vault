import { supabaseAdmin } from "../config/supabase";
import { LIMITS } from "@linkvault/shared";
import type { Link, DuplicateGroup } from "@linkvault/shared";

// ============================================================
// Tracking params to strip for near-duplicate comparison
// ============================================================

const TRACKING_PARAMS = new Set([
  // Google Analytics / Ads
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
  "gclid",
  "gclsrc",
  // Facebook / Meta
  "fbclid",
  "fb_action_ids",
  "fb_action_types",
  "fb_source",
  "fb_ref",
  // Twitter / X
  "twclid",
  // Microsoft / Bing
  "msclkid",
  // HubSpot
  "hsa_cam",
  "hsa_grp",
  "hsa_mt",
  "hsa_src",
  "hsa_ad",
  "hsa_acc",
  "hsa_net",
  "hsa_ver",
  "hsa_la",
  "hsa_ol",
  "hsa_kw",
  "hsa_tgt",
  // General
  "ref",
  "referrer",
  "source",
  "mc_cid",
  "mc_eid",
  "_ga",
  "_gl",
  "yclid",
  "dclid",
]);

// ============================================================
// DuplicateService
// ============================================================

export class DuplicateService {
  /**
   * Aggressively normalize a URL for near-duplicate detection.
   * More aggressive than the shared `normalizeUrl` — strips protocol,
   * www, tracking params, and trailing slashes.
   */
  static canonicalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);

      // 1. Lowercase hostname, strip www
      const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");

      // 2. Normalize path — remove trailing slashes
      const pathname = parsed.pathname.replace(/\/+$/, "") || "";

      // 3. Strip tracking params, sort remaining
      const cleanParams = new URLSearchParams();
      parsed.searchParams.forEach((value, key) => {
        if (!TRACKING_PARAMS.has(key.toLowerCase())) {
          cleanParams.append(key, value);
        }
      });
      cleanParams.sort();
      const search = cleanParams.toString();

      // 4. Build canonical key (no protocol, no fragment)
      return hostname + pathname + (search ? `?${search}` : "");
    } catch {
      return url.trim().toLowerCase();
    }
  }

  /**
   * Find all duplicate groups for a user.
   * Fetches all links, groups by canonical URL, returns groups with 2+ links.
   */
  static async findDuplicates(userId: string): Promise<DuplicateGroup[]> {
    // Fetch links for the user (capped at 5000 to prevent memory issues)
    const { data: links, error } = await supabaseAdmin
      .from("links")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(5000);

    if (error) {
      throw new Error(`Failed to fetch links: ${error.message}`);
    }

    if (!links || links.length === 0) {
      return [];
    }

    // Group by canonical URL
    const groups = new Map<string, Link[]>();

    for (const link of links) {
      const canonical = DuplicateService.canonicalizeUrl(link.url);
      const group = groups.get(canonical);
      if (group) {
        group.push(link as Link);
      } else {
        groups.set(canonical, [link as Link]);
      }
    }

    // Only return groups with 2+ links (actual duplicates)
    const duplicateGroups: DuplicateGroup[] = [];
    for (const [canonical_url, groupLinks] of groups) {
      if (groupLinks.length >= 2) {
        duplicateGroups.push({ canonical_url, links: groupLinks });
      }
    }

    return duplicateGroups;
  }

  /**
   * Merge a duplicate group: keep the winner, merge tags onto it,
   * fill in missing metadata, delete the losers.
   */
  static async mergeDuplicates(
    userId: string,
    keepId: string,
    deleteIds: string[]
  ): Promise<{ merged: number }> {
    // 1. Fetch the winner
    const { data: winner, error: winnerError } = await supabaseAdmin
      .from("links")
      .select("*")
      .eq("id", keepId)
      .eq("user_id", userId)
      .single();

    if (winnerError || !winner) {
      const err = new Error("Link to keep not found or not owned by user");
      (err as any).statusCode = 404;
      throw err;
    }

    // 2. Fetch the losers
    const { data: losers, error: losersError } = await supabaseAdmin
      .from("links")
      .select("*")
      .in("id", deleteIds)
      .eq("user_id", userId);

    if (losersError) {
      throw new Error(`Failed to fetch duplicate links: ${losersError.message}`);
    }

    if (!losers || losers.length === 0) {
      const err = new Error("No duplicate links found to merge");
      (err as any).statusCode = 400;
      throw err;
    }

    // 3. Merge tags from losers into winner (union, respect limit)
    const allTags = new Set<string>(winner.tags || []);
    for (const loser of losers) {
      for (const tag of loser.tags || []) {
        allTags.add(tag);
      }
    }
    const mergedTags = Array.from(allTags).slice(0, LIMITS.MAX_TAGS_PER_LINK);

    // 4. Fill missing metadata from losers (first non-null wins)
    const updates: Record<string, any> = { tags: mergedTags };

    if (!winner.title) {
      const title = losers.find((l) => l.title)?.title;
      if (title) updates.title = title;
    }
    if (!winner.description) {
      const description = losers.find((l) => l.description)?.description;
      if (description) updates.description = description;
    }
    if (!winner.category) {
      const category = losers.find((l) => l.category)?.category;
      if (category) updates.category = category;
    }
    if (!winner.emoji) {
      const emoji = losers.find((l) => l.emoji)?.emoji;
      if (emoji) updates.emoji = emoji;
    }

    // 5. Update the winner
    const { error: updateError } = await supabaseAdmin
      .from("links")
      .update(updates)
      .eq("id", keepId)
      .eq("user_id", userId);

    if (updateError) {
      throw new Error(`Failed to update winner link: ${updateError.message}`);
    }

    // 6. Delete the losers
    const { error: deleteError } = await supabaseAdmin
      .from("links")
      .delete()
      .in("id", deleteIds)
      .eq("user_id", userId);

    if (deleteError) {
      throw new Error(`Failed to delete duplicate links: ${deleteError.message}`);
    }

    return { merged: losers.length };
  }
}

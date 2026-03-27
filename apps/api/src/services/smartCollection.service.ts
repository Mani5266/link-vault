import { supabaseAdmin } from "../config/supabase";
import { logger } from "../utils/logger";
import type {
  SmartCollection,
  SmartCollectionInput,
  SmartCollectionUpdate,
  SmartCollectionRule,
  Link,
} from "@linkvault/shared";

// ============================================================
// SmartCollectionService — CRUD + rule-based link querying
// ============================================================

export class SmartCollectionService {
  /** List all smart collections for a user with link counts. */
  static async getAll(userId: string): Promise<SmartCollection[]> {
    const { data, error } = await supabaseAdmin
      .from("smart_collections")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ error }, "Failed to fetch smart collections");
      throw new Error("Failed to fetch smart collections");
    }

    // Compute link counts
    const collections = (data || []) as SmartCollection[];
    for (const sc of collections) {
      const { count } = await SmartCollectionService.queryLinks(userId, sc.rules, sc.match_mode, true);
      sc.link_count = count;
    }

    return collections;
  }

  /** Get a single smart collection by ID. */
  static async getById(userId: string, id: string): Promise<SmartCollection | null> {
    const { data, error } = await supabaseAdmin
      .from("smart_collections")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      logger.error({ error }, "Failed to fetch smart collection");
      throw new Error("Failed to fetch smart collection");
    }

    return data as SmartCollection;
  }

  /** Create a smart collection. */
  static async create(userId: string, input: SmartCollectionInput): Promise<SmartCollection> {
    const { data, error } = await supabaseAdmin
      .from("smart_collections")
      .insert({
        user_id: userId,
        name: input.name,
        emoji: input.emoji || "",
        rules: input.rules,
        match_mode: input.match_mode || "all",
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, "Failed to create smart collection");
      throw new Error("Failed to create smart collection");
    }

    return data as SmartCollection;
  }

  /** Update a smart collection. */
  static async update(
    userId: string,
    id: string,
    updates: SmartCollectionUpdate
  ): Promise<SmartCollection> {
    const { data, error } = await supabaseAdmin
      .from("smart_collections")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      logger.error({ error }, "Failed to update smart collection");
      throw new Error("Failed to update smart collection");
    }

    return data as SmartCollection;
  }

  /** Delete a smart collection. */
  static async delete(userId: string, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("smart_collections")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      logger.error({ error }, "Failed to delete smart collection");
      throw new Error("Failed to delete smart collection");
    }
  }

  /**
   * Query links matching a smart collection's rules.
   * If countOnly is true, returns just the count without fetching all data.
   */
  static async queryLinks(
    userId: string,
    rules: SmartCollectionRule[],
    matchMode: "all" | "any",
    countOnly: boolean = false
  ): Promise<{ links: Link[]; count: number }> {
    if (rules.length === 0) {
      return { links: [], count: 0 };
    }

    // For "any" mode, we need to do separate queries and union.
    // For "all" mode, chain filters.
    if (matchMode === "any") {
      return SmartCollectionService.queryAny(userId, rules, countOnly);
    }

    return SmartCollectionService.queryAll(userId, rules, countOnly);
  }

  /** All rules must match (AND). */
  private static async queryAll(
    userId: string,
    rules: SmartCollectionRule[],
    countOnly: boolean
  ): Promise<{ links: Link[]; count: number }> {
    let query = supabaseAdmin
      .from("links")
      .select(countOnly ? "id" : "*", { count: "exact" })
      .eq("user_id", userId);

    for (const rule of rules) {
      query = SmartCollectionService.applyRule(query, rule);
    }

    query = query.order("created_at", { ascending: false });

    if (countOnly) {
      query = query.limit(0);
    }

    const { data, count, error } = await query;

    if (error) {
      logger.error({ error }, "Failed to query smart collection links");
      return { links: [], count: 0 };
    }

    return {
      links: countOnly ? [] : (data || []) as Link[],
      count: count || 0,
    };
  }

  /** Any rule can match (OR). */
  private static async queryAny(
    userId: string,
    rules: SmartCollectionRule[],
    countOnly: boolean
  ): Promise<{ links: Link[]; count: number }> {
    // Build OR filter parts
    const orParts: string[] = [];

    for (const rule of rules) {
      const part = SmartCollectionService.ruleToOrFilter(rule);
      if (part) orParts.push(part);
    }

    if (orParts.length === 0) {
      return { links: [], count: 0 };
    }

    let query = supabaseAdmin
      .from("links")
      .select(countOnly ? "id" : "*", { count: "exact" })
      .eq("user_id", userId)
      .or(orParts.join(","));

    query = query.order("created_at", { ascending: false });

    if (countOnly) {
      query = query.limit(0);
    }

    const { data, count, error } = await query;

    if (error) {
      logger.error({ error }, "Failed to query smart collection links (any)");
      return { links: [], count: 0 };
    }

    return {
      links: countOnly ? [] : (data || []) as Link[],
      count: count || 0,
    };
  }

  /** Apply a single rule as a chained filter (for AND mode). */
  private static applyRule(query: any, rule: SmartCollectionRule): any {
    const { field, operator, value } = rule;

    switch (field) {
      case "category":
        if (operator === "equals") return query.eq("category", value);
        if (operator === "not_equals") return query.neq("category", value);
        return query.ilike("category", `%${value}%`);

      case "domain":
        if (operator === "equals") return query.eq("domain", value);
        if (operator === "not_equals") return query.neq("domain", value);
        return query.ilike("domain", `%${value}%`);

      case "tag":
        if (operator === "equals" || operator === "contains") {
          return query.contains("tags", [value]);
        }
        // not_equals: doesn't contain this tag — negate via not
        return query.not("tags", "cs", `{${value}}`);

      case "is_pinned":
        return query.eq("is_pinned", value === "true");

      case "reading_status":
        if (operator === "equals") return query.eq("reading_status", value);
        if (operator === "not_equals") return query.neq("reading_status", value);
        return query;

      default:
        return query;
    }
  }

  /** Convert a rule to a PostgREST OR filter string. */
  private static ruleToOrFilter(rule: SmartCollectionRule): string | null {
    const { field, operator, value } = rule;

    switch (field) {
      case "category":
        if (operator === "equals") return `category.eq.${value}`;
        if (operator === "not_equals") return `category.neq.${value}`;
        return `category.ilike.%${value}%`;

      case "domain":
        if (operator === "equals") return `domain.eq.${value}`;
        if (operator === "not_equals") return `domain.neq.${value}`;
        return `domain.ilike.%${value}%`;

      case "tag":
        if (operator === "equals" || operator === "contains") {
          return `tags.cs.{${value}}`;
        }
        return null; // NOT in OR mode is complex, skip

      case "is_pinned":
        return `is_pinned.eq.${value}`;

      case "reading_status":
        if (operator === "equals") return `reading_status.eq.${value}`;
        if (operator === "not_equals") return `reading_status.neq.${value}`;
        return null;

      default:
        return null;
    }
  }
}

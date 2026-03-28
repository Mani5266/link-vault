/**
 * Input validation utilities for route params and request bodies.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns true if the value is a valid UUID v4 format.
 */
export function isUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Extract a route param safely (Express v5 returns string | string[]).
 * Returns the string value or null if it's not a valid UUID.
 */
export function getValidUUIDParam(param: string | string[] | undefined): string | null {
  const value = Array.isArray(param) ? param[0] : param;
  if (!value || !isUUID(value)) return null;
  return value;
}

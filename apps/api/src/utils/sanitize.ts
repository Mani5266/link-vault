// ============================================================
// PostgREST Filter Sanitization
// Escapes special characters in user input before interpolation
// into PostgREST filter strings (.or(), .ilike(), etc.)
// ============================================================

/**
 * Characters that have special meaning in PostgREST filter syntax:
 * - `,` separates OR conditions
 * - `.` separates column.operator.value
 * - `(` and `)` group conditions
 * - `%` is a wildcard in ILIKE patterns (we want literal matching of user input)
 * - `*` is a wildcard in PostgREST full-text search
 * - `\` is an escape character
 */

/**
 * Escape user input for safe use in PostgREST .or() filter strings.
 * Prevents filter injection attacks where user input like:
 *   `%,user_id.eq.other-uuid`
 * could inject additional filter conditions.
 */
export function escapePostgrestValue(value: string): string {
  // Replace backslash first (before adding more), then special chars
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/\./g, "\\.")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/**
 * Escape user input for safe use in ILIKE patterns.
 * Escapes SQL LIKE wildcards so user input is treated literally.
 */
export function escapeIlikeValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

/**
 * Escape user input for safe use in PostgREST .or() filter strings
 * that include ILIKE patterns.
 * Combines both PostgREST special chars AND SQL LIKE wildcards.
 */
export function escapePostgrestIlike(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/\./g, "\\.")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

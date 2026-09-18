/**
 * Input sanitization helpers.
 * All user-supplied values pass through these before use in queries.
 */

/**
 * Strips characters that could be used for SQL injection when
 * values are interpolated into LIKE patterns.
 * Supabase/PostgREST uses parameterized queries — this is a defense-in-depth measure.
 */
export function sanitizeLikePattern(value: string): string {
  // Escape PostgreSQL LIKE special chars
  return value.replace(/[%_\\]/g, "\\$&").trim();
}

/**
 * Ensures a string is a valid UUID v4.
 * Use before trusting any ID that came from a request parameter.
 */
export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

/**
 * Validates that a string is a safe sort column name
 * (alphanumeric + underscores only — no injection vectors).
 */
export function isValidSortColumn(value: string, allowed: string[]): boolean {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) return false;
  return allowed.includes(value);
}

/**
 * Strips HTML tags from a string — basic XSS defense for free-text fields.
 */
export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

/**
 * Trims and truncates a string to a max length.
 */
export function clampString(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

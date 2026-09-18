/**
 * Simple in-memory rate limiter for API routes.
 * For production, replace with Redis-based rate limiting
 * (e.g., @upstash/ratelimit) to work across multiple instances.
 *
 * Used primarily on the login endpoint to slow brute-force attempts.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 60_000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key (e.g., IP address or employee ID).
 * @param key     Identifier to rate-limit (IP, employee ID, etc.)
 * @param limit   Max requests allowed in the window
 * @param windowMs Window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    // New window
    const entry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { allowed: true, remaining: limit - 1, resetAt: entry.resetAt };
  }

  existing.count += 1;
  const allowed = existing.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/**
 * Returns a NextResponse-compatible 429 body.
 */
export function rateLimitExceededResponse() {
  return {
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests. Please wait before trying again.",
    },
  };
}

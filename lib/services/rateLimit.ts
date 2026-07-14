/**
 * In-memory sliding-window rate limiter (MVP). Per-instance only — swap for a
 * shared store (e.g. Upstash) in production. Abstraction kept small on purpose.
 */
const hits = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const windowStart = now - windowMs;
  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    const retryAfterMs = timestamps[0] + windowMs - now;
    hits.set(key, timestamps);
    return { ok: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return { ok: true, remaining: limit - timestamps.length, retryAfterMs: 0 };
}

/** Test/maintenance helper. */
export function _resetRateLimit() {
  hits.clear();
}

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function maybeCleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
  lastCleanup = now;
}

export type RateLimitResult = { allowed: boolean; resetInMs: number };

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  maybeCleanup(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, resetInMs: windowMs };
  }
  if (b.count >= limit) return { allowed: false, resetInMs: b.resetAt - now };
  b.count += 1;
  return { allowed: true, resetInMs: b.resetAt - now };
}

export function _resetRateLimitForTests(): void {
  buckets.clear();
  lastCleanup = Date.now();
}

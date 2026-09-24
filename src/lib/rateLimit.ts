// In-memory sliding-window rate limiter. One Node process serves the site, so memory is enough;
// HAProxy stick tables are the primary control at the edge, this is defense in depth.

interface Options {
  limit: number;
  windowMs: number;
  now?: () => number;
}

export function createRateLimiter({ limit, windowMs, now = Date.now }: Options) {
  const hits = new Map<string, number[]>();

  const prune = (t: number) => {
    for (const [key, times] of hits) {
      if (times[times.length - 1] <= t - windowMs) hits.delete(key);
    }
  };

  return {
    /** Records an attempt for `key`; returns false when the key is over its limit. */
    check(key: string): boolean {
      const t = now();
      prune(t);
      const recent = (hits.get(key) ?? []).filter((time) => time > t - windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(t);
      hits.set(key, recent);
      return true;
    },
    size: () => hits.size,
  };
}

/**
 * Client IP for rate limiting. HAProxy (the only ingress) appends the real peer address to
 * X-Forwarded-For, so the LAST hop is trustworthy; earlier hops are client-supplied and spoofable.
 */
export function clientIp(headers: Headers, fallback: string): string {
  const last = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return last || fallback;
}

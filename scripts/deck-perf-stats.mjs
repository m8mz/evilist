// Frame-time arithmetic for scripts/deck-perf.mjs (deck spec §11), kept pure so vitest can pin it.

/** Linear-interpolated percentile over an ascending list; 0 for an empty list. */
export function percentile(sortedMs, p) {
  if (sortedMs.length === 0) return 0;
  const pos = (sortedMs.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const w = pos - lo;
  return sortedMs[lo] * (1 - w) + sortedMs[hi] * w;
}

export const LONG_FRAME_MS = 50;

/** From requestAnimationFrame timestamps to durations: p50, p95, long frames (> 50 ms) and the max. */
export function frameStats(timestamps) {
  if (timestamps.length < 2) return { frames: 0, p50: 0, p95: 0, long: 0, max: 0 };
  const d = [];
  for (let i = 1; i < timestamps.length; i++) d.push(timestamps[i] - timestamps[i - 1]);
  const sorted = [...d].sort((a, b) => a - b);
  return {
    frames: d.length,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    long: d.filter((x) => x > LONG_FRAME_MS).length,
    max: sorted[sorted.length - 1],
  };
}

import { describe, expect, it } from "vitest";
import { clientIp, createRateLimiter } from "../src/lib/rateLimit";

describe("createRateLimiter", () => {
  it("allows up to the limit within the window, then blocks", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => now });
    expect([1, 2, 3].map(() => limiter.check("1.2.3.4"))).toEqual([true, true, true]);
    expect(limiter.check("1.2.3.4")).toBe(false);
  });

  it("tracks keys independently", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => 0 });
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("b")).toBe(true);
    expect(limiter.check("a")).toBe(false);
  });

  it("slides: old hits expire after the window", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 1_000, now: () => now });
    limiter.check("k");
    now = 500;
    limiter.check("k");
    expect(limiter.check("k")).toBe(false);
    now = 1_001; // first hit expired, second still counts
    expect(limiter.check("k")).toBe(true);
    expect(limiter.check("k")).toBe(false);
  });

  it("does not count blocked attempts against future windows", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: () => now });
    limiter.check("k");
    limiter.check("k"); // blocked
    now = 1_001;
    expect(limiter.check("k")).toBe(true);
  });

  it("forgets idle keys so memory stays bounded", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: () => now });
    for (let i = 0; i < 100; i++) limiter.check(`ip-${i}`);
    now = 5_000;
    limiter.check("new");
    expect(limiter.size()).toBe(1);
  });
});

describe("clientIp", () => {
  it("uses the last X-Forwarded-For hop, the one our proxy appended", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.9" });
    expect(clientIp(headers, "10.0.0.2")).toBe("203.0.113.9");
  });

  it("ignores client-supplied hops, so a spoofed header can't dodge the limit", () => {
    // Attacker sends "X-Forwarded-For: 1.1.1.1"; HAProxy appends the real address.
    const headers = new Headers({ "x-forwarded-for": "1.1.1.1, 198.51.100.7" });
    expect(clientIp(headers, "10.0.0.2")).toBe("198.51.100.7");
  });

  it("falls back to the socket address when the header is missing or blank", () => {
    expect(clientIp(new Headers(), "198.51.100.1")).toBe("198.51.100.1");
    expect(clientIp(new Headers({ "x-forwarded-for": " " }), "198.51.100.1")).toBe("198.51.100.1");
  });
});

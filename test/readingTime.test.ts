import { describe, expect, it } from "vitest";
import { readingMinutes } from "../src/lib/readingTime";

describe("readingMinutes", () => {
  it("rounds up at ~220 words per minute", () => {
    expect(readingMinutes("word ".repeat(221))).toBe(2);
  });

  it("never reports less than a minute", () => {
    expect(readingMinutes("")).toBe(1);
  });

  it("ignores markdown syntax and code fences when counting", () => {
    const md = "# Title\n\n```sh\nls -la /etc/haproxy\n```\n\n**Bold** words here.";
    expect(readingMinutes(md)).toBe(1);
  });
});

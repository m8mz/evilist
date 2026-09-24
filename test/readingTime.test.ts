import { describe, expect, it } from "vitest";
import { readingTime } from "../src/lib/readingTime";

describe("readingTime", () => {
  it("rounds up at ~220 words per minute", () => {
    expect(readingTime("word ".repeat(221))).toBe("2 min read");
  });

  it("never reports less than a minute", () => {
    expect(readingTime("")).toBe("1 min read");
  });

  it("ignores markdown syntax and code fences when counting", () => {
    const md = "# Title\n\n```sh\nls -la /etc/haproxy\n```\n\n**Bold** words here.";
    expect(readingTime(md)).toBe("1 min read");
  });
});

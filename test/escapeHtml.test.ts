import { describe, expect, it } from "vitest";
import { escapeHtml, textToHtml } from "../src/lib/escapeHtml";

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;",
    );
  });

  it("neutralizes a script injection", () => {
    expect(escapeHtml("<script>alert(1)</script>")).not.toContain("<script>");
  });

  it("does not double-escape existing entities incorrectly", () => {
    expect(escapeHtml("&amp;")).toBe("&amp;amp;");
  });
});

describe("textToHtml", () => {
  it("escapes first, then turns newlines into <br>", () => {
    expect(textToHtml("hi <b>\nthere")).toBe("hi &lt;b&gt;<br>there");
  });

  it("handles Windows line endings", () => {
    expect(textToHtml("a\r\nb")).toBe("a<br>b");
  });
});

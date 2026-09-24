import { describe, expect, it } from "vitest";
import About from "../../src/components/home/About.astro";
import { render } from "../render";

describe("About", () => {
  it("says Marcus lifts for his health, and no longer mentions basketball", async () => {
    const html = await render(About);
    expect(html).toContain("Outside work I lift for my health, not for a platform");
    expect(html).toContain("Solo Leveling is why the ranks on this site are letters.");
    expect(html).not.toMatch(/basketball/i);
  });
});

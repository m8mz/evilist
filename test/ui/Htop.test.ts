import { describe, expect, it } from "vitest";
import Htop from "../../src/components/home/Htop.astro";
import { htop } from "../../src/data/htop";
import { METER_WIDTH } from "../../src/scripts/htop";
import { render } from "../render";

describe("Htop", () => {
  it("frames the screen and says it is simulated", async () => {
    const html = await render(Htop);
    expect(html).toContain("htop · evilist");
    expect(html).toMatch(/class="htop__screen[^"]*"[^>]*aria-hidden="true"/);
    expect(html).toMatch(/<figcaption[^>]*>A simulated htop/);
  });
});

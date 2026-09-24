import { describe, expect, it } from "vitest";
import Icon from "../../src/components/ui/Icon.astro";
import { render } from "../render";

describe("Icon", () => {
  it.each(["tower", "controller", "play", "dumbbell", "arrow"] as const)(
    "draws %s as a decorative 16px line icon",
    async (name) => {
      const html = await render(Icon, { props: { name } });
      expect(html).toMatch(/<svg class="icon[^"]*"[^>]*viewBox="0 0 16 16"/);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('focusable="false"');
      expect(html).toMatch(/<(path|rect|circle) /);
    },
  );
});

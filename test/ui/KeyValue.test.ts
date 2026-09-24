import { describe, expect, it } from "vitest";
import KeyValue from "../../src/components/ui/KeyValue.astro";
import { render } from "../render";

describe("KeyValue", () => {
  it("renders key: value rows in a definition list", async () => {
    const html = await render(KeyValue, {
      props: { rows: [{ key: "cpu", value: "AMD Ryzen 7 7800X3D" }] },
    });
    expect(html).toContain("<dl");
    expect(html).toContain(">cpu:<");
    expect(html).toContain(">AMD Ryzen 7 7800X3D<");
  });

  it("renders link values with a hidden arrow", async () => {
    const html = await render(KeyValue, {
      props: { rows: [{ key: "more", value: { href: "/now", label: "now" } }] },
    });
    expect(html).toContain('href="/now"');
    expect(html).toMatch(/aria-hidden="true"[^>]*> →</);
    expect(html).not.toContain("noopener");
  });

  it("external links get rel and target", async () => {
    const html = await render(KeyValue, {
      props: {
        rows: [{ key: "code", value: { href: "https://github.com/m8mz", label: "github" } }],
      },
    });
    expect(html).toContain('rel="noopener"');
    expect(html).toContain('target="_blank"');
  });
});

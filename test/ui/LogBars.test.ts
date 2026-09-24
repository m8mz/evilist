import { describe, expect, it } from "vitest";
import LogBars from "../../src/components/ui/LogBars.astro";
import { render } from "../render";

describe("LogBars", () => {
  it("renders one bar per value with heights from the value", async () => {
    const html = await render(LogBars, { props: { values: [0, 0.5, 1], label: "Weeks trained" } });
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Weeks trained"');
    expect(html).toContain("data-log-bars");
    expect(html).toContain('viewBox="0 0 16 24"');
    expect(html).toContain('y="23" width="4" height="1"');
    expect(html).toContain('y="12" width="4" height="12"');
    expect(html).toContain('y="0" width="4" height="24"');
  });

  it("never emits a negative height or a zero-width viewBox", async () => {
    const html = await render(LogBars, { props: { values: [-1, 5, Number.NaN], label: "x" } });
    expect(html.match(/<rect /g)).toHaveLength(3);
    expect(html).not.toMatch(/height="-/);
    expect(html).toContain('viewBox="0 0 16 24"');
    const empty = await render(LogBars, { props: { values: [], label: "empty" } });
    expect(empty).toContain('viewBox="0 0 4 24"');
    expect(empty).not.toContain("<rect ");
  });
});

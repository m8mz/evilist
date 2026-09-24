import { test, expect } from "@playwright/test";

/** Pages that show stills. Task 7 adds "/now". */
const PAGES = ["/"];

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "desktop", "rendition sizes do not depend on the device");
});

test("serves every still rendition, and the img src, under 120 KB", async ({ page, request }) => {
  for (const path of PAGES) {
    await page.goto(path);
    const urls = await page.locator(".still source, .still img").evaluateAll((els) =>
      els.flatMap((el) =>
        (el.getAttribute("srcset") ?? "")
          .split(",")
          .map((candidate) => candidate.trim().split(" ")[0])
          .filter((url): url is string => Boolean(url))
          .concat(el.getAttribute("src") ?? []),
      ),
    );
    expect(urls.length, path).toBeGreaterThan(0);
    for (const url of new Set(urls)) {
      const res = await request.get(url);
      expect(res.ok(), url).toBe(true);
      expect((await res.body()).length, url).toBeLessThanOrEqual(120 * 1024);
    }
  }
});

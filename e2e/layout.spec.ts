import { test, expect } from "@playwright/test";

const routes = ["/", "/now", "/resume", "/notes", "/notes/ten-years-t1-to-architect", "/contact"];
// Matches the 45rem breakpoint in Header.astro (below it, the nav collapses behind a toggle).
const COLLAPSED_NAV_MAX = 720;

for (const route of routes) {
  test(`${route} has header, footer and no horizontal overflow`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator(".site-header")).toBeVisible();
    await expect(page.locator(".site-footer")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("page loads without CSP violations or console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});

test("current page is marked in the nav", async ({ page }) => {
  await page.goto("/notes");
  if (page.viewportSize()!.width < COLLAPSED_NAV_MAX) await page.click("[data-menu-toggle]");
  await expect(page.locator('#site-nav a[href="/notes"]')).toHaveAttribute("aria-current", "page");
});

test("the nav shows Now and keeps one row from tablet up", async ({ page }) => {
  await page.goto("/now");
  if (page.viewportSize()!.width < COLLAPSED_NAV_MAX) await page.click("[data-menu-toggle]");
  const link = page.locator('#site-nav a[href="/now"]');
  await expect(link).toHaveAttribute("aria-current", "page");
  if (page.viewportSize()!.width >= COLLAPSED_NAV_MAX) {
    const tops = await page
      .locator("#site-nav a")
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
  }
});

test("skip link moves focus to main content", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "WebKit does not Tab to links by default");
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test.describe("collapsed navigation (phones)", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 1440) >= COLLAPSED_NAV_MAX, "phone widths only");

  test("toggle opens, Escape closes and returns focus", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator("[data-menu-toggle]");
    const link = page.locator('#site-nav a[href="/resume"]');
    await expect(link).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(link).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(link).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test("brand and toggle share one row", async ({ page }) => {
    await page.goto("/");
    const brand = await page.locator(".brand").boundingBox();
    const toggle = await page.locator("[data-menu-toggle]").boundingBox();
    expect(Math.abs((brand?.y ?? 0) - (toggle?.y ?? 100))).toBeLessThan(20);
  });

  test("the open menu is a carbon sheet", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-menu-toggle]").click();
    await expect(page.locator("#site-nav")).toHaveCSS("background-color", "rgb(17, 17, 17)");
  });
});

test("production build sends a hashed Content-Security-Policy", async ({ request }) => {
  const res = await request.get("/");
  const csp = res.headers()["content-security-policy"] ?? "";
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toMatch(/script-src 'self' 'sha256-/);
  expect(csp).toMatch(/style-src 'self' 'sha256-/);
});

test("a page that opens with a band doesn't double the header's rule", async ({ page }) => {
  for (const path of ["/resume", "/notes", "/contact"]) {
    await page.goto(path);
    await expect(page.locator("main > .band").first(), path).toHaveCSS("border-top-width", "0px");
  }
});

test("every URL the sitemap lists is served as listed, with the CSP", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap-0.xml")).text();
  const listed = [...sitemap.matchAll(/<loc>https:\/\/evilist\.io([^<]*)<\/loc>/g)].map(
    (m) => m[1],
  );
  expect(listed.length).toBeGreaterThan(4);
  // The social card's render target is reachable too, so it needs the policy as well.
  for (const path of [...listed, "/og-card"]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(200);
    expect(res.headers()["content-security-policy"] ?? "", path).toContain("default-src 'self'");
  }
});

test("a trailing slash redirects to the one canonical URL", async ({ request }) => {
  for (const [from, to] of [
    ["/now/", "/now"],
    ["/notes/", "/notes"],
    ["/notes/ten-years-t1-to-architect/", "/notes/ten-years-t1-to-architect"],
  ]) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status(), from).toBe(301);
    expect(res.headers().location, from).toBe(to);
  }
});

test.describe("internal links", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop", "one project is enough");
  });

  test("internal links point straight at their page, with no redirect hop", async ({
    page,
    request,
  }) => {
    const pages = [
      "/",
      "/now",
      "/resume",
      "/notes",
      "/notes/ten-years-t1-to-architect",
      "/notes/building-this-site",
    ];
    for (const path of pages) {
      await page.goto(path);
      const hrefs = await page
        .locator('a[href^="/"]')
        .evaluateAll((links) => [
          ...new Set(links.map((a) => a.getAttribute("href")!.split("#")[0]!).filter(Boolean)),
        ]);
      for (const href of hrefs) {
        const res = await request.get(href, { maxRedirects: 0 });
        expect(res.status(), `${path} → ${href}`).toBe(200);
      }
    }
  });
});

test("footer links are 44px tap targets", async ({ page }) => {
  await page.goto("/");
  const heights = await page
    .locator(".site-footer__links a")
    .evaluateAll((links) => links.map((a) => a.getBoundingClientRect().height));
  expect(heights.length).toBeGreaterThan(0);
  for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
});

import { test, expect } from "@playwright/test";

const routes = ["/", "/resume", "/notes", "/contact"];
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
});

test("production build sends a hashed Content-Security-Policy", async ({ request }) => {
  const res = await request.get("/");
  const csp = res.headers()["content-security-policy"] ?? "";
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toMatch(/script-src 'self' 'sha256-/);
  expect(csp).toMatch(/style-src 'self' 'sha256-/);
});

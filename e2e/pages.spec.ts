import { test, expect } from "@playwright/test";

const TITLES = [
  "T1 Tech Support",
  "Web Concierge (WP Live)",
  "Professional Services Engineer",
  "T3 Tech Support",
  "Systems Administrator",
  "Linux Engineer",
  "Sr. Systems Architect and Director of IT Operations",
];

test("home shows the seven-rank timeline in order", async ({ page }) => {
  await page.goto("/");
  const titles = page.locator("#journey .timeline__title");
  await expect(titles).toHaveText(TITLES);
  await expect(page.locator("#journey [role=img]").first()).toHaveAttribute("aria-label", "Rank E");
});

test("home links to Discord, LinkedIn and the contact page", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href="https://discord.gg/XKQ26mjqN"]').first()).toBeAttached();
  await expect(page.locator('a[href="https://www.linkedin.com/in/m8mz/"]').first()).toBeAttached();
  await expect(page.locator('#contact a[href="/contact"]')).toBeVisible();
});

test("resume lists every role, newest first, and offers the PDF", async ({ page, request }) => {
  await page.goto("/resume");
  await expect(page.locator(".job h3")).toHaveText([...TITLES].reverse());
  const pdfHref = await page.getByRole("link", { name: "Download the PDF" }).getAttribute("href");
  const pdf = await request.get(pdfHref!);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
});

test("notes list links to readable posts", async ({ page }) => {
  await page.goto("/notes");
  const links = page.locator(".notes h2 a");
  await expect(links).toHaveCount(2);
  await links.first().click();
  await expect(page.locator("article h1")).toBeVisible();
  await expect(page.locator(".note__meta")).toContainText("min read");
});

test("404 shows a terminal session and a way home", async ({ page }) => {
  const res = await page.goto("/definitely-missing");
  expect(res?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page doesn't exist");
  await expect(page.locator(".term__title")).toHaveText("bash");
  await expect(page.locator(".term")).toContainText("No such file or directory");
  // The session wraps instead of hiding the error behind a sideways scroll on phones.
  const log = page.locator(".nf__log");
  expect(await log.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
  await expect(page.getByRole("link", { name: "home", exact: true })).toHaveAttribute("href", "/");
});

test("/now lists the rig, the games, the anime and what Marcus is building", async ({ page }) => {
  await page.goto("/now");
  await expect(page).toHaveTitle("Now · Marcus Hancock-Gaillard");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Now");
  await expect(page.locator(".now__updated")).toHaveText("updated: 2026-09");
  await expect(page.getByRole("heading", { level: 3 })).toHaveText(["rig", "playing", "watching"]);
  for (const text of ["AMD Ryzen 7 7800X3D", "League of Legends", "Demon Slayer"]) {
    await expect(page.locator("main")).toContainText(text);
  }
  for (const key of ["training:", "learning:", "building:"]) {
    await expect(page.locator("main .kv__key", { hasText: key })).toHaveCount(1);
  }
});

test("/now leads with the rig still as its eager hero", async ({ page }) => {
  await page.goto("/now");
  const img = page.locator(".now__hero .still img");
  await expect(img).toHaveAttribute("alt", /^Illustration: /);
  await expect(img).toHaveAttribute("loading", "eager");
  await expect(img).toHaveAttribute("fetchpriority", "high");
  await expect(img).toHaveAttribute("width", /^\d+$/);
  await expect(img).toHaveAttribute("height", /^\d+$/);
});

test.describe("machine-readable files", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop", "one project is enough");
  });

  test("RSS feed lists published notes", async ({ request }) => {
    const res = await request.get("/rss.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    expect(xml).toContain("<rss");
    expect(xml.match(/<item>/g)?.length).toBe(2);
  });

  test("sitemap, robots.txt and security.txt are served", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap-0.xml")).text();
    expect(sitemap).toContain("https://evilist.io/notes/ten-years-t1-to-architect/");
    expect(sitemap).toContain("https://evilist.io/resume/");
    expect(sitemap).toContain("https://evilist.io/now/");
    expect(await (await request.get("/robots.txt")).text()).toContain(
      "Sitemap: https://evilist.io/sitemap-index.xml",
    );
    expect(await (await request.get("/.well-known/security.txt")).text()).toContain("Contact:");
  });

  test("home page has Person structured data", async ({ page }) => {
    await page.goto("/");
    const json = await page.locator('script[type="application/ld+json"]').textContent();
    const data = JSON.parse(json!);
    expect(data["@graph"][0]["@type"]).toBe("Person");
    expect(data["@graph"][0].name).toBe("Marcus Hancock-Gaillard");
  });
});

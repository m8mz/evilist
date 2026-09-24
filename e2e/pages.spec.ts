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

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

test("each role shows its rank chip and org/dates rows; only the current role is S", async ({
  page,
}) => {
  await page.goto("/resume");
  const chips = page.locator(".job .rank-chip");
  await expect(chips).toHaveCount(7);
  await expect(chips.first()).toHaveAttribute("aria-label", "Rank S");
  await expect(chips.last()).toHaveAttribute("aria-label", "Rank E");
  await expect(page.locator(".job .rank-chip--s")).toHaveCount(1);
  const newest = page.locator(".job").first();
  await expect(newest.locator(".kv__key")).toHaveText(["org:", "dates:"]);
  await expect(newest.locator(".kv__value").last()).toContainText("Present");
});

test("the resume prints on white with outlined, unfilled chips", async ({ page }) => {
  await page.goto("/resume");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  const s = page.locator(".job .rank-chip--s");
  await expect(s).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(s).toHaveCSS("border-top-color", "rgb(17, 17, 17)");
  await expect(s).toHaveCSS("color", "rgb(17, 17, 17)");
  await expect(page.locator(".band__prompt")).toBeHidden();
  await expect(page.locator(".resume__actions")).toBeHidden();
});

test("notes list links to readable posts", async ({ page }) => {
  await page.goto("/notes");
  const links = page.locator(".notes h2 a");
  await expect(links).toHaveCount(2);
  await links.first().click();
  await expect(page.locator("article h1")).toBeVisible();
  await expect(page.locator(".note__meta")).toContainText(/read:\s*\d+ min/);
});

test("each note on the list is a case panel with its tags, date and reading time", async ({
  page,
}) => {
  await page.goto("/notes");
  const rows = page.locator(".notes .panel--case");
  await expect(rows).toHaveCount(2);
  await expect(rows.first().locator(".kv__key")).toHaveText(["date:", "read:"]);
  await expect(rows.first().locator(".kv__value").last()).toHaveText(/^\d+ min$/);
  await expect(page.locator(".notes .tag", { hasText: "career" })).toHaveCount(1);
});

test("a note opens with its path as the prompt, then date and reading time", async ({ page }) => {
  await page.goto("/notes/ten-years-t1-to-architect");
  await expect(page.locator(".note__prompt")).toContainText("notes/ten-years-t1-to-architect");
  await expect(page.locator(".note__meta .kv__key")).toHaveText(["date:", "read:"]);
});

test("note code sits on carbon with an iron hairline, inline code on graphite", async ({
  page,
}) => {
  await page.goto("/notes/building-this-site");
  // No published note has code yet, so add some to the rendered body and read its styles.
  const styles = await page.evaluate(() => {
    const prose = document.querySelector(".prose")!;
    prose.insertAdjacentHTML("beforeend", "<pre><code>ls</code></pre><p><code>x</code></p>");
    const s = (sel: string) => getComputedStyle(prose.querySelector(sel)!);
    return {
      preBg: s("pre").backgroundColor,
      preBorder: s("pre").borderTopColor,
      preRadius: s("pre").borderTopLeftRadius,
      inlineBg: s("p > code").backgroundColor,
      body: getComputedStyle(prose).fontSize,
    };
  });
  expect(styles).toEqual({
    preBg: "rgb(17, 17, 17)",
    preBorder: "rgb(32, 32, 32)",
    preRadius: "2px",
    inlineBg: "rgb(25, 25, 25)",
    body: "15px",
  });
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
  // Headings descend in order: h1, then an h2 per panel, then the column heads.
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Rig, games and anime",
    "Training, learning and building",
  ]);
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
    // Item links use the canonical, slashless URL (no redirect hop for feed readers).
    expect(xml).toContain("<link>https://evilist.io/notes/ten-years-t1-to-architect</link>");
  });

  test("sitemap, robots.txt and security.txt are served", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap-0.xml")).text();
    expect(sitemap).toContain("https://evilist.io/notes/ten-years-t1-to-architect");
    expect(sitemap).toContain("https://evilist.io/resume");
    expect(sitemap).toContain("https://evilist.io/now");
    expect(await (await request.get("/robots.txt")).text()).toContain(
      "Sitemap: https://evilist.io/sitemap-index.xml",
    );
    expect(await (await request.get("/.well-known/security.txt")).text()).toContain("Contact:");
  });

  test("every page shares the 1200×630 social card", async ({ page, request }) => {
    for (const path of ["/", "/now", "/resume"]) {
      await page.goto(path);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        "content",
        "https://evilist.io/og-default.png",
      );
      await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
        "content",
        "1200",
      );
      await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute(
        "content",
        "630",
      );
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        "content",
        "summary_large_image",
      );
    }
    const res = await request.get("/og-default.png");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  });

  test("the social card's source page stays out of search", async ({ page, request }) => {
    const sitemap = await (await request.get("/sitemap-0.xml")).text();
    expect(sitemap).not.toContain("og-card");
    // A 404 is noindex too, so first prove the real card page answered.
    expect((await page.goto("/og-card"))?.status()).toBe(200);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  });

  test("home page has Person structured data", async ({ page }) => {
    await page.goto("/");
    const json = await page.locator('script[type="application/ld+json"]').textContent();
    const data = JSON.parse(json!);
    expect(data["@graph"][0]["@type"]).toBe("Person");
    expect(data["@graph"][0].name).toBe("Marcus Hancock-Gaillard");
  });
});

test.describe("training bars", () => {
  test("are flat from the first paint until they scroll into view", async ({ page }, info) => {
    test.skip(!["iphone-15", "pixel-7"].includes(info.project.name), "phones: bars start below");
    await page.goto("/now");
    const bars = page.locator(".now__bars");
    expect(await bars.getAttribute("data-animate")).toBeNull();
    await expect(bars.locator(".log-bars__bar").first()).toHaveCSS(
      "transform",
      "matrix(1, 0, 0, 0, 0, 0)",
    );
    await bars.scrollIntoViewIfNeeded();
    await expect(bars.locator(".log-bars__bar:not(.is-live)")).toHaveCount(0);
    await expect(bars.locator(".log-bars__bar").last()).toHaveCSS(
      "transform",
      "matrix(1, 0, 0, 1, 0, 0)",
    );
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("stand at full height", async ({ page }, info) => {
      test.skip(info.project.name !== "desktop", "one project is enough");
      await page.goto("/now");
      await expect(page.locator(".now__bars .log-bars__bar").first()).toHaveCSS(
        "transform",
        "none",
      );
    });
  });
});

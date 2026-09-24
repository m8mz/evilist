import { test, expect, type Page } from "@playwright/test";

// The server runs with CONTACT_DRY_RUN=true, so nothing is emailed.
// Each test gets its own client IP so the per-IP rate limit doesn't leak between tests.
let ipCounter = 0;
const uniqueIp = () =>
  `10.77.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}-${Date.now()}`;

// The time-trap rejects forms submitted within 3 s of rendering.
const HUMAN_DELAY_MS = 3_200;

async function openContact(page: Page) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
  await page.goto("/contact");
}

async function fillRecruiter(page: Page) {
  const form = page.locator("#panel-recruiter form");
  await form.getByLabel("Your name").fill("Ada Lovelace");
  await form.getByLabel("Email").fill("ada@example.com");
  await form.getByLabel("Company").fill("Analytical Engines");
  await form.getByLabel("Message").fill("We'd like to talk about a role.");
  return form;
}

test("sends a recruiter message and confirms in place", async ({ page }) => {
  await openContact(page);
  const form = await fillRecruiter(page);
  await page.waitForTimeout(HUMAN_DELAY_MS);
  await form.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("heading", { name: "Message sent" })).toBeVisible();
});

test("shows field errors inline and keeps what was typed", async ({ page }) => {
  await openContact(page);
  const form = page.locator("#panel-recruiter form");
  await form.getByLabel("Your name").fill("Ada");
  await form.getByLabel("Email").fill("not-an-email");
  await form.getByRole("button", { name: "Send message" }).click();

  await expect(form.getByText("Enter a valid email address", { exact: false })).toBeVisible();
  await expect(form.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  await expect(form.getByLabel("Your name")).toHaveValue("Ada");
});

test("asks a too-fast submitter to wait", async ({ page }) => {
  await openContact(page);
  const form = await fillRecruiter(page);
  await form.getByRole("button", { name: "Send message" }).click();
  await expect(form.getByText("faster than we expected", { exact: false })).toBeVisible();
});

test("a filled honeypot looks like success to the bot", async ({ page }) => {
  await openContact(page);
  const form = await fillRecruiter(page);
  await form.locator('input[name="website"]').evaluate((el: HTMLInputElement) => {
    el.value = "http://spam.example";
  });
  await page.waitForTimeout(HUMAN_DELAY_MS);
  await form.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("heading", { name: "Message sent" })).toBeVisible();
});

test("switches to the client form with tabs", async ({ page }) => {
  await openContact(page);
  await page.getByRole("tab", { name: "I need help with a project" }).click();
  await expect(page.locator("#panel-client")).toBeVisible();
  await expect(page.locator("#panel-recruiter")).toBeHidden();
  await expect(page.locator("#panel-client").getByLabel("Budget")).toBeVisible();
});

test("the form tabs are a chip pair: paper outline selected, slate unselected", async ({
  page,
}) => {
  await openContact(page);
  await expect(page.getByRole("tab", { name: "I'm hiring" })).toHaveCSS(
    "border-top-color",
    "rgb(238, 238, 238)",
  );
  await expect(page.getByRole("tab", { name: "I need help with a project" })).toHaveCSS(
    "border-top-color",
    "rgb(58, 58, 58)",
  );
});

test("errors read as terminal errors and the button keeps its label and arrow", async ({
  page,
}) => {
  await openContact(page);
  const form = page.locator("#panel-recruiter form");
  await form.getByLabel("Email").fill("not-an-email");
  await form.getByRole("button", { name: "Send message" }).click();

  const error = form.locator('[data-error-for="email"]');
  await expect(error).toBeVisible();
  await expect(error).toHaveCSS("color", "rgb(238, 238, 238)");
  expect(await error.evaluate((el) => getComputedStyle(el, "::before").content)).toBe('"error: "');
  await expect(form.getByLabel("Email")).toHaveCSS("border-top-color", "rgb(238, 238, 238)");

  const submit = form.locator('button[type="submit"]');
  await expect(submit).toHaveText(/Send message/);
  await expect(submit.locator(".btn__arrow")).toHaveCount(1);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("shows both forms and still sends", async ({ page }) => {
    await openContact(page);
    await expect(page.locator("#panel-recruiter form")).toBeVisible();
    await expect(page.locator("#panel-client form")).toBeVisible();
    const form = await fillRecruiter(page);
    await page.waitForTimeout(HUMAN_DELAY_MS);
    await form.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("heading", { name: "Message sent" })).toBeVisible();
  });
});

test("rate-limits a single client to 3 messages per 10 minutes", async ({
  page,
  baseURL,
}, info) => {
  test.skip(info.project.name !== "desktop", "server-side behavior; one project is enough");
  const ip = uniqueIp();
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ip });
  await page.goto("/contact");
  const ts = await page.locator('#panel-recruiter input[name="ts"]').inputValue();
  await page.waitForTimeout(HUMAN_DELAY_MS);

  const send = () =>
    page.request.post("/_actions/contact", {
      headers: { origin: baseURL!, "x-forwarded-for": ip, accept: "application/json" },
      multipart: {
        type: "recruiter",
        name: "Ada",
        email: "ada@example.com",
        company: "Analytical Engines",
        message: "Hello",
        website: "",
        ts,
      },
    });

  const statuses = [];
  for (let i = 0; i < 4; i++) statuses.push((await send()).status());
  expect(statuses).toEqual([200, 200, 200, 429]);
});

test("rejects cross-origin posts to the action (CSRF)", async ({ request }, info) => {
  test.skip(info.project.name !== "desktop", "server-side behavior; one project is enough");
  const res = await request.post("/_actions/contact", {
    headers: { origin: "https://evil.example", "x-forwarded-for": uniqueIp() },
    multipart: {
      type: "recruiter",
      name: "x",
      email: "x@example.com",
      company: "x",
      message: "x",
      ts: "1.x",
    },
  });
  expect(res.status()).toBe(403);
});

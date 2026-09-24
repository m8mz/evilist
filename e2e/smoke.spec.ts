import { test, expect } from "@playwright/test";

test("home page renders a heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1, h2").first()).toBeVisible();
});

test("health endpoint responds ok", async ({ request }) => {
  const res = await request.get("/healthz");
  expect(res.status()).toBe(200);
  expect(await res.text()).toBe("ok");
});

test("unknown route returns 404 page", async ({ page }) => {
  const res = await page.goto("/definitely-not-a-page");
  expect(res?.status()).toBe(404);
});

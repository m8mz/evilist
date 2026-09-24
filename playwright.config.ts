import { defineConfig, devices } from "@playwright/test";

// Dedicated port: never collide with (or silently reuse) `astro dev` on 4321.
const PORT = 4399;
const baseURL = `http://127.0.0.1:${PORT}`;

// Runs against the production build (`pnpm build` first). CI builds before this step.
export default defineConfig({
  testDir: "./e2e",
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}-{platform}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, colorScheme: "dark", trace: "on-first-retry" },
  webServer: {
    // Run node directly: the pnpm wrapper doesn't forward Playwright's shutdown signal,
    // which left the server orphaned and the runner hanging.
    command: "node ./dist/server/entry.mjs",
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
    url: `${baseURL}/healthz`,
    reuseExistingServer: false,
    env: {
      HOST: "127.0.0.1",
      PORT: String(PORT),
      CONTACT_DRY_RUN: "true",
      SENDGRID_API_KEY: "test",
    },
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "iphone-15", use: { ...devices["iPhone 15"] } },
    { name: "pixel-7", use: { ...devices["Pixel 7"] } },
    { name: "ipad", use: { ...devices["iPad (gen 7)"] } },
    { name: "reduced-motion", use: { ...devices["Desktop Chrome"], reducedMotion: "reduce" } },
  ],
});

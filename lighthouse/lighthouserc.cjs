// Lighthouse CI: audits the production build on every push/PR (mobile preset, 3 runs, median).
// Thresholds: errors fail CI; performance warns below 0.95 because shared CI runners are noisy.
const PORT = 4395;
const base = `http://127.0.0.1:${PORT}`;

module.exports = {
  ci: {
    collect: {
      startServerCommand: `HOST=127.0.0.1 PORT=${PORT} CONTACT_DRY_RUN=true SENDGRID_API_KEY=unused node ./dist/server/entry.mjs`,
      startServerReadyPattern: "Server listening",
      url: [`${base}/`, `${base}/resume/`, `${base}/notes/`, `${base}/contact`],
      numberOfRuns: 3,
      // Lighthouse defaults to mobile emulation with simulated throttling.
      settings: { chromeFlags: "--headless=new" },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["error", { minScore: 1 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.05 }],
        "total-blocking-time": ["error", { maxNumericValue: 200 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        // Resource budgets (bytes, transferred)
        "resource-summary:script:size": ["error", { maxNumericValue: 100 * 1024 }],
        "resource-summary:font:size": ["error", { maxNumericValue: 120 * 1024 }],
        "resource-summary:total:size": ["error", { maxNumericValue: 600 * 1024 }],
        "resource-summary:third-party:count": ["error", { maxNumericValue: 0 }],
      },
    },
    upload: { target: "temporary-public-storage" },
  },
};

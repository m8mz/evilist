import { defineConfig, envField, fontProviders } from "astro/config";
import node from "@astrojs/node";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// Static by default. Only pages with `export const prerender = false`
// (the contact page) and the /_actions/* endpoint run on the Node server.
export default defineConfig({
  site: "https://evilist.io",
  adapter: node({ mode: "standalone", staticHeaders: true }),
  integrations: [mdx(), sitemap()],
  devToolbar: { enabled: false },
  // Keep all CSS external: inlined component styles are not covered by the CSP hashes.
  build: { inlineStylesheets: "never" },
  prefetch: { prefetchAll: true, defaultStrategy: "viewport" },
  vite: { plugins: [tailwindcss()] },
  // Fonts are downloaded at build time and self-hosted (no third-party requests; CSP-safe).
  fonts: [
    {
      // Display: heavy Japanese poster gothic (manga title-card feel). Headings + rank seals only.
      provider: fontProviders.fontsource(),
      name: "Dela Gothic One",
      cssVariable: "--font-dela",
      weights: [400],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["Impact", "sans-serif"],
    },
    {
      // Body: Zen Kaku Gothic New, same Japanese type tradition, readable at text sizes.
      provider: fontProviders.fontsource(),
      name: "Zen Kaku Gothic New",
      cssVariable: "--font-zen",
      weights: [400, 700],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["system-ui", "sans-serif"],
    },
  ],
  env: {
    // Secrets are validated at runtime (on first access), not at build,
    // so CI can build the image without the SendGrid key.
    schema: {
      SENDGRID_API_KEY: envField.string({ context: "server", access: "secret" }),
      FORM_SECRET: envField.string({ context: "server", access: "secret", optional: true }),
      CONTACT_TO: envField.string({ context: "server", access: "public", default: "m@evilist.co" }),
      CONTACT_FROM: envField.string({
        context: "server",
        access: "public",
        default: "no-reply@evilist.co",
      }),
      CONTACT_DRY_RUN: envField.boolean({ context: "server", access: "public", default: false }),
      GITHUB_TOKEN: envField.string({ context: "server", access: "secret", optional: true }),
      PUBLIC_DISCORD_INVITE_URL: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
    },
  },
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },
});

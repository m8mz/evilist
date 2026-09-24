import { defineConfig, envField, fontProviders } from "astro/config";
import node from "@astrojs/node";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// `astro dev` serves Vite-injected inline <style>/<script> tags (HMR) that Astro cannot hash,
// so a CSP there blocks every style. Enforce CSP only for production builds and previews.
const isDevServer = process.argv.includes("dev");

// Static by default. Only pages with `export const prerender = false`
// (the contact page) and the /_actions/* endpoint run on the Node server.
export default defineConfig({
  site: "https://evilist.io",
  // One canonical form per page. The adapter's static-header lookup (CSP) only matches the
  // slashless path, and with "never" it 301s /now/ → /now, so every URL served carries the CSP.
  trailingSlash: "never",
  adapter: node({ mode: "standalone", staticHeaders: true }),
  // og-card is an internal render target for the social card, not a page.
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes("/og-card") })],
  devToolbar: { enabled: false },
  // Keep all CSS external: inlined component styles are not covered by the CSP hashes.
  build: { inlineStylesheets: "never" },
  prefetch: { prefetchAll: true, defaultStrategy: "viewport" },
  vite: { plugins: [tailwindcss()] },
  // Fonts are downloaded at build time and self-hosted (no third-party requests; CSP-safe).
  fonts: [
    {
      // One monospaced face for everything: headlines, body, nav, buttons, code (spec §3.3).
      provider: fontProviders.fontsource(),
      name: "JetBrains Mono",
      cssVariable: "--font-jetbrains",
      weights: [400, 700],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
    },
  ],
  env: {
    // Secrets are validated at runtime (on first access), not at build,
    // so CI can build the image without the SendGrid key.
    // Server settings that must change per environment (CONTACT_*) are declared "secret" too:
    // astro:env inlines *public* server values at build time, which silently ignored
    // CONTACT_DRY_RUN=true at runtime.
    schema: {
      SENDGRID_API_KEY: envField.string({ context: "server", access: "secret" }),
      FORM_SECRET: envField.string({ context: "server", access: "secret", optional: true }),
      CONTACT_TO: envField.string({ context: "server", access: "secret", default: "m@evilist.co" }),
      CONTACT_FROM: envField.string({
        context: "server",
        access: "secret",
        default: "no-reply@evilist.co",
      }),
      CONTACT_DRY_RUN: envField.boolean({ context: "server", access: "secret", default: false }),
      PUBLIC_DISCORD_INVITE_URL: envField.string({
        context: "client",
        access: "public",
        default: "https://discord.gg/XKQ26mjqN",
      }),
    },
  },
  security: {
    csp: isDevServer
      ? false
      : {
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

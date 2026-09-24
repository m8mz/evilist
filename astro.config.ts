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
  prefetch: { prefetchAll: true, defaultStrategy: "viewport" },
  vite: { plugins: [tailwindcss()] },
  // Fonts are downloaded at build time and self-hosted (no third-party requests; CSP-safe).
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Raleway",
      cssVariable: "--font-raleway",
      weights: ["100 900"],
      styles: ["normal", "italic"],
      subsets: ["latin"],
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

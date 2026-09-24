/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// getViteConfig gives tests the same resolution as Astro (astro:* virtual modules, aliases).
export default getViteConfig({
  test: {
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
  },
});

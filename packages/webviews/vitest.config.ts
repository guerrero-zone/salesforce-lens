import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{js,ts}"],
    setupFiles: ["./src/test/setup.ts"],
    alias: {
      // Force Svelte to use client-side code in tests
      svelte: "svelte",
    },
  },
  resolve: {
    // Force browser conditions for Svelte 5
    conditions: ["browser", "svelte"],
  },
});


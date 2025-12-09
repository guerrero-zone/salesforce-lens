import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  base: "./", // Use relative paths for VS Code webview compatibility
  build: {
    outDir: "out",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        sidebar: resolve(__dirname, "sidebar.html"),
      },
    },
  },
});


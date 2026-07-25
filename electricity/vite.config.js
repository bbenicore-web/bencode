import { defineConfig } from "vite";

export default defineConfig({
  root: "electricity",
  base: "./",
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: "../dist/electricity",
    emptyOutDir: true
  }
});

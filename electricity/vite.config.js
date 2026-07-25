import { defineConfig } from "vite";

export default defineConfig({
  root: "electricity",
  base: "./",
  build: {
    outDir: "../dist/electricity",
    emptyOutDir: true
  }
});

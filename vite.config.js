import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: { port: 5174, strictPort: true },
  preview: { port: 4174, strictPort: true },
  build: {
    rollupOptions: { input: { game: 'index.html', standing: 'labs/standing/index.html' } },
    sourcemap: true
  }
});

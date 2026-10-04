import { defineConfig } from "vite";
import {standingBuild} from './scripts/standing-provenance.js';
const build=standingBuild();

export default defineConfig({
  define: { __STANDING_BUILD__: JSON.stringify(build) },
  base: "./",
  server: { port: 5174, strictPort: true },
  preview: { port: 4174, strictPort: true },
  build: {
    rollupOptions: { input: { game: 'index.html', standing: 'labs/standing/index.html' } },
    sourcemap: true
  }
});

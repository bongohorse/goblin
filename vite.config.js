import { defineConfig } from "vite";
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync,readdirSync } from 'node:fs';

const gitCommit=execSync('git rev-parse HEAD',{encoding:'utf8'}).trim();
const dirty=execSync('git status --porcelain',{encoding:'utf8'}).trim().length>0;
const hash=createHash('sha256');
for(const name of readdirSync('src/labs/standing').sort())hash.update(name).update(readFileSync('src/labs/standing/'+name));
for(const name of ['baseline-config.json','config.schema.json','result.schema.json'])hash.update(readFileSync('docs/research/standing-lab/'+name));
hash.update(readFileSync('package-lock.json'));
const build={git_commit:gitCommit,dirty,build_id:gitCommit+':'+hash.digest('hex')};

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

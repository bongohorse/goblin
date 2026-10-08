import {defineConfig} from 'vite';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
export default defineConfig({
  base:'./',
  define:{__GAMEPLAY_BUILD__:JSON.stringify({
    revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
    scene_sha256:hash('src/gameplay/upright-scene.js'),
    session_sha256:hash('src/gameplay/upright-session.js'),
    controller_sha256:hash('src/gameplay/upright-assist.js')
  })},
  server:{host:'127.0.0.1',port:5174,strictPort:true},
  preview:{host:'127.0.0.1',port:4174,strictPort:true},
  build:{outDir:'dist-gameplay',sourcemap:true,rollupOptions:{input:'gameplay/upright/index.html'}}
});

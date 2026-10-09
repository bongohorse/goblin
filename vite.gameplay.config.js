import {defineConfig} from 'vite';
import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
export default defineConfig({
  base:'./',
  define:{__GAMEPLAY_BUILD__:JSON.stringify({
    revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
    scene_sha256:hash('src/gameplay/upright-scene.js'),
    session_sha256:hash('src/gameplay/upright-session.js'),
    controller_sha256:hash('src/gameplay/upright-assist.js'),
    comparison_sha256:hash('src/gameplay/upright-comparison.js'),
    physics_sha256:Object.fromEntries(['src/gameplay/upright-assist.js','src/goblin-rig.js','src/grab.js','src/runtime.js','src/labs/standing/motors.js','src/labs/standing/math.js','package-lock.json'].map(path=>[path,hash(path)]))
  })},
  plugins:[{name:'v2-read-only-evidence',generateBundle(){
    const evidence='docs/development/gameplay-upright-v2-evidence.json.gz';
    if(existsSync(evidence))this.emitFile({type:'asset',fileName:'v2-evidence.json.gz',source:readFileSync(evidence)});
    for(let n=1;n<=4;n++){const file='docs/development/gameplay-upright-media/v2-'+n+'.webm';if(existsSync(file))this.emitFile({type:'asset',fileName:'gameplay/upright/v2-media/sequence-'+n+'.webm',source:readFileSync(file)});}
    const targetEvidence='docs/development/gameplay-upright-target-finish-evidence.json.gz';
    if(existsSync(targetEvidence))this.emitFile({type:'asset',fileName:'target-finish-evidence.json.gz',source:readFileSync(targetEvidence)});
    for(let n=1;n<=5;n++){const file='docs/development/gameplay-upright-media/target-'+n+'.webm';if(existsSync(file))this.emitFile({type:'asset',fileName:'gameplay/upright/t1-media/sequence-'+n+'.webm',source:readFileSync(file)});}
  }}],
  server:{host:'127.0.0.1',port:5174,strictPort:true},
  preview:{host:'127.0.0.1',port:4174,strictPort:true},
  build:{outDir:'dist-gameplay',sourcemap:true,rollupOptions:{input:['gameplay/upright/index.html','gameplay/upright/comparison.html']}}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {build} from 'vite';

test('isolated gameplay production entry builds with relative assets, independently of the arena',async()=>{
  const out=await fs.mkdtemp(path.join(os.tmpdir(),'goblin-gameplay-build-'));
  try{
    await build({configFile:'vite.gameplay.config.js',build:{outDir:out,emptyOutDir:false},logLevel:'error'});
    const html=await fs.readFile(path.join(out,'gameplay/upright/index.html'),'utf8');
    assert.match(html,/\.\.\/\.\.\/assets\//);
    assert.match(html,/Konfiguration/);
    const comparison=await fs.readFile(path.join(out,'gameplay/upright/comparison.html'),'utf8');
    assert.match(comparison,/Referenzvergleich V2/);assert.match(comparison,/\.\.\/\.\.\/assets\//);
    assert.deepEqual(await fs.readFile(path.join(out,'target-finish-evidence.json.gz')),await fs.readFile('docs/development/gameplay-upright-target-finish-evidence.json.gz'));
    for(let n=1;n<=5;n++)assert.equal((await fs.stat(path.join(out,'gameplay/upright/t1-media/sequence-'+n+'.webm'))).size,(await fs.stat('docs/development/gameplay-upright-media/target-'+n+'.webm')).size);
    assert.deepEqual(await fs.readFile(path.join(out,'return-evidence.json.gz')),await fs.readFile('docs/development/gameplay-upright-return-evidence.json.gz'));
    for(let n=1;n<=6;n++)assert.deepEqual(await fs.readFile(path.join(out,'gameplay/upright/return-media/sequence-'+n+'.webm')),await fs.readFile('docs/development/gameplay-upright-media/return-'+n+'.webm'));
    await assert.rejects(fs.stat(path.join(out,'index.html')),'normal arena entry is not part of this build');
  }finally{assert.equal(path.dirname(path.resolve(out)),path.resolve(os.tmpdir()));assert.ok(path.basename(out).startsWith('goblin-gameplay-build-'));await fs.rm(out,{recursive:true,force:true});}
});

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
    await assert.rejects(fs.stat(path.join(out,'index.html')),'normal arena entry is not part of this build');
  }finally{assert.equal(path.dirname(path.resolve(out)),path.resolve(os.tmpdir()));assert.ok(path.basename(out).startsWith('goblin-gameplay-build-'));await fs.rm(out,{recursive:true,force:true});}
});

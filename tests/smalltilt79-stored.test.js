import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {auditArchive,readArchive} from '../scripts/smalltilt79-archive.mjs';import {ROOT} from '../scripts/smalltilt79-model.mjs';
test('79 archived single execution retains all75 worlds/18330 steps and frozen decisions',()=>{
 const r=auditArchive();assert.equal(r.worlds,75);assert.equal(r.steps,18330);assert.equal(r.decision,'local_smalltilt_supported');assert.equal(r.reaction.pass,true);
});
test('79 archive rejects missing/reordered parts and byte/hash corruption without worlds',()=>{
 const m=JSON.parse(fs.readFileSync(ROOT+'archive.json'));
 for(const f of [r=>r.parts.pop(),r=>r.parts.reverse(),r=>r.parts[0].bytes++,r=>r.parts[0].sha256='0'.repeat(64),r=>r.gzip_sha256='0'.repeat(64),r=>r.uncompressed_sha256='0'.repeat(64)]){const bad=structuredClone(m);f(bad);assert.throws(()=>readArchive(bad));}
});

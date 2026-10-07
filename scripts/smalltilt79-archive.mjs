// Lossless transport of the original single execution; no measurement or tuning.
import fs from 'node:fs';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
import {ROOT} from './smalltilt79-model.mjs';import {validate} from './smalltilt79-reader.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function readArchive(m=JSON.parse(fs.readFileSync(ROOT+'archive.json'))){
 assert.deepEqual(Object.keys(m).sort(),'schema_version,encoding,harness_head,uncompressed_bytes,uncompressed_sha256,gzip_bytes,gzip_sha256,parts'.split(',').sort());assert.equal(m.schema_version,1);assert.equal(m.encoding,'gzip-split-v1');assert.equal(m.parts.length,23);
 const parts=m.parts.map((p,i)=>{assert.deepEqual(Object.keys(p).sort(),['bytes','path','sha256']);assert.equal(p.path,'raw.json.gz.part-'+String(i).padStart(3,'0'));const b=fs.readFileSync(ROOT+p.path);assert.equal(b.length,p.bytes);assert.equal(hash(b),p.sha256);return b;});
 const gzip=Buffer.concat(parts);assert.equal(gzip.length,m.gzip_bytes);assert.equal(hash(gzip),m.gzip_sha256);const raw=gunzipSync(gzip);assert.equal(raw.length,m.uncompressed_bytes);assert.equal(hash(raw),m.uncompressed_sha256);
 return {raw:JSON.parse(raw),head:m.harness_head};
}
export function frozenBuildHash(head){
 // Exactly standingBuild's original input list at the published harness, excluding
 // post-execution archive helpers. Each original byte is checked against Git.
 const tracked=execFileSync('git',['ls-tree','-r','--name-only',head],{encoding:'utf8'}).trim().split('\n');
 const names=[...tracked.filter(p=>/^(src|labs|public|tests|scripts)\//.test(p)),'index.html','vite.config.js','package.json','package-lock.json',...['baseline-config.json','config.schema.json','result.schema.json','motor-config.schema.json','motor-result.schema.json','model-config.schema.json','model-result.schema.json'].map(n=>'docs/research/standing-lab/'+n)].sort();
 const h=createHash('sha256');for(const p of names){const b=fs.readFileSync(p),original=execFileSync('git',['show',head+':'+p],{maxBuffer:20000000});assert.deepEqual(b,original,p+' frozen source changed');h.update(p).update('\0').update(b).update('\0');}return h.digest('hex');
}
export function auditArchive(){const {raw,head}=readArchive();assert.equal(raw.provenance.build_id,head+':'+frozenBuildHash(head));return validate(raw,head);}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(auditArchive()));

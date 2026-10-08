import {historicalSource} from './smalltilt79-frozen-source.mjs';
// Lossless transport of the original single execution; no measurement or tuning.
import fs from 'node:fs';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';
import {ROOT} from './smalltilt79-model.mjs';import {validateReviewed} from './review-smalltilt81.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function readArchive(m=JSON.parse(fs.readFileSync(ROOT+'archive.json'))){
 assert.deepEqual(Object.keys(m).sort(),'schema_version,encoding,harness_head,uncompressed_bytes,uncompressed_sha256,gzip_bytes,gzip_sha256,parts'.split(',').sort());assert.equal(m.schema_version,1);assert.equal(m.encoding,'gzip-split-v1');assert.equal(m.parts.length,23);
 const parts=m.parts.map((p,i)=>{assert.deepEqual(Object.keys(p).sort(),['bytes','path','sha256']);assert.equal(p.path,'raw.json.gz.part-'+String(i).padStart(3,'0'));const b=fs.readFileSync(ROOT+p.path);assert.equal(b.length,p.bytes);assert.equal(hash(b),p.sha256);return b;});
 const gzip=Buffer.concat(parts);assert.equal(gzip.length,m.gzip_bytes);assert.equal(hash(gzip),m.gzip_sha256);const raw=gunzipSync(gzip);assert.equal(raw.length,m.uncompressed_bytes);assert.equal(hash(raw),m.uncompressed_sha256);
 return {raw:JSON.parse(raw),head:m.harness_head};
}
export function frozenBuildHash(head){
 // The original Git input list/bytes were verified before recording this ledger.
 // A shallow CI checkout need not contain historical commit objects.
 const m=JSON.parse(fs.readFileSync(ROOT+'build-inputs.json'));assert.equal(m.schema_version,1);assert.equal(m.harness_head,head);
 const names=m.files.map(p=>p.path);assert.deepEqual(names,[...new Set(names)].sort());
 const h=createHash('sha256');for(const p of m.files){assert.ok(!p.path.includes('..')&&!p.path.includes('\\')&&!p.path.startsWith('/'));const b=historicalSource(p.path,head);assert.equal(hash(b),p.sha256,p.path+' frozen source changed');h.update(p.path).update('\0').update(b).update('\0');}const result=h.digest('hex');assert.equal(result,m.source_hash);return result;
}
export function auditArchive(){const {raw,head}=readArchive();assert.equal(raw.provenance.build_id,head+':'+frozenBuildHash(head));const {frozen,independent}=validateReviewed(raw,head);return {...frozen,independent};}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(auditArchive()));

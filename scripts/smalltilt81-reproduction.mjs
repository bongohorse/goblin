// Restore the complete fresh reproduction without duplicating identical trajectories.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';
import {readArchive} from './smalltilt79-archive.mjs';import {validateReviewed} from './review-smalltilt81.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function readReproduction(m=JSON.parse(fs.readFileSync('docs/research/standing-lab/review81/reproduction.json'))){
 assert.deepEqual(Object.keys(m).sort(),'schema_version,format,original_archive,reviewed_head,header,runs_sha256,original_runs_sha256,raw_bytes,raw_sha256,fresh_worlds,steps,note'.split(',').sort());assert.equal(m.schema_version,1);assert.equal(m.format,'lossless-identical-runs-replay-v1');assert.equal(m.original_archive,'../smalltilt79/archive.json');assert.equal(m.reviewed_head,'5aa32acc5d4b71d4f5abc6b2d3bceee88da28669');assert.equal(m.fresh_worlds,75);assert.equal(m.steps,18330);
 const {raw:original}=readArchive(),runs=original.runs;assert.equal(hash(JSON.stringify(runs)),m.runs_sha256);assert.equal(m.runs_sha256,m.original_runs_sha256);
 const h=m.header;assert.equal(h.provenance.git_commit,m.reviewed_head);assert.deepEqual(Object.keys(h).sort(),'schema_version,study,provenance,fresh_worlds,failed_world,reaction,decision'.split(',').sort());
 const raw={schema_version:h.schema_version,study:h.study,provenance:h.provenance,fresh_worlds:h.fresh_worlds,runs,failed_world:h.failed_world,reaction:h.reaction,decision:h.decision},bytes=Buffer.from(JSON.stringify(raw,null,2)+'\n');
 assert.equal(bytes.length,m.raw_bytes);assert.equal(hash(bytes),m.raw_sha256);return {raw,bytes,head:m.reviewed_head};
}
export function auditReproduction(){const {raw,head}=readReproduction();return validateReviewed(raw,head);}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const {raw,bytes,head}=readReproduction();const result=validateReviewed(raw,head);if(process.argv[2]){assert.ok(!fs.existsSync(process.argv[2]));fs.writeFileSync(process.argv[2],bytes);}console.log(JSON.stringify(result));}

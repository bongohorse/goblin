// Original Git bytes, verified against the immutable original build/source ledgers.
// Historical evidence is audited against its own build, including shallow CI.
import fs from 'node:fs';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';
const snapshot=JSON.parse(gunzipSync(fs.readFileSync(new URL('../docs/research/standing-lab/fullrig84/observer-v3/smalltilt79-sources.json.gz',import.meta.url))));
export function historicalSource(path,head){assert.equal(snapshot.schema_version,1);assert.equal(snapshot.harness_head,head??'7534e4e473b0371d4e54da553dd59b6ef4abbf6e');assert.ok(Object.hasOwn(snapshot.files,path),'original source missing '+path);return Buffer.from(snapshot.files[path],'base64');}

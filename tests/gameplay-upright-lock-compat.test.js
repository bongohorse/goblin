import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateGameplayHistoricalLock,sha256} from '../scripts/gameplay-upright-lock-compat.mjs';

const frozen=fs.readFileSync(new URL('../docs/development/gameplay-upright-frozen-package-lock.json',import.meta.url));
const current=fs.readFileSync(new URL('../package-lock.json',import.meta.url));
const originalHash='0aa6cbcc1a0658098899f101b5175819f0f514b0c0cee3e87b496cad9ca0b90d';
const changed=mutate=>{
  const value=JSON.parse(current);
  mutate(value);
  return Buffer.from(JSON.stringify(value));
};

test('historical gameplay lock bytes remain exact; PR checkout may change only existing dev packages',()=>{
  assert.equal(sha256(frozen),originalHash,'the archival lock may never silently drift');
  const result=validateGameplayHistoricalLock(frozen,current,originalHash);
  assert.equal(result.historicalHash,originalHash);
  assert.equal(result.currentHash,sha256(current));
  assert.equal(result.exactCurrent,result.currentHash===originalHash);
  assert.ok(result.devOnlyChanges.every(name=>{
    const original=JSON.parse(frozen).packages[name],newer=JSON.parse(current).packages[name];
    return !!name&&original?.dev===true&&newer?.dev===true;
  }));
});

test('the compatibility gate rejects a modified archival lock and root dependency contract',()=>{
  assert.throws(()=>validateGameplayHistoricalLock(Buffer.from(frozen.toString()+'\n'),current,originalHash),
    /historical gameplay package-lock bytes changed/);
  assert.throws(()=>validateGameplayHistoricalLock(frozen,changed(lock=>{
    lock.packages[''].dependencies['@dimforge/rapier3d-compat']='^0.22.0';
  }),originalHash),/gameplay root dependency contract changed/);
});

test('the compatibility gate rejects any changed production package, including integrity',()=>{
  for(const name of ['node_modules/@dimforge/rapier3d-compat','node_modules/three']){
    assert.throws(()=>validateGameplayHistoricalLock(frozen,changed(lock=>{
      lock.packages[name].integrity='tampered';
    }),originalHash),/non-development lock dependency changed/);
  }
});

test('the compatibility gate rejects lock metadata changes and unreviewed package additions',()=>{
  assert.throws(()=>validateGameplayHistoricalLock(frozen,changed(lock=>{lock.lockfileVersion=99;}),originalHash),
    /gameplay lockfile metadata changed/);
  assert.throws(()=>validateGameplayHistoricalLock(frozen,changed(lock=>{
    lock.packages['node_modules/unreviewed-dev']={version:'1.0.0',dev:true};
  }),originalHash),/non-development lock dependency changed/);
});

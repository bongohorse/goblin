// Strictly distinguish frozen historical lock identity from a PR-merge checkout.
// A newer npm lock is compatible ONLY when all non-root differences are inside
// existing dev-only packages; it is never relabelled as the original build.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

export function validateGameplayHistoricalLock(frozenBytes,currentBytes,recordedHash){
  assert.equal(sha256(frozenBytes),recordedHash,'historical gameplay package-lock bytes changed');
  const frozen=JSON.parse(frozenBytes),current=JSON.parse(currentBytes);
  const withoutPackages=lock=>Object.fromEntries(Object.entries(lock).filter(([key])=>key!=='packages'));
  assert.deepEqual(withoutPackages(current),withoutPackages(frozen),'gameplay lockfile metadata changed');
  assert.deepEqual(current.packages?.[''],frozen.packages?.[''],'gameplay root dependency contract changed');
  const source=frozen.packages,actual=current.packages;
  assert.ok(source&&actual&&typeof source==='object'&&typeof actual==='object','missing package-lock package map');
  const differences=[];
  for(const path of [...new Set([...Object.keys(source),...Object.keys(actual)])].sort()){
    if(JSON.stringify(source[path])===JSON.stringify(actual[path]))continue;
    // No new/removed package and no runtime/devOptional or root changes allowed.
    assert.ok(path&&source[path]?.dev===true&&actual[path]?.dev===true,
      path+': non-development lock dependency changed');
    differences.push(path);
  }
  return {historicalHash:recordedHash,currentHash:sha256(currentBytes),
    exactCurrent:sha256(currentBytes)===recordedHash,devOnlyChanges:differences};
}

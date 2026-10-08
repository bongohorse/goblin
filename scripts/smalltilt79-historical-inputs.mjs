// Historical identity and current compatibility are distinct, fail-closed checks.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const ROOT = 'docs/research/standing-lab/smalltilt79/';
const FROZEN_ROOT = ROOT + 'frozen-inputs/';
const previouslyFrozen = new Set(['package.json', 'package-lock.json', 'scripts/smalltilt79-reader.mjs']);
const presentation = new Set(['labs/standing/index.html', 'src/labs/standing/browser.js', 'src/labs/standing/style.css']);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reviewed = JSON.parse(fs.readFileSync(new URL('./smalltilt79-feedback-compatibility.json', import.meta.url)));

// These are NEW, explicit current-code review pins, never replacements for the
// historical pins. Any later UI/helper edit requires a new scoped source review.
function assertReviewedFeedback(read) {
  assert.deepEqual(Object.keys(reviewed.files).sort(), [...presentation, 'src/labs/standing/feedback.js'].sort());
  for (const [path, expected] of Object.entries(reviewed.files))
    assert.equal(hash(read(path)), expected, path + ' outside reviewed feedback boundary');
}

export function assertCurrentCompatibility(read = path => fs.readFileSync(path)) {
  assertReviewedFeedback(read);
  const ledger = JSON.parse(read(ROOT + 'build-inputs.json'));
  // No blanket UI exemption: only the exact four-file reviewed integration above.
  for (const {path, sha256} of ledger.files) {
    if (!previouslyFrozen.has(path) && !presentation.has(path))
      assert.equal(hash(read(path)), sha256, path + ' current source differs from historical input');
  }
  // Historical package snapshots alone cannot detect an engine upgrade today.
  const oldLock = JSON.parse(read(FROZEN_ROOT + 'package-lock.json'));
  const currentLock = JSON.parse(read('package-lock.json'));
  const engine = 'node_modules/@dimforge/rapier3d-compat';
  assert.deepEqual(currentLock.packages[engine], oldLock.packages[engine], 'current Rapier lock differs');
  const oldPackage = JSON.parse(read(FROZEN_ROOT + 'package.json'));
  const currentPackage = JSON.parse(read('package.json'));
  assert.equal(currentPackage.dependencies['@dimforge/rapier3d-compat'], oldPackage.dependencies['@dimforge/rapier3d-compat'], 'current Rapier dependency differs');
  return {compatible_source_boundary: true, scope: reviewed.scope};
}

export function readHistoricalInput(path, read = path => fs.readFileSync(path)) {
  // Existing archive/reader assertions still check the original bytes and hashes.
  // Guard current UI AND its new imported helper before selecting historical UI.
  if (presentation.has(path)) {
    assertCurrentCompatibility(read);
    const bytes = read(FROZEN_ROOT + path);
    const ledger = JSON.parse(read(ROOT + 'build-inputs.json'));
    assert.equal(hash(bytes), ledger.files.find(input => input.path === path)?.sha256, path + ' historical source changed');
    return bytes;
  }
  return read(previouslyFrozen.has(path) ? FROZEN_ROOT + path : path);
}

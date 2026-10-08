// The source pins describe the *historical* SmallTilt execution, not the current app.
// Only these inputs have advanced since the archived execution was captured.
import fs from 'node:fs';
const FROZEN_ROOT = 'docs/research/standing-lab/smalltilt79/frozen-inputs/';
const frozen = new Set(['package.json', 'package-lock.json', 'scripts/smalltilt79-reader.mjs']);
export function readHistoricalInput(path) {
  return fs.readFileSync(frozen.has(path) ? FROZEN_ROOT + path : path);
}

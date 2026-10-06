import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initRapier} from '../src/labs/standing/simulation.js';
import {independentCounterreaction} from '../scripts/review-spherical-target54.js';
await initRapier();
test('review54 independently reproduces original rotated-body strict momentum miss without relabeling pass',()=>{
  const original=JSON.parse(fs.readFileSync('docs/research/standing-lab/target-study52/fixtures.json')).counterreaction_resolution_probe;
  const oracle=independentCounterreaction();assert.ok(Math.abs(oracle.scalar_residual-original.momentum_residual)<1e-13);assert.equal(oracle.strict_1e_6_pass,false);
});

import test from 'node:test';
import {initRapier} from '../src/labs/standing/simulation.js';
import {verifyModelFixtures} from '../scripts/motor-model48-fixtures.js';
await initRapier();
test('native models: real per-axis torque caps/reaction, signs/frames, inertia scaling and predeclared scalar response',()=>verifyModelFixtures());

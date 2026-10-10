import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {LabClock} from '../src/labs/standing/clock.js';
const {validateVisibility, validateResume, assess} = createRequire(import.meta.url)('../scripts/chrome-visibility-oracle.cjs');
const runId = 'oracle-fixture';
const diag = (step = 11, paused = true) => ({run_id: runId, mode: 'motor20', step, paused, invalid: null, termination: null});
function visibility() {
  const row = (now, hidden, paused = true) => ({now, hidden, state: hidden ? 'hidden' : 'visible', d: diag(11, paused)});
  const events = [{...row(100, true), trusted: true}, {...row(5600, false), trusted: true}];
  const background = [row(1000, true), row(3000, true), row(5000, true)];
  const live = {before: row(90, false, false), events, hidden: background, background, returned: row(5700, false), still: row(6200, false)};
  return {live, standalone: structuredClone(live)};
}
function resume(interval = 1000 / 60) {
  let step = 11;
  const clock = new LabClock(1 / 60);
  const rows = [{wall_ms: 0, hidden: false, d: diag(step, false)}];
  for (let t = interval; t < 1000 + interval / 2; t += interval) {
    clock.advance(t / 1000, false, () => step++);
    rows.push({wall_ms: t, hidden: false, d: diag(step, false)});
  }
  // Floating point may put the last frame just below the measurement horizon.
  if (rows.at(-1).wall_ms < 1000) rows.at(-1).wall_ms = 1000;
  return {before: {hidden: false, d: diag()}, active: {hidden: false, d: diag(11, false)}, rows, after: {hidden: false, d: diag(step)}, delta: step - 11,
    max_per_frame: Math.max(...rows.slice(1).map((r, i) => r.d.step - rows[i].d.step))};
}
test('native visibility requires trusted events and stable paused return', () => {
  validateVisibility(visibility());
  for (const change of [
    r => {r.live.events = [];},
    r => {r.live.events.forEach(e => e.trusted = false);},
    r => {r.standalone.hidden = [];},
  ]) {
    const report = visibility(); change(report);
    assert.equal(assess(() => validateVisibility(report)).status, 'missing-native-events');
  }
  for (const change of [
    r => {r.live.events[1].now = 4000;},
    r => {r.live.background[1].d.step++;},
    r => {r.live.returned.d.paused = false;},
    r => {r.live.still.d.run_id = 'replacement';},
    r => {r.live.background[1].d.invalid = 'bad';},
    r => {r.live.events[1].d.termination = 'terminal';},
  ]) {
    const report = visibility(); change(report);
    assert.throws(() => validateVisibility(report));
  }
});
test('resume follows real LabClock at 60Hz and allows capped slow frames', () => {
  validateResume(resume(), runId);
  const slow = resume(100);
  assert.equal(slow.max_per_frame, 3);
  validateResume(slow, runId);
});
test('resume rejects stillstand, implausible progress, catch-up and wrong states', () => {
  for (const [name, change] of [
    ['zero progress', r => {r.rows.forEach(row => row.d.step = 11); r.after.d.step = 11; r.delta = 0; r.max_per_frame = 0;}],
    ['one step over a second', r => {r.rows.forEach((row, i) => row.d.step = 11 + (i ? 1 : 0)); r.after.d.step = 12; r.delta = 1; r.max_per_frame = 1;}],
    ['large catchup', r => {r.rows.at(-1).d.step += 300; r.after.d.step += 300; r.delta += 300; r.max_per_frame = 301;}],
    ['early burst masked by total', r => {r.rows[1].d.step += 4;}],
    ['false reported max', r => {r.max_per_frame = 0;}],
    ['excess total at two steps per frame', r => {r.rows.forEach((row, i) => row.d.step = 11 + i * 2); r.after.d.step = r.rows.at(-1).d.step; r.delta = r.after.d.step - 11; r.max_per_frame = 2;}],
    ['synchronous hidden-time catchup', r => {r.active.d.step += 300;}],
    ['run replacement', r => {r.rows[10].d.run_id = 'new';}],
    ['missing run id', r => {r.rows.forEach(row => row.d.run_id = '');}],
    ['invalid', r => {r.rows[10].d.invalid = 'invalid';}],
    ['termination', r => {r.after.d.termination = 'end';}],
    ['starts unpaused', r => {r.before.d.paused = false;}],
    ['resume did not activate', r => {r.active.d.paused = true;}],
    ['pauses during resume', r => {r.rows[10].d.paused = true;}],
    ['hidden during resume', r => {r.rows[10].hidden = true;}],
    ['pause did not activate', r => {r.after.d.paused = false;}],
  ]) {
    const report = resume(); change(report);
    assert.throws(() => validateResume(report, runId), undefined, name);
  }
});

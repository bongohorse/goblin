const assert = require('node:assert/strict');

// src/labs/standing/clock.js: 60 Hz, at most three steps per animation frame.
const HZ = 60, MAX_STEPS = 3;
function valid(d, runId) {
  assert.ok(typeof runId === 'string' && runId.length > 0, 'nonempty run_id');
  assert.ok(d && d.run_id === runId, 'same run_id throughout');
  assert.equal(d.mode, 'motor20', 'FB20 throughout');
  assert.equal(d.invalid, null, 'no invalid state');
  assert.equal(d.termination, null, 'no termination');
  assert.ok(Number.isInteger(d.step) && d.step >= 0, 'valid step count');
}
function nativeInterval(probe) {
  const hidden = probe.events.find(e => e.trusted && e.hidden && e.state === 'hidden');
  const visible = hidden && probe.events.find(e => e.trusted && !e.hidden && e.state === 'visible' && e.now > hidden.now);
  if (!hidden || !visible || !probe.hidden.length) {
    const error = new Error('Native hidden/visible events and background samples required');
    error.code = 'MISSING_NATIVE_EVENTS';
    throw error;
  }
  assert.ok(visible.now - hidden.now >= 5000, 'at least five seconds genuinely hidden');
  return {hidden, visible};
}
function validateVisibility({standalone, live}) {
  const runId = live.before.d.run_id;
  valid(live.before.d, runId);
  assert.equal(live.before.hidden, false);
  assert.equal(live.before.d.paused, false, 'active before tab switch');
  assert.ok(live.before.d.step >= 10);
  for (const row of [...live.background, ...live.events, live.returned, live.still]) valid(row.d, runId);
  nativeInterval(standalone);
  assert.ok(standalone.hidden.every(r => r.hidden && r.state === 'hidden'));
  const {hidden, visible} = nativeInterval(live);
  const pausedRows = [hidden, visible, ...live.background.filter(r => r.now >= hidden.now), live.returned, live.still];
  for (const row of pausedRows) {
    assert.equal(row.d.paused, true, 'paused from hidden transition through return');
    assert.equal(row.d.step, hidden.d.step, 'stable step from hidden transition through return');
  }
  assert.ok(live.hidden.every(r => r.hidden && r.state === 'hidden'));
  assert.equal(live.returned.hidden, false);
  assert.equal(live.still.hidden, false);
  assert.ok(live.still.now - live.returned.now >= 500, 'paused for 500ms after return');
}
function validateResume(resume, runId) {
  for (const row of [resume.before, resume.active, ...resume.rows, resume.after]) valid(row.d, runId);
  for (const row of [resume.before, resume.active, resume.after]) assert.equal(row.hidden, false, 'visible at resume boundaries');
  assert.equal(resume.before.d.paused, true, 'explicit resume starts paused');
  assert.equal(resume.active.d.paused, false, 'resume activates simulation');
  assert.equal(resume.active.d.step, resume.before.d.step, 'no synchronous catch-up');
  assert.ok(resume.rows.length >= 2, 'animation-frame samples required');
  const first = resume.rows[0], last = resume.rows.at(-1);
  assert.equal(first.wall_ms, 0);
  assert.equal(first.d.step, resume.before.d.step);
  assert.ok(last.wall_ms >= 1000, 'one-second resume horizon');
  let effectiveMs = 0, maxPerFrame = 0;
  for (let i = 0; i < resume.rows.length; i++) {
    const row = resume.rows[i];
    assert.equal(row.d.paused, false, 'active throughout resume');
    assert.equal(row.hidden, false, 'visible throughout resume');
    assert.ok(Number.isFinite(row.wall_ms));
    if (!i) continue;
    const elapsed = row.wall_ms - resume.rows[i - 1].wall_ms;
    const steps = row.d.step - resume.rows[i - 1].d.step;
    assert.ok(elapsed > 0, 'increasing animation-frame time');
    // A slow frame may legitimately step 2 or 3 times. Allow residual <1 step.
    assert.ok(steps >= 0 && steps <= Math.min(MAX_STEPS, Math.ceil(elapsed * HZ / 1000) + 1), 'per-frame clock budget');
    effectiveMs += Math.min(elapsed, MAX_STEPS * 1000 / HZ);
    maxPerFrame = Math.max(maxPerFrame, steps);
  }
  const delta = last.d.step - first.d.step;
  // Exclude clock priming plus sampling-phase/rounding (three steps). Clamp stalls
  // exactly as LabClock does; do not demand 60 steps after a one-second stall.
  assert.ok(delta > 0 && delta >= Math.max(1, Math.floor(effectiveMs * HZ / 1000) - 3), 'positive plausible resume progress');
  assert.ok(delta <= Math.ceil(last.wall_ms * HZ / 1000) + 1, 'no hidden-time catch-up');
  assert.equal(resume.delta, delta);
  assert.equal(resume.max_per_frame, maxPerFrame, 'reported max_per_frame matches samples');
  assert.ok(resume.max_per_frame <= MAX_STEPS, 'max_per_frame within LabClock budget');
  assert.equal(resume.after.d.paused, true, 'explicit pause ends resume');
  assert.equal(resume.after.d.step, last.d.step, 'pause does not advance');
}
function assess(check) {
  try { check(); return {status: 'pass'}; }
  catch (e) { return {status: e.code === 'MISSING_NATIVE_EVENTS' ? 'missing-native-events' : 'deviation', reason: e.message}; }
}
module.exports = {validateVisibility, validateResume, assess};

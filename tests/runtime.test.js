import { test } from "node:test";
import assert from "node:assert/strict";
import { FixedClock, RoundLifecycle, FallTracker } from "../src/runtime.js";

test("spawn, ready and reset never permit score or consume round time", () => {
  const round = new RoundLifecycle();
  assert.equal(round.canScore, false);
  assert.equal(round.beginAction(), false);
  round.reset();
  for (let i = 0; i < 3600; i++) round.advance(1 / 60);
  assert.equal(round.remaining, 60);
  assert.equal(round.canScore, false);
  assert.equal(round.beginAction(), true);
  assert.equal(round.canScore, true);
  round.advance(1);
  round.reset();
  assert.equal(round.remaining, 60);
  assert.equal(round.canScore, false);
});

test("pause freezes round time and blocks input; expiry blocks scoring", () => {
  const round = new RoundLifecycle(1);
  round.reset();
  round.beginAction();
  round.paused = true;
  assert.equal(round.beginAction(), false);
  round.advance(60);
  assert.equal(round.remaining, 1);
  round.paused = false;
  assert.equal(round.advance(1), true);
  assert.equal(round.canScore, false);
  assert.equal(round.beginAction(), false);
});

test("fixed stepping agrees at 30, 60 and 144 render FPS", () => {
  for (const fps of [30, 60, 144]) {
    const clock = new FixedClock();
    let ticks = 0;
    for (let i = 0; i <= fps * 10; i++) clock.advance(i / fps, false, () => ticks++);
    assert.equal(ticks, 600);
  }
});

test("stalls are bounded and pause/reset discard accumulated time", () => {
  const clock = new FixedClock();
  clock.advance(0, false, () => {});
  assert.equal(clock.advance(600, false, () => {}), 3);
  assert.equal(clock.elapsed, 600, "round clock preserves real elapsed time even when physics is bounded");
  clock.advance(601, true, () => assert.fail("paused physics"));
  clock.reset();
  assert.equal(clock.advance(1200, false, () => {}), 0);
  assert.equal(clock.elapsed, 0, "background gap does not enter round time");
  assert.equal(clock.advance(1200 + 1 / 60, false, () => {}), 1);
});

test("spawn falls and prop-only actions cannot award a fall", () => {
  const falls = new FallTracker();
  assert.equal(falls.observe(true, false), false);
  falls.markAction();
  assert.equal(falls.observe(true, true), false, "already lying before first grab");
  falls.reset();
  assert.equal(falls.observe(false, true), false);
  assert.equal(falls.observe(true, true), false, "round started by a prop, no goblin cause");
});

test("direct goblin action awards only a new fall once, reset clears cause", () => {
  const falls = new FallTracker();
  falls.markAction();
  assert.equal(falls.observe(false, true), false);
  assert.equal(falls.observe(true, true), true);
  assert.equal(falls.observe(true, true), false);
  falls.observe(false, true);
  assert.equal(falls.observe(true, true), false);
  falls.reset();
  assert.equal(falls.observe(true, true), false);
});

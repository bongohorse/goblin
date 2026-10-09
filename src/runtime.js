// Physics catches up only within a bounded budget; round time uses real elapsed time.
export class FixedClock {
  constructor(step = 1 / 60, maxSteps = 3) {
    this.step = step;
    this.maxSteps = maxSteps;
    this.reset();
  }
  reset() {
    this.previous = null;
    this.accumulator = 0;
    this.elapsed = 0;
  }
  advance(now, paused, tick) {
    if (paused || this.previous === null) {
      this.previous = now;
      this.accumulator = 0;
      this.elapsed = 0;
      return 0;
    }
    this.elapsed = Math.max(0, now - this.previous);
    const delta = Math.min(this.step * this.maxSteps, this.elapsed);
    this.previous = now;
    this.accumulator += delta;
    let steps = 0;
    while (this.accumulator + 1e-10 >= this.step && steps < this.maxSteps) {
      tick(this.step);
      this.accumulator = Math.max(0, this.accumulator - this.step);
      steps++;
    }
    return steps;
  }
}

export class RoundLifecycle {
  constructor(duration = 60) {
    this.duration = duration;
    this.reset(false);
  }
  reset(ready = true) {
    this.phase = ready ? "ready" : "preparing";
    this.remaining = this.duration;
    this.paused = false;
  }
  get canInteract() {
    return !this.paused && (this.phase === "ready" || this.phase === "active");
  }
  get canScore() {
    return !this.paused && this.phase === "active";
  }
  beginAction() {
    if (!this.canInteract) return false;
    this.phase = "active";
    return true;
  }
  advance(seconds) {
    if (!this.canScore) return false;
    this.remaining = Math.max(0, this.remaining - seconds);
    if (this.remaining < 1e-8) {
      this.remaining = 0;
      this.phase = "ended";
      return true;
    }
    return false;
  }
}

// G0 attribution for direct body tools; contact-chain attribution belongs to G5.
export class FallTracker {
  constructor() { this.reset(); }
  reset() { this.previousFallen = false; this.playerAffectedGoblin = false; this.awarded = false; }
  markAction() { this.playerAffectedGoblin = true; }
  observe(isFallen, canScore) {
    const transition = isFallen && !this.previousFallen;
    this.previousFallen = isFallen;
    if (!canScore) this.playerAffectedGoblin = false;
    if (canScore && transition && this.playerAffectedGoblin && !this.awarded) {
      this.awarded = true;
      return true;
    }
    return false;
  }
}

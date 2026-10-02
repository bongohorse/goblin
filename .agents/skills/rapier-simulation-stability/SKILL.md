---
name: rapier-simulation-stability
description: Keep Beat your Goblin's Rapier simulation stable and predictable with fixed stepping, bounded catch-up, sleeping, scale, CCD and solver tuning.
---

# Rapier Simulation Stability - Goblin

Use for jitter, tunneling, frame-rate-dependent physics, unstable constraints or inconsistent behaviour across devices.

## Fixed timestep

Physics must advance on a fixed step.

Recommended game-loop structure:
1. measure render-frame delta in seconds
2. clamp unusually large frame delta after tab/background stalls
3. add to an accumulator
4. step Rapier in fixed increments while enough time remains
5. cap maximum catch-up work per render frame
6. render from the latest physics state, optionally interpolating visuals only

Do not feed arbitrary render delta directly into a ragdoll solver unless a scoped experiment proves it better.

## Time units

Keep seconds/milliseconds explicit. A single unit mix-up can create explosive forces or nearly frozen motion.

## Sleeping

Sleeping is useful for idle props and ragdoll parts, but interactions that should respond immediately must wake bodies.

Do not globally disable sleeping to hide a wake-up bug.

## Solver tuning

Current upstream Rapier exposes per-body extra solver effort and additional integration parameters, but names/options vary across versions.

Tuning order:
1. correct geometry/anchors
2. correct masses
3. correct fixed timestep
4. correct collision filtering
5. CCD for real tunneling
6. solver-iteration increases only for remaining constraint error

More iterations cost CPU and can affect an entire connected island.

## Scale

Use consistent world units. If a future Rapier version exposes world length-unit tuning, do not adopt it without checking compatibility and measuring a real scale problem.

## Tunneling

When fast objects miss collisions:
- reproduce at fixed speed
- verify collider thickness
- enable CCD only where needed
- compare cost and behaviour
- verify reset/reuse does not leave stale CCD state

## Determinism

For regression tests, control:
- initial transforms
- velocities
- tool impulse vectors
- fixed step count
- random inputs

Do not claim bitwise determinism unless the package/build mode actually guarantees it.

## Acceptance

Run the same scripted scenario at different render rates. Physics outcome should remain materially consistent, with no runaway catch-up after backgrounding.

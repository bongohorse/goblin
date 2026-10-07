# Issue #60 — blocked independent finite-step validation

Decision (2026-10-07): **BLOCKED for a later FullRig torso A/B.** Stop at the independent first-step proof, before upright tracking. This is a proof/reference-resolution blocker, **not an established Rapier defect, external support torque, or PD instability**. Issue #60's complete acceptance criteria are not fulfilled. No standing/controller adoption recommendation.

Base main af2c78adf33071b460e2f84361128e36298025a1; difference from research merge840c5b1 is only repository/browser documentation. Preregistration committed9da0a57 before simulation: [protocol](../torso-torque60-protocol.md). Final clean measurement harness **26fd007075e8ca3bdcedd2f40202f7bce244ff3a**, dirty=false; source/harness digest **d6c30d4eee87d0443978eb69d6b6f67dc568bd615cdd99dc3560419ab6648f28**. Later documentation/evidence commit changes no measurement code. Node24.21.0, Rapier0.21.0/pinnedb716d375, Windows10.0.26300/x64, Ryzen5600X; actual dt .01666666753590107s, Solver32/internalPGS1. Config/config-ID/experiment-ID, run UUID, exact host and protocol SHA are embedded in gate-b.json. Case identity is the reader-enforced ordered tuple (connected, synthetic, method, signed direction, missing_reaction); repeat index1..5. No seeds/randomness. CLI only; no browser/native Hidden/GPU/production acceptance.

## What was measured

Each of five sets creates25 entirely fresh two-dynamic-body worlds. World freed in finally; no fixed base, gravity, body damping, contact, motor or transform correction. Eight signed/combined world directions have separate free torque, free instantaneous impulse and connected shoulder cases; one connected missing-reaction negative. Torso/upperArmL shoulder uses baseline capsule masses/dimensions and offset anchors. Distinct body frames; free synthetic bodies additionally have anisotropic principal values and rotated principal local frames. Requested vector cap .15Nm, identical world +tau/-tau, public APIs/reset/wakeup. The instantaneous impulse control observes immediately after the API call and **does not call world.step**; it proves the instantaneous inertia/impulse mapping, not sustained-torque integration.

| First-step group, per set | Result | Independent measurement |
| --- | --- | --- |
| Free impulse, eight directions | 8 pass | Max deltaomega error1.5265894e-8rad/s; spin+orbital residual4.1444086e-10kg*m²/s |
| Free continuous torque, eight directions | 8 fail | Frozen initial-frame velocity error2.4888597e-5 to3.2731001e-5rad/s versus1e-5 |
| Connected continuous torque, eight directions | 8 fail | Frozen constraint-response velocity error2.3345942e-4 to9.0140373e-4rad/s versus1e-5 |
| Missing opposite torque | Negative detected | Net discrete momentum .00250000962745kg*m²/s, >100 times1e-7 |

All physical payloads exactly identical across five fresh repetitions on this host; no cross-host determinism claim. Across primary cases max independent inverse-tensor relative error9.0530608e-8 (<1e-5), accumulator error5.9604645e-9Nm (<1e-7), initial anchor gap1.1243956e-8m (<1e-6). No cap violation. PRE-frame tensor plus orbital residual reaches2.42326795e-6kg*m²/s (>1e-7). POST-physical tensor plus orbital residual for every paired case lies below the predeclared finite tensor-rotation integration bound; this looser bound does not turn any frozen velocity/discrete-momentum failure into pass or prove exact conservation.

The original #54 native rotated-body probe is reproduced without changes:1.0696400756099659e-6kg*m²/s, strict_1e_6_pass=false. It remains a separate negative result, not rescued by this new API study. Requested direct torque is not native FullRig motor effort/saturation.

## Diagnosis and why work stopped

Initial clean harness43cb630 deferred synthetic additional mass properties until its first physics step, yielding zero mass/inertia in pre-observation. That attempt is **invalid_harness**, raw data retained separately, excluded from all pass counts. Public recomputeMassPropertiesFromColliders correction8287189 applies before any observation/actuation, without warm-up or parameter/tolerance changes. See [initialization correction](../torso-torque60-initialization.md).

After correction the instantaneous matrix/impulse controls pass while the sustained-torque first-step predictions miss. The predeclared constrained oracle solves the initial frozen-frame impulse system. It does not integrate evolving inertial/constraint geometry. Pinned local source explicitly divides dt by solver iterations and applies per-substep gyroscopic correction using the previously integrated orientation:

- vendor/rapier/src/dynamics/solver/staged_island_solver/init.rs:77–119 (32 substeps at this configuration).
- vendor/rapier/src/dynamics/solver/staged_island_solver/worker.rs:293–311 (body rotation composed with principal frame each gyro pass).
- vendor/rapier/src/dynamics/rigid_body.rs:1302–1399 (persistent user torque/reset).

**Inference:** finite integration/frame/gyro terms can account for a mismatch with the frozen leading-order response. No independent finite-step solution or convergence study was performed to attribute the exact measured remainder. The protocol's Float32-only argument for1e-5rad/s/1e-7kg*m²/s is insufficient for this finite nonlinear step. Therefore this report does not claim a physical API failure. Replacing the reference or enlarging tolerances after seeing these data would require explicit preregistration in a separate diagnosis scope; no such after-the-fact pass is made here.

Per stop rule, no on/off upright tracking, partner counterrotation over time, physical yaw/q-sign/wrong-sign/damping fixtures, or FullRig balance runs were started. Controller algebra has focused yaw/q-sign/cap/domain/world-damping tests only; those are not the missing physical proofs. Gate B remains blocked; full Gate C experiment and standing acceptance remain incomplete.

## Spec

Self-review against Issue60, fixed baseaf2c78a; not an independent human review. Gate A has a bounded error/units/frame/damping/cap/analytical gains contract. Public instantaneous impulse/world-inertia evidence is positive. Continuous first-step independent validation fails, so further criteria are explicitly pending. **P1 unresolved evidence blocker:** frozen oracle/tolerance resolution insufficient to distinguish finite-step dynamics from an API/constraint problem. Nothing adopts these torques in production.

## Engineering

Fixed public mass initialization before observation; excluded invalid initial data. Fixed reader to recompute exported analytic oracle and momentum/velocity redundancy instead of trusting pass flags; finite/unknown-field/identity/repetition and false-pass corruption tests. Invalid angular velocity now rejected. Blocker CLI exits2, so valid negative evidence is not operational success. No remaining known code finding within minimal blocker scope. Config and raw measurements finite; all worlds disposed. No src/runtime, rig, dependency, vendor, existing baseline, workflow or browser-config changes.

Final local verification: **71/71 tests**, npm run build pass with existing large Rapier chunk warning. Fresh unchanged baseline regressions: passive70/handL, FB20=3600/timeout, FB1=187/handL+handR, all checkpoint/velocity/contact deviations0. Existing Targetstudy22 hashes and20 stored readers pass. FullRig runs here are solely those existing reference regressions. Manifest hashes cover five JSON artifacts including invalid initialization; the invalid file is never accepted by the strict final reader. Final Draft PR CI is linked in the GitHub handoff, not a historical run. Research-only two-way rollback: remove these scripts/tests/new documents; blast radius low, no runtime or physics default changes.

## Reproduction and next decision

Use Node24.21.0, npm ci, clean checkout. Write measurements outside the checkout to preserve clean provenance:

```powershell
node scripts/torso-torque60.js <external-output-directory>
# Expected exit2; gate-b.json status blocked; eight impulse passes /16 misses /one negative per set.
node scripts/torso-torque60-regression.js <external-output-file.json>
npm test
npm run build
```

Import validateGateB from scripts/torso-torque60-reader.js to read the final report; verify sha256.json before trusting repository artifacts. That reader intentionally rejects incomplete, nonfinite, mixed-ID, falsely passing or invalid-initialization reports. It checks structural/measurement consistency, not a cryptographic signature for arbitrary host metadata.

Recommended next scoped task: establish an independent continuous/finite-step two-body reference with anisotropic inertia, moving principal frames, gyroscopic terms and joint/orbital reaction; compare the retained exact minimal cases and derive resolution **before** new acceptance measurements. Keep these failures and the old #54 strict-false probe unchanged. No gain/solver/rig tuning to hide the discrepancy. Only after that proof carries may the original small-tilt tracking protocol resume. Any later FullRig A/B additionally needs secondary standing/support/drift/joint-error criteria and an explicit conflict policy for shoulder/pose motors; shoulder is merely this primitive's reaction partner, not a prescribed production distribution. COM/ankle/hip feedback remains later work.

**Stopped with blocker handoff. Draft only; no merge/deployment or issue closure.**

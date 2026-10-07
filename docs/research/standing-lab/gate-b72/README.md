# Torso Gate B measurement decision — Issue #72

**Decision: BLOCKED, not physics-approved.** Base main dd0cfed3ab14c0456152877cf85212c12b55e430. Draft research/decision artifacts only; no merge/deployment/upright experiment. Versioned [protocol](protocol.md), [frozen config](config.json), [derivation](derivation.md), [raw fixed attribution](attribution.json), [budget method v2](budget.json), [historical assessment](historical-assessment.json), [sources](sources.json) and [manifest](sha256.json).

## Purpose and resulting decision

The later #60 proof is only public bounded internal torso torque: world frames, vector cap, two dynamic reaction partners, conservation and a later separate small-tilt experiment. It is not Standing/FullRig/production acceptance. The application gives terminal tilt .01rad/speed .02rad/s at6s, not an arbitrary percent of cap. Derived zero-speed constrained sensitivities show cross-axis coupling; a scalar inertia cannot predict general motion. Reference/input/engine/decision requirements remain separate.

No uniquely justified positive acceptance threshold follows from cap and mass without a chosen allocation and a valid transient error envelope. Protocol v1 deliberately records physical limits, allocation and engine envelope as **null**; no future runner may turn null into pass or infinity. The complete future one-step matrix and failure semantics are specified, but blocked from execution until a separately approved revision supplies those missing bounds. No small-upright measurement is included in this protocol.

Independent application ceilings: persistent6s velocity bias <=1/600rad/s would consume the full .01rad tilt allowance (not an approved engine endpoint criterion). Free torso transverse principal-axis coherent external torque <=5.33741935484e-5Nm gives .01rad at6s; equivalent canonical impulse8.895699388678033e-7 kg m²/s, .000355827956989 of cap derived from mechanics rather than selected as a percent. This scenario neither converts a net one-step H residual into a specific torso torque nor bounds nonlinear connected dynamics. The initial free-arm minimum-inertia screen was an output-definition error; budget-initial.json is retained and explicitly withdrawn in derivation.md. This self-review correction does not rescue the historical maximum and changes no engine inputs.

## Exactly one preregistered attribution

Protocol/config published at c4e8168 before measuring. Clean measured harness **5632c0497d8fd151b4529fb3a0f0e105c6d9b536**, dirty=false, build_id5632c0497d8fd151b4529fb3a0f0e105c6d9b536:f70e1132dc7b0bbe6c8094c458f7ab5fc1a448f78a1b0470b4141a5d67e383de. Node24.21.0, Windows host/CPU in raw provenance, Rapier0.21.0/pin b716d375. Five free and five connected worlds; fixed +X/-X .15Nm, same capsules/rotations/PRE, rest, one actual T=.01666666753590107s, Solver32/internalPGS1, no contacts/gravity/damping/controller/motors.

|case|angular endpoint error rad/s|linear m/s|rotation rad|physical paired H kg m²/s|
|---|---:|---:|---:|---:|
|free|3.25514201119584e-5|0|1.4191721785729384e-4|1.5567769788853186e-7|
|connected|5.439398172127899e-6|1.5543548862481209e-6|5.942195920402866e-5|2.0178709878702386e-8|

Initial quantized anchor gap1.1243955518381651e-8m; continuous connected reference aligns anchors, alignment difference recorded separately. All five repeats per case identical. 128→256 reference angular differences3.0e-15/free,4.0e-16/connected; physical reference H errors <=6.95e-18, work <=5.32e-18. These observed convergence/identity checks are not a certified interval proof.

**Interpretation:** this particular connected residual is smaller than free. Connection changes the ideal mechanics and numerical constraints simultaneously; compare each to its own continuous solution. This does not isolate ERP, establish a Float32 floor or give a domain-wide staged-solver error bound. No additional diagnosis or sweep was performed after this result.

## Historical evidence assessed after derivation

Canonical positive maxima still angular1.0560269743758851e-4rad/s, POST H1.2551022966893554e-6. Angular is below the full-allowance persistent-bias ceiling, but is a different measurement object, so no pass follows. H exceeds even the torso coherent-bias scenario by about1.41x; that scenario is conditional and not evidence that a real constant external torque exists. No limit enlarged to accommodate it. Nonmonotone refinement remains evidence against an asserted universal asymptotic bound.

Missing reaction carries paired-zero-target H .0025000026469692133, clearly above the conditional screen; error versus its correctly unpaired external-torque reference is only1.1986238738059732e-8. Distinguish these targets. Historical wrong-frame reference perturbation has minimum .012560444332534278rad/s separation; this is NOT a real misframed Rapier-command test. Applying torque with an erroneous extra dt would suppress response by T; free-body norm sensitivity yields a conservative separation >=.02558803646rad/s for cap and capsule inertia. Units negative is analytical only here. Future protocol explicitly requires actual command negatives before claiming empirical discrimination. Initial-input sensitivity <=3.1829209206593685e-7rad/s is a finite-case comparison, not an all-operation or domain bound. Old 16 False/native#54 flags remain unchanged.

## Decision options

1. **Recommended: keep Gate B/#60 blocked.** Review the versioned measurement model and choose a justified application-error allocation plus evidence strategy for an engine/observable bound over the exact intended domain. This is a decision/methods task, not automatic authorization for another sweep or upright. The one allowed attribution is exhausted.
2. A strictly limited future proof may certify only declared command/impulse/API invariants and these finite fixtures, explicitly without a6s controller correctness claim. This narrower claim must be separately approved and versioned; do not label it the missing upright acceptance.
3. Reject accepting historical maxima plus a margin, choosing best-looking refinement, allowing arbitrary cap percentages, or treating repeated identical worlds as independent uncertainty estimates.

This ticket supplies a decision-ready blocked protocol rather than inventing pass thresholds. No Rapier defect, hidden support, PD instability or standing success established. #60 stays stopped; native#54 unchanged.

## Reproduce and checks

Node24.21.0, npm ci with unchanged lockfile. At the **measured harness5632c04**, output outside the clean worktree:

    node scripts/torso-gate-b72-attribution.mjs <outside>/attribution.json

This documents the10 worlds already run, not permission to run new experiments. At the final evidence head, budget calculation and stored-data verification only:

    node scripts/torso-gate-b72-budget.mjs docs/research/standing-lab/gate-b72/config.json <outside>/budget.json
    node scripts/torso-gate-b72-reader.mjs docs/research/standing-lab/gate-b72/attribution.json
    node --test tests/torso-gate-b72.test.js
    npm test
    npm run build

Analytical isotropic/principal-axis controls, constrained anchor acceleration and linearity checks; first-order left-endpoint quadrature convergence with exact midpoint control is only an analytic integration example, not RK4 or Rapier order evidence. Reader recomputes endpoint/reference/H/convergence and rejects missing case/repeat, corrupted H/POST/accumulator/convergence. SHA256 of new siblings and unchanged historical manifests checked. Final CI/review links belong on PR/Issue. Browser N/A: CLI-only, no new browser or GPU claim.

## Sources and limits

[JCGM100, sections3.1/5.1/5.2](https://www.bipm.org/documents/20126/2071204/JCGM_100_2008_E.pdf) supplies measurement-model/sensitivity/correlation methodology; it certifies none of these bounds. This deterministic scenario calculation is not a GUM confidence interval. Pinned Rapier [init.rs](https://github.com/dimforge/rapier/blob/b716d375efc0201003f0cd9ef7168eee0b62c177/src/dynamics/solver/staged_island_solver/init.rs) and [worker.rs](https://github.com/dimforge/rapier/blob/b716d375efc0201003f0cd9ef7168eee0b62c177/src/dynamics/solver/staged_island_solver/worker.rs) establish32 temporal stages on this no-contact path, velocity increments/gyro/constraints/positions; not a universal public API guarantee or discretization bound. Installed dist/dynamics/rigid_body.d.ts is authoritative for addTorque/resetTorques/applyTorqueImpulse/userTorque. Vendor and dependencies remain unchanged.

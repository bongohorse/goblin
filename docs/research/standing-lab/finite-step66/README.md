# Issue #66: finite-step reference and decision

Dependency: Draft PR #65, exact base909d0ae9cf166bf3c0e5a2600831e748765e4362. CLI diagnosis and evidence only. #60 remains stopped. Original PR65 data/limits and native #54 miss remain unchanged.

## Decision

The frozen PRE initial-response oracle is correctable: it omits moving inertia, gyroscopic motion and evolving spherical reactions over a finite horizon. The independent continuous Newton/Euler reference is viable for this one-step two-body fixture. Canonical discrete Rapier residuals still exceed retained diagnostic markers. No reference methods blocker; an integration/measurement acceptance question remains.

Recommended separate decision: adopt the independently validated continuous endpoint and contemporaneous POST-world H as comparison objects for a future versioned Gate-B check; keep frozen impulse tests as initial-response controls. Before granting actuation acceptance, specify a physically useful engine-error requirement independently of these residuals, or commission a narrow single-precision/integration diagnosis. No larger tolerance is proposed. Do not select m=8 because it looks best, call the reversal a proven Float32 floor, or reclassify the old16False. #60 cannot resume on this report; no standing/COM/FullRig experiment.

## Method and validation

[Preregistration](../finite-step66-protocol.md), published at b99c349 before reference measurements, contains equations, SI units, five hypotheses, matrix and fixed budgets. World vectors; active xyzw local-to-world q; body and principal rotations compose Iworld. Physical H uses SAME-time q,omega,COM,v, including xCOM cross mv. PRE pseudo-H freezes initial tensor and lever arms.

Standalone double ODE imports no Rapier, Three or project math and copies no solver. Classical RK4 integrates q,x,v,world omega and external work using Newton/Euler gyro and acceleration-level spherical reaction. No ERP, PGS, support, endpoint fitting or constraint projection after initialization. Connected reference anchors start congruent in double; maximum COM alignment from observed PRE1.09877e-8m is exported. Rapier retains exact original Float32 starts, including tiny anchor error. ERP sensitivity to this error is not bounded by the input-only reference study.

T=0.01666666753590107s (actual Float32 timestep). Both synthetic and capsule seeds pass six controls: static/null torque; analytic isotropic forcing with initial omega; analytic anisotropic principal axis; nonzero free gyro H/E; connected stationary; connected moving with matching initial anchor velocities, independently checked acceleration equality/work/H. Twelve controls pass. Max validation H residual3.30e-17kg m²/s, E/work5.75e-18J. Paired64/128 angular differences≤3.45e-14rad/s. Full8/16/32/64/128 sequences are raw; differences near roundoff do not establish a measured fourth-order slope. RK4 order is not a rigorous global error bound.

The first connected-moving pilot used velocities from unnormalized input q; [invalid pilot](invalid-initial-velocity.json) is preserved/excluded. [Correction](../finite-step66-initialization.md) at clean48cdbb8 preceded Rapier comparison. No equation, RK4 or threshold changes.

## Original reproduction and source path

[Original reproduction](original-reproduction.json) ran at clean909d0ae with Node24.21.0. All first_steps/repetitions/historical_native_probe physically match original byte-for-byte as JSON.stringify payloads. Eight impulses pass, sixteen torque positives fail, missing reaction fails; Exit2 expected. Old raw/protocol byte-identical to PR65 base (git diff checked).

[Source evidence](source-evidence.json): SHA256/excerpts from installed0.21.0 sourcemap and read-only pinned b716d375/js-v0.21.0/Rust0.36.0. World.step forwards once to wrapper/raw native pipeline then staged island solver. In this no-contact/no-CCD/extra0 fixture, numSolverIterations32 sets32 temporal integration/constraint stages at dt/32; internalPGS1 is a separate constraint-pass count. Gyro uses evolving orientation. This is not32 additional public steps, not CCD subdivision, and not a cross-version API guarantee.

## Results and measurement boundaries

[Raw diagnosis](diagnosis.json), [config](config.json), [ratio/order curves](refinement-trends.json). Five fresh complete identical physical sets:17 cases (16 positives + missing-reaction negative) × five refinements =425 observations. New world per case/refinement/repeat, exact original PRE and constant world moments, solver32/internalPGS1. Powers-of-two dt preserve m*dt=T exactly.

Wrong-frame references differ≥.0125604rad/s. Missing counterpart gives physical delta H≈.0025000kg m²/s in every refinement (>100x paired1e-7 marker), while closely matching the unpaired external torque integral. Agreement with an unpaired reference cannot turn it into a paired positive.

Paired maxima; velocity is max angular/linear norm, maxima below are angular rad/s. H units kg m²/s:

|Steps m over same T|Velocity error vs continuous|Physical H error|Velocity marker passes /16|H marker passes /16|
|---:|---:|---:|---:|---:|
|1|1.05603e-4|1.25510e-6|2|4|
|2|6.40079e-5|7.57478e-7|10|6|
|4|3.76917e-5|4.09066e-7|12|10|
|8|2.92519e-5|2.23148e-7|12|12|
|16|4.66701e-5|1.42276e-7|10|14|

Largest paired continuous-minus-PRE correction≈1.00683e-3rad/s; old PRE miss≤9.01404e-4rad/s. Discrete-minus-continuous is smaller but nonzero. Individual ratios and log2 ratios are exported; mixed/reversing curves preclude a single observed integration order. Initial decline supports a discretization contribution. Reversal is consistent with accumulated precision/constraint effects but does not isolate causation. No Rapier defect/controller instability inferred. Free-body anchor fields are geometry diagnostics, not joint constraints.

Budget fixed before measurement: reference velocity/angle/H reporting uncertainty floor1e-10 in respective SI units, position1e-11m, conditional on passed analytical/convergence/constraint checks. Conservative validated-fixture budget, not theorem for arbitrary states. Finest differences are much smaller. Separate ideal-declared vs quantized-initial reference endpoint sensitivity≤3.18293e-7rad/s; finite-case input sensitivity, not engine accumulation bound. Reference normalizes orientation/aligns anchors explicitly. Float32 unit roundoff2^-24≈5.96e-8 is a relative operation scale, not absolute H/velocity tolerance or measured floor. ERP/truncation/rounding accumulation are not independently bounded. Retained1e-5 velocity and1e-7 physical H are diagnostic markers only. Original PRE flags remain false.

## Reproduction and provenance

Node24.21.0; npm ci. Commands:
- node scripts/torso-torque60.js /external/original (expected Exit2)
- node scripts/finite-step66-diagnosis.js /external/final
- node scripts/finite-step66-reader.js /external/final/diagnosis.json
- node scripts/finite-step66-reader.js docs/research/standing-lab/finite-step66/diagnosis.json
- npm test
- npm run build

Runner requires clean tree; use output outside the worktree. Measured harness d6091ce85b50173ee57034163e0d09ac7dbeab22 was clean; input digest49d4c9e92141976573c45647b99bad6e8a1ffb8aabc3c945b382a651e170a96a. Evidence-only commits preserve this digest. Actual OS/CPU/Node, Rapier/pin, protocol/original hashes recorded in raw provenance. Final evidence head/CI linked in Gate-C GitHub comment. [Checks](checks.json), [review](review.md), SHA256 manifest accompany the report.

Reader recalculates analytical controls, references, endpoint errors, physical POST H, PRE pseudo-H, exact horizon/case set/repeats and negatives. Corruption tests cover raw velocities, dt, missing cases, frame flags/config and paired-negative flags. This verifies internal consistency, not authenticity of an untrusted replacement state sequence; hashes/history provide traceability.

Browser N/A: CLI/WASM only. No browser/GPU/arena/standing performance claim. No merge/deployment/production/baseline/dependency/configuration changes.

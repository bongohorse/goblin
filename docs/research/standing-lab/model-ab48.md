# Controlled native motor model comparison - Issue #48

Decision: retain the existing ForceBased100/12 Solver32 Lab reference. No model/default/production switch. AccelerationBased100/12 is a weaker response on this frozen rig; the one analytically calibrated pair is only scalar-equivalent and shows mixed or worse full-rig behavior. No consistent benefit justifies advancing it here. No balance controller, merge or deployment.

## Protocol and provenance

The protocol was published in [Issue #48](https://github.com/bongohorse/goblin/issues/48) before full-rig measurements. The versioned [preregistered protocol](model-ab48/protocol.md) preserves that plan. Exactly one optional AB gain pair2343.75/281.25 was admitted after isolated calibration, no tuning/sweep. Frozen baseline rig, dt1/60, Solver32, targets, contacts, limits, materials and .05rad/.08m invalid guards. Five fresh normal worlds per six configs; five separate diagnostic worlds per original100/12 model/cap. Diagnostics have StandingTime=null and never continue an invalid. Config/result schema3 and namespace native-model-ab-v3 keep original passive-v1 and ForceBased-v2 contracts intact.

Clean code/harness/measurement head `ac3ebadd7dea7e2a3f3d53062afbcdf5065e44bd`, dirty=false; build ID `ac3ebadd7dea7e2a3f3d53062afbcdf5065e44bd:34ce029f32b7382f9fcce5f4bdd25ae95cae0e70ba3e26af63f6d884a999d19e`. Locked dependencies, Nodev24.21.0, win32 10.0.26300, AMD Ryzen 5 5600X 6-Core Processor. Vendor pinned b716d375efc0201003f0cd9ef7168eee0b62c177 remains unchanged. Final evidence/documentation commit is separate; its CI will be linked on the PR. Full raw50 runs, config IDs, fixtures, CPU samples and reports are in [model-ab48](model-ab48/).

## Local source and isolated fixture evidence

Installed @dimforge/rapier3d-compat0.21.0 impulse_joint.d.ts supplies AccelerationBased, revolute configureMotorModel(model) and spherical configureMotorModel(axis,model). The pinned [motor_model.rs](https://github.com/dimforge/rapier/blob/b716d375efc0201003f0cd9ef7168eee0b62c177/src/dynamics/joint/motor_model.rs) returns cfm_coeff for AB versus cfm_gain for FB. [Constraint builder](https://github.com/dimforge/rapier/blob/b716d375efc0201003f0cd9ef7168eee0b62c177/src/dynamics/solver/joint_constraint/generic_joint_constraint_builder.rs) uses dot_jj*cfm_coeff+cfm_gain: AB scales by effective inverse inertia. Thus angular gains are s^-2/s^-1 for AB versus Nm/rad and Nm*s/rad for FB; identical100/12 are not equal actuation strength. [Generic joint](https://github.com/dimforge/rapier/blob/b716d375efc0201003f0cd9ef7168eee0b62c177/src/dynamics/joint/generic_joint.rs) converts max_force to max_force*dt impulse, with angular bounds in the builder. Configured angular cap is physical Nm per axis for either model, not a vector-norm cap. Full-rig actual effort/saturation remains N/A.

Evidence:24 real saturated cap/reaction cases (both models/joint types/signs, .05/1/20Nm),36 tracking cases with rotated bases, every spherical axis and combined targets; motor-off/wrong-sign/wrong-axis/missing-cap negatives. Two dynamic centered r.4 spheres1/2kg give I=.064/.128kg*m^2 and I_eff=.04266666666666667. AB2343.75/281.25 equals FB100/12 divided by I_eff. Over240steps, hinge and spherical, caps20/1: max angle difference9.52e-8rad and velocity difference1.057e-6rad/s, below predeclared1e-5/1e-4. Doubling masses leaves AB first response identical; FB first-step difference.005436325rad. This does not equalize all coupled rig inertias. Raw [fixture results](model-ab48/fixtures.json); reproduction `node scripts/motor-model48-fixtures.js`.

## Normal runs (five identical repeats each)

| Model/gains | Cap Nm/axis | Steps/time s | End/body | Drift peak/end m | Both feet loaded fraction | Tracking peak rad | Anchor peak m | Limit peak rad | Axis peak |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ForceBased100/12 | 20 | 3600/60.000000 | timeout/none | 0.194126/0.084030 | 0.916667 | 0.148908 | 0.000314006 | 0.000159224 | 0.000846112 |
| AccelerationBased100/12 | 20 | 69/1.150000 | non_foot_contact/handL | 0.410533/0.410533 | 0.913043 | 2.300463 | 0.001239845 | 0.003364019 | 0.008283360 |
| AccelerationBased2343.75/281.25 | 20 | 252/4.200000 | non_foot_contact/head | 1.398995/1.398995 | 0.142857 | 0.400546 | 0.000463132 | 0.000546199 | 0.002591790 |
| ForceBased100/12 | 1 | 187/3.116667 | non_foot_contact/handL,handR | 0.864053/0.864053 | 0.165775 | 1.284277 | 0.000380772 | 0.001974002 | 0.000726585 |
| AccelerationBased100/12 | 1 | 73/1.216667 | non_foot_contact/handL | 0.439567/0.439567 | 0.904110 | 2.300000 | 0.002039683 | 0.002989080 | 0.006587928 |
| AccelerationBased2343.75/281.25 | 1 | 242/4.033333 | non_foot_contact/head | 0.986203/0.986203 | 0.144628 | 1.243974 | 0.000457045 | 0.001288580 | 0.002626507 |

Support fraction means both measured foot normal loads >0, no newly invented minimum load/standing acceptance. Fractions cover different normal durations and cannot alone imply better support. Drift is the existing COM horizontal drift measure. Peak tracking and joint errors cover the whole executed normal trajectory. Exact end pelvis/torso quaternions, per-joint tracking/axes, foot peak/end loads, contacts and onsets are recorded for every run, not substituted by a scalar success claim.

| Model/gains, cap | FootL peak/end N | FootR peak/end N |
| --- | --- | --- |
| ForceBased100/12, 20 | 45.866628/45.349552 | 43.850119/43.528298 |
| AccelerationBased100/12, 20 | 104.911968/39.758253 | 305.637973/13.892836 |
| AccelerationBased2343.75/281.25, 20 | 79.396458/0.000000 | 40.348963/0.000000 |
| ForceBased100/12, 1 | 60.348502/21.783689 | 61.173524/25.261398 |
| AccelerationBased100/12, 1 | 222.226227/15.355024 | 105.240982/15.918006 |
| AccelerationBased2343.75/281.25, 1 | 79.434342/65.497713 | 65.724092/65.062663 |

All30 normal results are numerically valid. Five physical sequence hashes, metrics, contact onsets, end-state observations and first terminals match exactly per config; all24 normal repeat comparisons pass existing tolerances. Passive70/handL and v2-FB20/3600,1/187 compare against original #39/#46 references with deviation0 in all six metrics. Study-FB checkpoints equal v2 exactly; original IDs unchanged.

## Separate post-contact diagnostics

| Original100/12 model/cap | Steps/end | First contact | First head impact | Limit peak rad | Anchor peak m | Drift peak m |
| --- | --- | --- | --- | --- | --- | --- |
| ForceBased/20 | 3600/diagnostic_horizon | none | none | 0.000159224 | 0.000314006 | 0.194126 |
| AccelerationBased/20 | 3600/diagnostic_horizon | 69:handL | 90 | 0.003364019 | 0.001239845 | 0.922183 |
| ForceBased/1 | 3600/diagnostic_horizon | 187:handL,handR | 192 | 0.004924025 | 0.000380772 | 1.451384 |
| AccelerationBased/1 | 3600/diagnostic_horizon | 73:handL | 95 | 0.002989080 | 0.002039683 | 1.009303 |

All20 diagnostic worlds reach3600, no invalid, within unchanged guards. Repeats match physical sequence, measurements and contact chronology exactly. Safety under these observed floor impacts is bounded evidence, not a perturbation test suite or Standing result; StandingTime always null. No calibrated-gain contact continuation was run.

## Matched CPU segments

Node wall timings in ms on the same Windows host, rendering excluded. First60 normal steps, alternating model order,3 fresh warmup worlds and5 measured worlds per pair,300 samples each. All segments complete before contact. No sample trimming. Observed minimum positive consecutive performance.now delta: 0.000100000ms; this is not guaranteed timer resolution. Full raw samples and per-world quantiles in [report.json](model-ab48/report.json).

| Pair/cap/model | world.step median/P95/max ms | Commands median/P95/max ms | Observation median/P95/max ms |
| --- | --- | --- | --- |
| same-numbers/20/ForceBased | 0.329100/0.407900/0.690700 | 0.005700/0.008800/0.013800 | 0.072500/0.089200/0.259000 |
| same-numbers/20/AccelerationBased | 0.353000/0.418600/0.608300 | 0.006000/0.008900/0.011700 | 0.080400/0.103900/0.571600 |
| scalar-calibrated/20/ForceBased | 0.329800/0.380600/0.638800 | 0.005600/0.007200/0.034100 | 0.072800/0.085300/0.157900 |
| scalar-calibrated/20/AccelerationBased | 0.332700/0.423100/0.649000 | 0.005800/0.008600/0.015900 | 0.076500/0.110000/0.506500 |
| same-numbers/1/ForceBased | 0.328200/0.415400/0.661300 | 0.005600/0.007600/0.016300 | 0.072500/0.101200/0.176700 |
| same-numbers/1/AccelerationBased | 0.351100/0.434700/0.698100 | 0.006000/0.008700/0.016200 | 0.080200/0.103200/0.534800 |
| scalar-calibrated/1/ForceBased | 0.330100/0.589100/0.753000 | 0.005900/0.013300/0.019500 | 0.073400/0.173300/0.232300 |
| scalar-calibrated/1/AccelerationBased | 0.328700/0.503200/0.673600 | 0.005700/0.010000/0.016600 | 0.075600/0.134400/0.564100 |

Same-numbers AB physics medians are ~7% above FB on this host. Calibrated medians are close; cap1 FB per-world medians vary .3215-.4896ms versus AB .3233-.3442ms, so no CPU superiority/significance claim. Different trajectories/contact durations are not comparable total cost. Browser/GPU timings and weak-device budgets are not inferred from this Node measurement.

## Decision by question

1. Same numeric100/12: AB both caps falls near passive duration (69/73steps), with ~2.3rad tracking error versus FB20 .149rad/60s and FB1 1.284rad/187steps. Lower absolute AB1 drift at earlier failure is not a stable-standing benefit. Retain FB; do not treat upstream generic default recommendation as evidence for this rig.
2. Scalar-calibrated2343.75/281.25: AB20 contacts head at252steps, zero end foot loads, larger1.399m drift, worse support/tracking/joint errors versus FB20. AB1 reaches242 versus187steps and slightly smaller peak tracking/limit error, but drift is greater, both-loaded fraction lower, peak anchor/axis errors greater and head is first failure. Mixed secondary metrics and host CPU variability do not justify a winning candidate or default switch. Keep this bounded negative/mixed result for future explicitly scoped experiments; no further gains searched.

60s FB20 remains a time criterion, not full standing approval: drift/tracking are nonzero; perturbation recovery, complete secondary thresholds, weak-device/GPU/native visibility and production CPU budget remain unaccepted. Actual full-rig motor torque/saturation cannot be separated from contacts/limits by the available API. Broader balance/recovery work is deferred.

## Browser / review / CI

Clean built production browser: direct Playwright1.63.0, Windows10.0.26300 x64, Edge154.0.4258.53 headless. Browser and harness build IDs equal the clean code head above. All six Study modes match Node references within original tolerances (deviation0); actual rAF resume to normal terminal, no continuation. v2 motor20 has3600steps/60s (~60.007wall seconds), v2 motor1 ends187/both hands, v1 ends70/handL. Two-step incomplete Study exports validate schema3; mode/reset/pause/step/download/reload/assets/20-reset resource/lifecycle checks pass, mobile landscape touch/overflow passes, shared production start/head-click score/reset passes. No browser console errors/warnings or failed responses. Retained disposal references reject; canvas removed. [Raw browser report](model-ab48/browser/browser-qa.json).

Screenshots actually inspected: [AB100/12 terminal](model-ab48/browser/study-acceleration-20.png), [scalar-calibrated20 terminal](model-ab48/browser/study-calibrated-20.png), [mobile landscape](model-ab48/browser/motor-mobile-landscape.png). Mobile controls fit horizontally and scroll vertically. The fixed existing Lab camera shows the drifting fallen calibrated rig at the frame edge; no camera tuning was part of this experiment. Native tab hidden was not observed (false); the installed synthetic visibility handler was checked separately. Headless rendering is not a GPU-performance or weak-device approval. Full-rig torque/saturation remains N/A. Local build reports the existing large Rapier chunk warning; no runtime/assets/dependency changes in the game.

## Spec

Self-review against #48 and fixed base355d74d: API/source/fixtures, predeclared two questions, six immutable configs,30 normal+20 separate diagnostic worlds, repeatability/baseline checks, matched CPU, versioned reader/export, clean browser evidence and decision complete. No remaining evidenced in-scope spec finding. Draft and final-head CI are recorded directly on GitHub. Issue stays open for independent review.

## Engineering

P2 fixed before measurement in `scripts/motor-model48.js::validateModelRun`: an outer normal report could claim a different termination/invalid cause from its validated inner result, and missing measurements could remain unchallenged. Reader now checks termination/invalid consistency and rejects incomplete measurements; negative tests reproduce both corruptions. Canonical config validation rejects gains/units/frame/rig/solver/cap changes, provenance corruption and false same-step velocity; invalid latch stops with null time; diagnostic cannot claim normal Standing and calibrated diagnostics are rejected. Old v1/v2 validation, resource lifecycle and production imports remain covered.

No remaining evidenced engineering finding after58/58 tests, production build, clean50-world measurements and browser QA. This is self-review, not independent PR approval. Recommend reviewing/merging only the bounded experiment and evidence in a later authorized task; retain ForceBased, no motor production approval. Final CI links and actual final head are on the Draft PR/Issue48.


## Reproduction

Use Node24.21.0 and `npm ci`. Run from the repository root:

```text
npm test
node scripts/motor-model48.js
node scripts/motor-model48-fixtures.js
npm run build
```

The study runner first creates `../.standing-tools/model48` (outside tracked code),
so the subsequent fixture output parent exists. Override `GOBLIN_MODEL_OUTPUT`
(directory) and `GOBLIN_MODEL_FIXTURE_OUTPUT` (file in an existing directory) for
another external evidence location. Keep the measured worktree clean. For the
production browser check set `GOBLIN_MODEL_OUTPUT` to that fresh study directory
and `GOBLIN_STANDING_EVIDENCE_DIR` to a separate external browser directory, then
run `npm run lab:browser`. The explicit study-output environment is required to
activate the six Study cases and compare their actual results; without it the
harness runs the existing v1/v2 suite. On Windows the harness uses installed Edge;
on other hosts set `GOBLIN_CHROMIUM_EXECUTABLE` as needed. Browser/OS differences
are not assumed deterministic or GPU-equivalent; keep their results separate.

`validateModelRun` reads/validates each raw normal or diagnostic report; normal
inner results also use `validateResultProvenance`. `model-ab48/sha256.json` records
SHA256 for all raw evidence files and the preregistered protocol. No generated
outputs are runtime assets and no deployment is required for these local checks.

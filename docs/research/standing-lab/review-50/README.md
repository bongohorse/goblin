# Review #50 ? PR #49

Recommendation: merge-ready for a separate authorized merge decision once final-head CI passes. Retain ForceBased100/12; this is approval of the bounded experiment/reader/evidence only, not motor-model adoption or full standing acceptance. This is another **self-review**, not independent GitHub approval. No merge or deployment performed.

## Scope and provenance

Original reviewed PR head ed75611ec54e1379814f9a3fb58132ff72f043b3, fixed base355d74d57279a404f01bb5d887ec99ee1d326a94. Isolated branch review/motor-model-50, changes forwarded only to PR49 experiment/motor-model-ab-48. Code/fix/harness and fresh numeric/browser evidence head b8b26f7b860e55033c403cf30cd85f78a1dcce2f, dirty=false; input hash df0c7b6effadb6bc28c61eccc169d9f1cd7b4449072327ab97b600324953ec8c. The subsequent commit adds only this report and raw evidence; no executable input changes. Final evidence SHA and CI links are on Issue50/PR49.

The original ac3ebad -> ed75611 diff contains only research/documentation/evidence, no build/harness inputs. The original clean build and harness recorded the same34ce029f hash; source trees establish the documentation-only transition. Source hash includes raw file bytes/line endings, so it is a build-instance identifier rather than a portable Git tree hash. This fresh checkout and new review harness have their own recorded clean hash above. Dependencies, installed API and read-only vendor stay RapierJS0.21.0/pinned b716d375; locked npm ci, Node24.21.0.

## Spec

No remaining evidenced spec finding. Issue48 full text/preregistration and Issue50 reviewed. Exact frozen rig/dt/Solver32/neutral Moving-Frame targets/materials/limits/start poses/caps and original tolerances confirmed. No production, gameplay, dependency/vendor/default/solver/target change. Six canonical Study-v3 identities, passive v1/default and FB-v2 schema/config hashes preserved.

Installed impulse_joint.d.ts and pinned motor_model.rs/generic_joint.rs/constraint builder confirm supported public motor APIs, AB effective-inertia scaling and model-independent angular max_force*dt cap. Gains100/12 are Nm/rad,Nm*s/rad for FB and s^-2,s^-1 for AB; cap is physical Nm **per axis**, not a vector-norm limit. Isolated24 torque-cap/reaction and36 tracking tests re-executed through npm test, including off/sign/axis/missing-cap negative controls. Momentum difference/relative body orientation are observed independently of the setters. Existing independent hinge/frame oracle tests also pass.

Exactly one predeclared optional2343.75/281.25 pair follows FB100/12 divided by isotropic effective inertia. The240-step calibration retains original1e-5rad/1e-4rad/s tolerances and reproduces max9.52e-8rad/1.057e-6rad/s. No new calibration/gain search. Scalar-equivalent response is explicitly not full-rig equivalence.

## Engineering

**P2 fixed ? scripts/motor-model48.js::validateModelRun / motor-model48-payload.js.** Trigger: delete end/metrics, set negative/null peaks, falsify first-terminal time or diagnostic invalid/horizon in an imported report. Original reader accepted these payloads while validating only inner result and a few outer fields. Effect: incomplete/inconsistent comparison data could appear valid. Two tests fail on original code and pass after fix, covering20 corruptions. Added existing-schema measurement types, finite/required fields, same-step/taxonomy/target checks, peak/end/support/contact-load consistency, normal outer/inner agreement, first-contact chronology and diagnostic horizon/invalid-cause checks. No simulation/tuning or new acceptance bounds. All50 original reports remain accepted. These are consistency checks, not cryptographic authenticity or reconstruction of every unstored timestep from a digest.

**P3 fixed ? model-ab48.md line15 and67.** Question-mark encoding destroyed the inertia unit (kg*m?) and CPU range separators. Restored ASCII kg*m^2 and readable ranges. Numerical values and original66 raw evidence files remain untouched.

No remaining evidenced engineering finding after checks below. Resource teardown frees each World/EventQueue and motor views, replaces handles on reset, rejects disposed references. Browser extension explicitly checks Study counts and awaited export while switching to passive. Existing camera edge/clipping on large calibrated drift remains documented and unchanged, as scoped.

## Numeric and CPU reproduction

All66 original evidence SHA256 values verified. Reader validates all30 normal+20 diagnostic reports; five original repeats per10 groups match complete end/metrics/contact chronology/sequence hashes. Fresh **five normal worlds per six configs (30)** have deviation0 in all six compare metrics, identical physical sequence hashes, complete end observations, peaks and contact onsets versus originals:

| Config | Cap20 | Cap1 |
| --- | --- | --- |
| FB100/12 |3600/timeout/60s|187/both hands/3.116667s|
| AB100/12 |69/handL/1.15s|73/handL/1.216667s|
| AB2343.75/281.25 |252/head/4.2s|242/head/4.033333s|

Fresh passive70/handL and v2-FB20/3600,1/187 match historical39/46 references with deviation0 and original config IDs. Targeted fresh AB20 and FB1 post-contact diagnostics reach3600 with StandingTime=null, exact hashes/metrics/contacts; first head impacts90/192. AB1 diagnostic additionally reruns in the schema regression test. Other unchanged diagnostics validated from all20 raw records, not needlessly remeasured. Invalid latch test stops immediately with null StandingTime. No calibrated contact continuation.

All8 stored CPU pair/model rows checked: first60Steps,3Warmup/5MeasuredWorlds, alternating model order in source,300 finite nonnegative samples per channel, null terminal, recalculated median/P95/max exactly match. Raw outliers and observed timer quantization retained. This review does not remeasure CPU or mix its own validation timings into the study. Node and browser timings remain separate; no significance/GPU/weak-device claim.

## Decision validity

The predeclared selection rule justifies retaining FB for this fixture. AB100/12 falls near passive time with ~2.3rad peak tracking and higher joint errors. Calibrated20 loses support, falls on head at252 and drifts farther than FB20. Calibrated1 lasts longer than FB1 and slightly improves tracking/limit peak, but increases drift/anchor/axis errors and reduces both-loaded fraction. Mixed secondary metrics plus host CPU variability do not establish consistent superiority. Foot-loaded fractions cover different durations and are not standalone fairness/success evidence. No thresholds were changed to select a winner. This is not a universal ranking of motor models.

## Browser, tests and limits

60/60 tests and clean production build pass; known large Rapier bundle warning remains. Built artifact via owned ephemeral HTTP server with /goblin/ Pages prefix, direct Playwright1.63.0/Windows10.0.26300 x64/Edge154 headless. All six Study normal terminals/export downloads match fresh Node comparisons with deviation0. Real FB-v2 and Study-FB20 resumed3600/60s; v2 wall duration60.007s. Study resource counts stable (15bodies/16colliders/14joints and listeners/geometries/textures/programs), six awaited Study exports remain on the clicked run while changing to passive. Mode changes/reset/pause/step/reload/visibility handler/disposal/retained references pass. Responsive744x360 touch landscape has no horizontal overflow. Production start/head pointer-hit/score/reset smoke passes. Console errors/warnings/failed responses0. Native hidden=false, synthetic handler separate.

[Browser raw report](browser/browser-qa.json). Screenshots actually inspected: [calibrated20 contact](browser/study-calibrated-20.png) and [mobile controls](browser/motor-mobile-landscape.png). The drifting fallen calibrated head remains at the static camera edge, as the known scoped limitation. No camera rewrite or GPU performance inference.

Remaining explicit limits: native tab hidden transition not observed, synthetic handler separate; GPU/weak-device/production CPU budget and complete Standing/support/drift/recovery criteria unaccepted; actual full-rig motor torque/saturation N/A. No unresolved fundamental blocker for this bounded comparison/reader. Independent review remains separate.

## Reproduction

With Node24.21.0 and locked npm ci: npm test; node scripts/review-motor-model50.js (clean worktree, external GOBLIN_REVIEW_OUTPUT); npm run build. Set GOBLIN_MODEL_OUTPUT to that fresh numeric directory and GOBLIN_STANDING_EVIDENCE_DIR to an external browser directory, then npm run lab:browser. Use the same installed Windows Edge or record another executable/platform separately. Evidence JSON files contain exact code/harness/build provenance. Final CI runs on the evidence head; no extra numerical/browser loop is needed for documentation-only commits.

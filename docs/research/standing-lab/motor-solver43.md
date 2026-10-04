# Solver32 motor candidate / Issue #43 — 2026-10-04

**Decision: suitable for the next separately authorized Lab motor integration on
this host/configuration.** Both known cap cases stay within the existing anomaly
bounds through the60-second diagnostic horizon. This is neither a production/merge
recommendation nor full standing/UI/lifecycle acceptance. #41 remains stopped.

## Frozen contract and provenance

Base e0b0cff43be6f0c89b5516e07de665ef030cfc54 (#42). Clean measured harness head
f296867b40433c09f1b500486bd697c4d9220bdd, dirty:false. Final reviewed code/test head
8a34aa490a9c0f1149ec8006b8c629a4cede08fb adds only the contact-continuation regression
test, no experiment/measurement changes. The subsequent evidence-only SHA is linked
in Issue #43. Source: scripts/motor-solver43-config.js and motor-solver43.js.

Separate experiment namespace motor-solver-candidate-v1, schema_version1. Each
canonical config includes frozen passive rig/start/materials/masses/inertias/anchors/
limits/dt, explicit effective_solver_config, ForceBased/Moving-Frames/100/12/neutral
targets and exact cap, horizon3600 and unchanged .05 rad/.08 m safety bounds. Full
configs are in motor-solver43-configs.json, results in motor-solver43-results.json.
These are NOT passive schema-v1 results. The original baseline object/identity and
its solver8 remain unchanged; the harness sets only the fresh experiment world's
numSolverIterations and verifies readback. No motor UI/reader/production import.

| Cap Nm | Solver | Canonical SHA-256 suffix (experiment_id prefix motor-solver-candidate-v1:) |
| --- | --- | --- |
|20|8|60816caddbb6cfec592fe73bc91b563263d165674e6921baa0c35360350e298d|
|20|32|405fc035c61485fcd77a7c5273bf7c7630fafd81c0c265fd41c5ebe64d8562ec|
|1|8|12938457c2fec2d7532661b511351c5a0e48b570532ad8ed3590ac92f23fba22|
|1|32|0d90673fe0def6323d18d6771ac5e905ebf9eef3d91ca4af8113d3e14ce06116|

Node24.21.0, Rapier0.21.0, pinned b716d375 read-only, Windows10.0.26300,
AMD Ryzen5 5600X6-Core Processor. No browser, rendering, GPU or mobile measurement.

## Predeclared protocol and physical results

Five fresh normal Worlds AND five separately fresh diagnostic Worlds for each of
the four cap/solver cases:40 full-rig runs. Normal uses the existing single-step
and anomaly checks, ends at first nonfoot contact/invalid/timeout. Diagnostic calls
the same existing step and ONLY clears contact terminals to continue after contact;
it never clears invalid terminals or bypasses existing safety/resource/state checks.
Max3600 steps/60s. Diagnostic standing_time is always null and acceptance is false.
No world after invalid advances another step. Worlds freed after every run.

| Cap | Solver | Normal result in all5 | Separate diagnostic result in all5 | Max limit error in diagnostic |
| --- | --- | --- | --- | --- |
|20|8|Invalid110/ankleL; standing_time null|Invalid110/ankleL|.050850274 rad|
|1|8|Invalid140/elbowR; standing_time null|Invalid140/elbowR|.072396600 rad|
|20|32|Timeout3600/60s, no nonfoot contact|Horizon3600/60s, no invalid|.000159224 rad,301/kneeR|
|1|32|HandL+handR contact187/3.1166666666666667s|Horizon3600/60s, no invalid|.004924025 rad,192/elbowL|

Solver32 does NOT make1 Nm a standing solution. Normal ends at the hands. Diagnostic
then includes the head-floor impact192 and pelvis/torso contacts283/284 before
settling. Peak single contact step-average normal load904.462519 N at192/head;
first hands at187 approximately189.078631/188.496184 N. These are contact impulse/dt
magnitudes, not actual motor effort or instantaneous force. Stored normals retain
manifold order/flipped flag; points are collider-local. Motor effort/saturation N/A:
supported getters cannot isolate them from coupled contact/limit impulses.

Independent matrix/tangent oracle from #42 used each step. Max disagreement with
existing hinge angle <6.7e-16 rad. All five full-rig repetitions per group have
identical hashes of complete per-step raw joint/contact sequences (same host/build,
not a cross-platform determinism claim). Maxima include joint and step, first small
limit crossings (>1e-5) and first .05/.08 safety crossings, contact-onset events and
first nonfoot contacts. Only run1 retains raw terminal windows/peak-impact traces;
other repetitions retain all summaries/metrics/hashes; no negative run discarded.

| Full-rig diagnostic | Max anchor error m / step / joint | Max axis error / step / joint |
| --- | --- | --- |
|8/20|.002335597 /5/ankleL|.005159234 /5/ankleR|
|8/1|.004395694 /139/elbowL|.008002278 /5/ankleL|
|32/20|.000314006 /4/ankleL|.000846112 /4/ankleR|
|32/1|.000380772 /170/ankleR|.000726585 /4/ankleR|

No anchor safety crossing in any case. Small positive limit errors remain; the
claim is compliance with the unchanged .05 safety tolerance, not exact hard stops.
First small crossings:8/20 step76/kneeR;8/1 step106/ankleL;32/20 step188/kneeR;
32/1 step154/ankleL. Solver8 reproduces the known failures rather than losing the
negative control through altered instrumentation/terminal semantics.

Minimized5-body/4-joint loaded fixture: solver8 invalid70/kneeL/.054513858;
solver32 reaches3600 with zero limit violation, max anchor .000637576 m,
max axis .000789669. It deliberately continues after contact; never standing evidence.
No engine-level defect or unique internal convergence mechanism inferred.

## Comparable CPU cost

Predeclared same first60 steps from fresh full/minimal Worlds, before the known8
failure steps. Per fixture/cap/solver3 warm-up Worlds then5 measured Worlds,
alternating8/32 pair order each batch.300 physics samples per row. Only world.step
inside physics timer, native motorcommands separately timed; boundary checks outside
timer. No telemetry/hashing/rendering measured as physics. No unequal terminal
sample lengths, no advancement past invalid. Long-run physical tests and this
matched early-segment benchmark are separate datasets.

| Fixture / cap | Solver | world.step median ms | P95 ms | Max ms |
| --- | --- | --- | --- | --- |
|Full/20|8|.0975|.1104|.2465|
|Full/20|32|.3224|.5544|.6370|
|Full/1|8|.0960|.1055|.2982|
|Full/1|32|.3200|.3471|.6672|
|Minimal/20|8|.0406|.0556|.1195|
|Minimal/20|32|.1255|.1430|.2155|

Full-rig median cost ratio32/8:3.307x (20 Nm),3.333x (1 Nm); minimal3.091x.
Full motorcommand medians .0044-.0045 ms (separately recorded), minimal .0017 ms.
All raw physics samples and five per-world summaries retained. Nearest-rank P95,
upper median floor(n/2). Outlier heuristic >3x within-row median is descriptive:
one .2982 ms8/1 sample, none in other physics rows.32/20 measurement repeat4
has median .5409 vs .3197-.3237 in the other four, explaining the higher pooled
P95; retained without trimming or unexplained causal claim.32/1 command max
.3945 ms also retained. OS/JIT/GC/background variability not controlled away.

Existing docs describe simulated30FPS browser/rAF targets and historical GPU/CPU
baselines (g1-review.md, goblin-rig-contract.md), NOT an assigned world.step-only
motor-Lab CPU budget. Therefore no arbitrary pass threshold is invented and no
browser30FPS/GPU acceptance is derived from Node timings. Cost is modest on this
desktop for the tested Lab segment; production/weak-device budget and later impact/
settled-state CPU distributions remain open. These early-segment data do not bound
every step of the60-second impact trajectory. No solver-minimum optimization begun.

## Verification, review and decision boundary

50/50 Node tests pass, including exact config/hash invariants, undeclared change
rejection, original invalid guard and separate contact/192-head-impact continuation.
Production build passes with existing large Rapier chunk warning; git diff --check
passes. Passive original run70Steps/1.1666666666666667s/handL, original checkpoint
comparison pass:true, all six max deviations0; original config SHA414ed28b... intact.
No passive/runtime source/config/schema/rig/package/vendor/userconfig/PR29 or production diff.
Numerical-only changes need no new browser QA; none claimed. No PR CI claimed.

### Spec

Candidate protocol completed without scope expansion.32 is suitable for the next
Lab integration decision; numerical60s does not satisfy unimplemented #41 UI,
versioned runtime reader/export, reset/lifecycle/browser/CI/complete standing gates.
No merge recommendation for #41 or production. Separate authorization is needed
to resume #41; this report does not itself resume it.

### Engineering

No in-scope blocking local finding remains. Diagnostic code has fresh/freed worlds,
immutable exact configuration and namespace, public native APIs, preserved safety
guards, normal/diagnostic terminal separation and meaningful red-capable regressions.
Four exported #42 helper functions are reused without changing their behavior.
No alternative production stepping path or runtime import. Main numerical evidence
measured clean f296867; final code8a34aa4 differs only by a tested regression.

Recommended decision: approve the32 numerical candidate for a NEW scoped #41
continuation order, retain separate passive8 selection/identity, complete remaining
motor integration and actual browser/CPU-target QA there. Do not merge/deploy or
silently change the passive baseline. Stop after this decision report.

Reproduce using Node24.21.0 and locked npm ci, npm test/build, then
node scripts/motor-solver43.js; GOBLIN_SOLVER43_OUTPUT selects external JSON path.
The existing report is not automatically promoted to standing acceptance.

# PR45 review — Issue46

Recommendation: **ready for a separate merge decision**, limited to the motor Lab.
Both evidenced P2 findings are fixed; no remaining identified scope blocker. No merge,
deployment, auto-close, model A/B, balance or recovery development. PR remains Draft.
This is a fresh review/reproduction by the same agent, not an independent second
reviewer or GitHub approval. Issues remain open until merge.

Fixed base: `06b520628502593d034485ee21fb8428daa6781b`.
Initial PR/evidence head: `0ac7571874db7e842c9f623dbc3e11917b37d4bf`.
Prior implementation code head: `a780c7e03604d091e8ce4de4a6aefe3d70d50fce`.
Reviewed fix/clean reproduction head: `959b03cde0d8dec366d73e1f2e751149a3f731d2`.
Build/harness identity, dirty=false:
`959b03cde0d8dec366d73e1f2e751149a3f731d2:c682f179ed54ed25fb92920c63002694b17fa62964fae897e0b1e5496809542d`.
Subsequent report/raw-data commit is documentation/evidence only; final head and its
current CI are recorded in Issue46/PR45. Code-to-evidence diff was reviewed explicitly.
Initial reviews/threads were empty; initial and fix-head CI passed.

## Spec

Reviewed #41–#44 bodies/handoffs, #46 protocol, PR diff, local contracts and canonical
standing research against the fixed base. Passive config, original schemas,
math/measurement/clock, rig/dt/masses/inertias/contact rules/tolerances, production,
dependencies and pinned vendor revision have no diff. Solver32 is isolated to motor
v2; ForceBased100/12, Moving-Frame targets and only caps20/1 remain frozen.
Config semantics and canonical hash integrity are distinct checks. Changed/missing
controller/model/frame/gain/cap/solver/target data reject; old v2 terminal exports
remain readable. v1 semantics/hash/checkpoints remain unchanged.

Termination order is invalid, then non-foot contact (including step0), then timeout;
contact at step3600 wins over timeout. Existing actual-Rapier tests cover first-contact
IDs and priority, invalid-start, resource loss and no later terminal advancement.
No diagnostic-after-contact path is reachable from the normal UI.60s is only the time
criterion, with nonzero drift/loads/joint errors reported rather than hidden; no new
secondary thresholds were invented. No remaining evidenced spec finding after fixes.

## Engineering

### P2 fixed: coherent false tracking accepted by the reader

Location: `src/labs/standing/config.js`, v2 motor telemetry validation.
Trigger: change hinge actual/error plus the duplicate joint angle/limit telemetry to
the same false value, leaving body checkpoint unchanged. Original reader accepts
(`coherently false hinge accepted:true`). A false relative angular velocity also
passes the original reader. Config identity remains valid, because it hashes config,
not observations. Impact: internally inconsistent tracking can be accepted as measured
evidence. Fix959b03c cross-checks hinge angle and velocity against same-step body
rotation/angular velocity (frozen rig has identity bind frames and neutral targets).
Spherical actual consistency remains checked. New regression first fails on the
original reader (missing expected exception), then passes. Actual orientation/velocity
conventions are independently tested with Three.js quaternion/vector operations and
the matrix/tangent hinge oracle, not simply the same production angle helper.

### P2 fixed: incomplete motor export lacks clicked-step body evidence

Location: `src/labs/standing/simulation.js`, `result()`, and v2 result reader.
Trigger: export at step2; original checkpoints only0/1. Spherical same-step checking
was skipped and hinge measurements had no matching body evidence. Regression fails
with last checkpoint1 instead of2. Fix959b03c synchronously captures a clicked-step
body snapshot into the v2 exported copy before hash awaits, when telemetry is present.
Run checkpoint schedule, reset state and passive-v1 exports are unchanged. Reader
requires that same-step evidence. Export/reset race and missing-snapshot negatives pass.
Old incomplete v2 exports lacking current bodies now reject as insufficient evidence.

No remaining evidenced engineering finding. Native motor wrapper and arguments checked
against installed0.21.0 declarations, matching pinned TypeScript/Rust classification
source and real positive/negative fixtures. The descriptor-guarded public spherical
view keeps one physical handle and no raw motor setters/mask/prototype mutation.
Per-axis cap and isolated unequal-inertia counterreaction tests pass; full-rig actual
effort/saturation stays explicitly unavailable. No torque inferred from contact loads.

Single existing fixed-step path: commands before `world.step`; no render-owned physics.
Fresh world/event/motor lifecycle, repeated mode changes/resets, pause/step/terminal,
export races and retained references/disposal pass. Resource counters stabilize; this
does not prove complete heap/GPU leak absence. No gameplay/recovery imports or global
config/port/MCP changes. Pinned Rapier remains b716d375efc0201003f0cd9ef7168eee0b62c177.

## Own reproduction

Isolated detached checkout `.standing-review46`, locked `npm ci` with repo-local cache.
Node24.21.0: initially53 tests pass; after two focused regressions55/55 pass, build and
diff whitespace checks pass. Existing shared Rapier chunk-size warning only.
Commands: `npm test`, `npm run build`,
`GOBLIN_MOTOR_EVIDENCE_DIR=... node scripts/standing-motor-baseline.js`,
`GOBLIN_STANDING_EVIDENCE_DIR=... node tests/standing-browser.cjs`.
On Windows used repository-local Node executable and npm CLI under PowerShell.
The browser report's package-script command names the same harness; actual direct
command above is recorded here. All results below use clean959b03c, not historical44 data.

| Case | Five fresh normal runs | Termination |
| --- | --- | --- |
|20 Nm/Solver32|3600 steps,60s each|timeout, no non-foot contact|
|1 Nm/Solver32|187 steps,3.1166666666666667s each|handL and handR|
|Passive/Solver8 original comparison|70 steps,1.1666666666666667s|handL|

All repetition comparisons pass; passive original six checkpoint maxima0. Original
config hash414ed28b04c2fd0351554014f1c7e8637c5bd8674477c8a13483f410ed31e2aa.
See [comparison/peak metrics](review-46/numeric/comparison.json) and ten raw results.
20-Nm peak drift0.194125596m, anchor error0.000314006m, limit error0.000159224rad,
tracking error0.148907878rad; terminal drift0.084029507m, foot loads45.349552054N /
43.528298254N. These remain observations without complete standing-quality thresholds.

## Browser / screenshots / CPU

Playwright1.63.0 direct, Edge154.0.4258.53 headless, Windows win32 10.0.26300 x64,
Node24.21.0. Built artifact served under `/goblin/` by owned ephemeral local server.
Harness/build provenance matches clean959b03c. Real resumed rAF60s motor20 run takes
60.006s wall time; motor1 ends at187 and stays latched. Downloaded exports validate.
Both modes, passive render on/off and Node checkpoint equivalence,20 passive resets,
20 mode-change/reset cycles, pause/step/reset/export races/reload, Pages assets/console,
touch mobile744×360/DPR2, game start/pointer/reset regression and destroy/retained
reference checks pass. Console errors/warnings/failed responses all empty.
See [browser report](review-46/browser/browser-qa.json) and two exported motor results.

Screenshots actually rendered and viewed:
[motor20](review-46/browser/motor20-time-criterion.png),
[motor1](review-46/browser/motor1-contact-end.png),
[mobile landscape](review-46/browser/motor-mobile-landscape.png).
Rig/controls visible; long panel scrolls, no horizontal overflow. Emulated viewport
is not real mobile hardware or Windows GPU performance evidence.

| Cap / after20 warmup steps | Physics median/P95/max ms | Commands median/P95/max ms | Observation median/P95/max ms |
| --- | --- | --- | --- |
|20 /3580 samples|0.400000036/0.599999964/0.900000036|0/0.100000024/0.200000048|0.100000024/0.200000048/0.399999976|
|1 /167 samples|0.400000036/0.5/0.699999988|0/0.100000024/0.100000024|0.100000024/0.199999988/0.300000012|

Raw samples retained. Physics is `world.step` only, commands and observation separately;
rendering/DOM excluded. Quantized zero command medians are not zero CPU cost. Full
trajectories/sample lengths differ; no20-vs1 budget claim. #43's matched Node solver
ratio and #44's previous browser run are distinct measurements, not combined samples.

Native hidden transition remains **not observed**; synthetic handler test passes only.
Weak-device/GPU/production budgets and full secondary standing criteria remain open.
No live/deployment check claimed. These disclosed limits do not block the scoped Lab
integration, but prohibit broader acceptance claims. Before any future merge, verify
the then-current approved head/reviews/checks in its own authorized merge task.

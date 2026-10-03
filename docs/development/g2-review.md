# G2 PR #28 review and corrected production evidence

Full actual diff reviewed against fixed base `0d61a79fa6c171e71632a22620d09693cb4b4295`, AGENTS.md, Masterplan #11, Issue #14, grab contract and original result report. Starting head: `036aebbcbd348bf87af9c922106d29c621d7b3b2`; base/head rechecked before edits. Earlier success claims were reproduced, not adopted. This is the same agent's requested review/fix pass, not a separate-agent review. PR stays Draft; no merge/deployment or G3.

## Spec

**P2 fixed — original src/grab.js:46-63 / tests/g2-browser.cjs:25-36: insufficient loaded holding.** Reported 0.08-0.53 m error did not establish the chosen point was held. Native head drag retained 0.385 m error after three seconds (visually far from the pointer). A controlled whole-rig pull settled near 0.29 m head, 0.78 m hand and 0.99 m forearm despite previous motion/torque tests passing. Single-body response and budget ignored connected load; implicit filtering further weakened light-part control.

Replace the external solve with a force-limited Rapier spring solved with other joints/contacts, using connected load mass. Absolute ceiling remains 120 N. Four temporary additional island iterations address residual light-part constraint error; original settings restore. This fixes the model rather than raising all forces.

Actual settled-error assertions now cover 20 articulated cycles: max hold error 0.0368 m, joint separation 0.03074 m, selected speed 9.44 m/s. Full native Windows Edge smoke, four-second holds:

| Part | Settled error |
| --- | --- |
| Head | 0.0347 m |
| Hand | 0.0621 m |
| Forearm | 0.0170 m |
| Torso | 0.0293 m |
| Thigh | 0.0134 m |
| Foot | 0.0349 m |
| Prop | 0.0251 m |

Separate MCP: 0.0146-0.0581 m. These visibly retain the contact point and are below the explicit 0.12 m regression limit; even the worst hand error is below its collider radius. At 350 ms, finite-force transients remain 0.035-0.301 m. Settled holding is accepted in the verified scene, not guaranteed for unreachable targets/poses.

All 15 parts and one existing prop selected with native mouse; rotated local anchors, off-centre physical rotation, three camera planes and frozen camera pose checked. Slow/fast releases: full smoke 0.541/5.983 m/s; MCP 0.510/4.868. Controlled 30/60/144/240 Hz outcomes 7.11-7.40 m/s, preserving existing physical motion. Heavy/light behaviour remains distinct.

## Engineering

- **P2 fixed — original src/grab.js:64-68 / src/main.js:324: clipping unrelated collision motion.** Pre/post-solver setLinvel/setAngvel overwrote one body's real momentum while linked/contact bodies retained solver velocities. Remove both. Bounds apply to drive, actual spring force and release correction. A real high-speed two-body collision preserves summed momentum within the external grip impulse; a centre grip preserves free 25 rad/s spin. No global collision speed cap is claimed.
- **P2 fixed — original src/grab.js:79-81: release discards physical movement.** Whole-vector desired-current erased gravity/side-impact components and could brake faster movement. Correct only a missing gesture-direction component; preserve transverse movement/spin, add nothing to already faster motion. Regression preserves y=-3/z=2, spin (4,5,6), and faster 9/20 m/s movement. Detach before release prevents a following-step spring boost.
- **P2 fixed — original src/grab.js:34: stopped movement samples ignored.** Duplicate-pointerup workaround discarded all identical-coordinate pointermoves. Only final duplicates are ignored now. Moving/stationary trajectories at 30/60/144/240 Hz do not throw after a 90 ms stop, before the 100 ms stale deadline; duplicate pointerup during recent motion still throws.
- Real mass * delta-velocity / dt checks prove resultant force bounds for 0.18/1/4 kg, rotated poses and diagonal targets, exercising saturation and drive speed. These do not merely assert configuration. Installed public raw motor API is isolated/documented; no engine/version change.
- Passed input/state: native capture/loss, Pointercancel, synthetic blur/focus, help pause/resume, reset, tool/camera/viewport change, controls/background UI, explicitly synthetic secondary-pointer ownership and coalesced consumption, trailing events after cancellation. No takeover/restart/throw on abort.
- Actual Rapier removal leaves no anchor/joint. Browser reset removes projectiles and grip; no arbitrary-deletion UI is claimed. Twenty browser/MCP cycles restore 26 bodies / 14 joints / 47 geometries / 3 textures, zero connections/user force/torque. Active only: 27/15 with no new GPU resources. Engine cycles also verify solver-setting restoration.
- Same-task reset picking, paused reset with frozen transforms, G0 time/score gates, G1 hinge/self-contact/impact stability and debug resource disposal pass. No blocking finding remains in tested scope. This report supersedes earlier soft-connection/release success claims.

## Checks and conditions

Node 24.21.0 / npm 11.19.0; locked Rapier 0.21.0, Three 0.186.1, Playwright 1.63.0. npm test 24/24; build and whitespace checks pass. Existing Vite chunk warning remains; JS approximately 4,899.40 kB / 1,813.28 kB gzip. No new assets/dependencies.

Full npm run test:browser passes in Windows Edge 154.0.4258.53: 60.05 s pre-start/reset idle, complete G0/G1/G2 production checks, 20 cycles, projectile cap, collider/mesh alignment, debug toggles, reset/pause/layout. Warnings, errors and failed HTTP responses empty. Separate Windows-Edge-MCP core/cleanup/touch stages pass.

Isolated loopback 64507, actual /goblin/ production base path; reload and JS/CSS paths verified. Server 5174 and root user/MCP files preserved. This is local production-browser evidence, not deployed Pages acceptance.

Desktop 1280x720 DPR1. Touch explicitly emulated via Edge CDP: 360x744 portrait / 744x360 landscape, device scale3/render DPR cap1.5. Grasp/drag/throw/cancel pass, canvas=viewport, no controls overlap. Secondary-pointer/coalesced checks are synthetic handler tests, not genuine multitouch-device proof.

Root local evidence: .playwright-mcp/g2-review-before-held.png, g2-review-after-held.png, g2-review-smoke-desktop.png, g2-review-smoke-mobile.png, g2-review-smoke.log. Before/after contact placement and layouts inspected. Red target/cyan contact markers are temporary QA DOM overlays, absent from product code.

## Performance: active grip separately from projectile baseline

Sequential foreground Windows-Edge-MCP, Edge154.0.4258.53, ANGLE NVIDIA RTX3070Ti/D3D11, 1280x720 DPR1, debug rendering off; no concurrent smoke browser. G1 is the combined production baseline previously verified against its deployed merge. G2 is corrected production. Sample 1800 rAF intervals only; diagnostics once afterward.

Active: fresh reset, same head screen offset +14 px, drag +70/-35 px, 2.5 s settle, hold during measurement. G1 uses its original COM force/moving camera, so poses differ: matched input workload, not identical solver/pose benchmark. Projectiles separately: 30 head-targeted Ball clicks, cap24, 2.2 s settle.

| Scene/build | rAF median/P95 | 1800 intervals | Bodies/joints/projectiles | Calls/triangles | Geometry/texture |
| --- | --- | --- | --- | --- | --- |
| Active G1 | 6.1/6.2 ms | 10.9228 s | 26/14/0 | 76/12392 | 47/3 |
| Active G2 | 6.1/6.2 ms | 10.9229 s | 27/15/0 | 76/12392 | 47/3 |
| Projectiles G1 | 6.1/6.2 ms | 10.9228 s | 50/14/24 | 124/29288 | 71/3 |
| Projectiles G2 | 6.1/6.2 ms | 10.9228 s | 50/14/24 | 124/29288 | 71/3 |

Sustained G2 head error: 0.0372 m. Matching rAF cadence is scheduling/foreground smoothness evidence, **not CPU/GPU cost proof**. G2 active adds one Rapier body/joint and four scoped solver iterations; CPU work can increase while this machine maintains cadence. No GPU timer, isolated physics CPU profile, heap-retention profile or weak-device acceptance. Counter stability proves cleanup of enumerated resources, not all allocator behaviour.

Free shoulder/hip joints without guaranteed anatomical limits remain. Real Android/iOS, native OS visibility transitions, GLB and arbitrary thin-target CCD are outside evidence, not marked passed or turned into new blockers. Issue14 remains open pending later merge/live acceptance. Final commit/CI are recorded in PR/Issue after push; no deployment in this review.

# G2 review and production evidence

Reviewed against fixed main `0d61a79fa6c171e71632a22620d09693cb4b4295`, AGENTS.md, Issue #14 and Masterplan #11. This is an implementation self-review, not a second-agent independent review. Scope ends at a Draft PR; no merge or deployment.

## Spec

- The G1 15-part IDs remain the selection/body contract. All 15 parts and one persistent prop were selected with native Edge mouse input. Direct collider picking intentionally excludes cosmetic-only ears/eyes from independent physics hits.
- Actual off-centre drags covered head, hand, forearm, torso, upper leg, foot and prop. Local anchors stay identical while their world points move and actual angular velocity appears. The isolated body holds its selected point within 3 cm after settling. In the articulated scene, bounded soft dragging has transient/loaded error: roughly 0.08–0.53 m at 350 ms in the recorded cases. This is a force-limited connection, not a guaranteed zero-error pin or anatomical pose constraint.
- All three camera modes use a camera-facing fixed-depth plane; the camera freezes during the grip. Pointer capture and a single primary-pointer owner are shared with touch. UI-started clicks do not start the round/score; releasing over controls or toolbar background cancels.
- Slow native release about 0.31 m/s versus fast throw about 5.00 m/s in the complete production smoke. Timing differs between interactive MCP and headless runs; synthetic target trajectory is the controlled rate comparison. For the same trajectory at 30/60/144/240 Hz, release speed is 5.977–5.980 m/s. Heavy-prop speed scaling, current-velocity correction, stale-release and no-throw abort tests pass.
- G3 standing/recovery, new tools, APK, engine changes and real-device acceptance are absent.

## Engineering

- **P2 fixed — `src/grab.js:move` / `tests/grab.test.js`:** repeating the final touch coordinate on pointerup was inserted as a zero-motion sample and suppressed a recent throw. Edge portrait touch reproduced `threw=false`; after ignoring repeated coordinates while ageing motion by elapsed time, portrait and landscape throws pass. A regression checks the actual release speed and recent-motion retention.
- **P2 fixed — `src/grab.js:pointerVelocity` / release:** ageing between normal 30 Hz samples and subtracting existing spin made event-rate/mass results diverge. Controlled real-Rapier tests initially failed. Allow the normal sample interval, and transfer a bounded COM velocity while preserving the already-created spin. Release applies mass*(desired-current) rather than an additive boost. All rate/mass tests now pass.
- **P2 fixed — `src/main.js:pointerup` / `tests/g2-browser.cjs`:** review found the initial release-over-UI filter covered controls but not toolbar/panel backgrounds. Extend the filter to their containers and assert UI cancellation reason, including a real toolbar background point (excluding the rounded corner outside its hit area).
- Selected-body speed caps also run after the contact solver; unexpected body removal clears the connection before reading deleted transforms and clears pointer ownership on the next fixed step. No temporary physics bodies, joints, GPU resources or persistent spring forces exist. Tests remove an actual Rapier body and verify no throw; browser reset/removal shares the cancellation path. No claim of a public arbitrary object-deletion UI is made.
- Twenty real-Rapier articulated cycles: max force 120 N, selected speed about 2.16 m/s, max joint-anchor separation 0.02693 m; clean poses/velocities/forces/torques after every reset, 15 rig bodies / 14 joints constant. Twenty Windows-MCP browser cycles retain 26 scene bodies / 14 joints / 47 geometries / 3 textures, 0 connection, no user force/torque. Pointercancel, native lost capture, synthetic blur, help pause, reset, tool/camera change, resize and UI release all cancel without throwing.
- Same-task reset/picking and paused reset with frozen actual positions/quaternions pass. G1 hinge/self-contact/fall/impact/debug-disposal tests remain green. Broad-phase freshness is avoided with bounded direct per-collider selection, rather than a second visual hit system.
- No open blocking finding identified in this self-review. The known soft-connection load error and device boundaries remain explicit.

## Test conditions and checks

- Node 24.21.0, locked npm install; Rapier 0.21.0, Three 0.186.1, Playwright 1.63.0 unchanged. Official 0.21.0 TypeScript changelog and installed API declarations checked.
- `npm test`: 20/20; `npm run build`: pass; `git diff --check`: pass. Existing Vite large-chunk warning remains. JS production bundle about 4,899.10 kB / 1,813.20 kB gzip versus G1 4,894.83 / 1,811.75 kB; no new assets or dependencies.
- `npm run test:browser`: complete production G0/G1/G2 smoke passed in Windows Edge 154.0.4258.53. 60.05 s preparation/reset idle, all-part selection, torque drags, throws, cancellation, 20 resets, projectile cap, debug resource toggles, alignment and touch layouts. Errors/warnings/failed HTTP responses: none. Separate Windows-Edge-MCP core, cleanup and touch stages passed; final UI-background correction rechecked there.
- Production served at actual `/goblin/` base path on isolated loopback port 52955, not dev server. Existing port 5174 and local user/MCP files were untouched.
- Desktop 1280×720 DPR1. Touch explicitly emulated in Edge: 360×744 portrait → 744×360 landscape, device scale 3 / render DPR cap1.5, CDP touch start/move/end/cancel. Both throw and abort paths passed, canvas=viewport, no action/toolbar overlap. This is not genuine Android.
- Local full-smoke screenshots: root `.playwright-mcp/g2-smoke-desktop.png`, `g2-smoke-mobile.png`; final interactive screenshot evidence also retained locally. Screenshots and runtime checks are complementary, not a GPU profile.

## Performance comparison to G1

Fresh sequential foreground Edge-MCP probes on the same Windows machine, ANGLE / NVIDIA GeForce RTX 3070 Ti / Direct3D11; desktop 1280×720 DPR1, debug overlays off. G1 baseline is the combined build validated against the deployed G1 merge; G2 is the production build. Reset + 2.2 s settle, 30 head-targeted Ball clicks, max 24 projectiles, then 1800 rAF intervals. Sampling reads only rAF timestamps, with diagnostics once after the measurement, so G2's larger diagnostic object is not built on every sample.

| Metric | Fresh G1 | G2 |
| --- | --- | --- |
| rAF median / P95 | 6.1 / 6.2 ms | 6.1 / 6.2 ms |
| 1800-interval elapsed time | 10.9229 s | 10.9229 s |
| Bodies / joints / projectiles | 50 / 14 / 24 | 50 / 14 / 24 |
| Render calls / triangles | 124 / 29288 | 124 / 29288 |
| Geometries / textures | 71 / 3 | 71 / 3 |

A single matching rAF pair does not establish unchanged CPU or GPU costs. No GPU timer result is available. The probe is the established projectile scene, not a measurement of the new active-grab solver. During a grip, G2 adds one small point-response matrix solve per fixed step and allocates temporary JS math values; it adds no Rapier/GPU resources. Diagnostic full-object sampling and browser automation have their own costs. No weak-device performance acceptance is inferred.

A separate G2 sustained off-centre head grip sampled 600 rAF intervals (no diagnostics during sampling): median/P95 6.1/6.2 ms, 26 bodies / 14 joints / 47 geometries / 3 textures. At the end: force about 71 N, head speed 0.146 m/s, mesh position error 0. This is an active-grab smoke measurement, not a matched G1 CPU/GPU comparison. The visible held pose was inspected in `g2-mcp-held-head.png`.

Free shoulder/hip joints, genuine Android, native OS-tab/visibility transitions, GPU-time profiling, finished GLB skinning and arbitrary thin-target CCD remain outside the proven scope. The body stays passive until G3. Issue #14 remains open pending review/merge and later live acceptance.

# G3 feasibility: native controller audit and sole rolling

Continuation from `910e82a`, Draft PR #29, unchanged base
`f353a51807a9d36380f266c49d78ae8c82eb2781`. **First intermediate failed; G3 remains open.**
No stand, second fall, integration or acceptance-cycle expansion follows this gate.
Final pushed head / CI are recorded in #15.

## Foundations and causal discrimination

Node 24.21.0 / npm 11.19.0, Rapier compat 0.21.0, Three 0.186.1. Motor frames,
ForceBased semantics, force caps, inertia and contact APIs were checked against
installed declarations and [official Rapier docs](https://www.rapier.rs/docs/user_guides/javascript/joints/).
Native motor goals alter joint frames, not body transforms; native reactions must
not be supplemented by a free world torque.

| Small reproducible experiment | Result and meaning |
| --- | --- |
| Full G1 rig, zero gravity/sensors **diagnostic only**, 600 steps of explicit joint goals; compare relative rotations and torso-local hand endpoints | Maximum joint error 4.43e-6 rad, hand errors 1.45/1.71e-6 m. Deliberately inverted shoulder goals cause ~0.614 m error and fail the same pose assertion. Correct unloaded actuation, not get-up, is proven. |
| Two dynamic 1 kg spheres, collisions disabled, zero gravity, saturated spherical X motor capped at 2 Nm, one 1/60 s step | Inertia × angular acceleration gives +2.000000019 / -2.000000019 Nm; net angular reaction zero. High stiffness is only a tiny cap diagnostic, not prototype tuning. |
| Resting undamped 1 kg box, both collider-query orders | Normal impulse/dt = 9.80999954 N. Flipped flag changes with collider order; upward normal interpretation validated. |
| Same stationary box balances persistent horizontal 2 N | Velocity difference implies -2 N friction but legacy contactTangentImpulseX/Y return zero. These getters are **not validated solved-friction evidence here**; zero does not mean no friction or saturation. |
| Old bridge, same true fallen pose; original friction vs all coefficients 2 changed only after settling | Still aborts at 0.5667 / 0.5833 s. Diagnostic comparison, not a proposed rig/friction change. |
| Frozen unguarded sole-roll pose: full FK + exact shape queries; native motors with gravity/floor removed; then sensors-only control | Planned torso/thigh overlap 18.19 / 20.27 mm, real internal loads ~72 / 73 N. Without gravity/floor, loads remain ~67 / 69 N and spine error ~0.60 rad. Only sensors control converges (max 0.000409 rad). Self collision blocks this joint-reachable target. |

[Foundations](g3-feasibility-evidence/foundations.json),
[unguarded diagnostic](g3-feasibility-evidence/blocked-diagnostic.json),
[frozen target](../../tests/fixtures/g3-blocked-pose.json).
The regression recreates the forbidden pose with native contacts and verifies
failure without gravity/floor and convergence only after diagnostic sensors.
None of the diagnostic isolation conditions counts as support or success.

## Exactly one new mechanism

The fixed-foot bridge and pure roll-torque steering are retired from the current
browser experiment; historical code/tests remain reproducible. The selected sole
mechanism is **rolling an actually loaded toe edge toward the sole**, coordinated
with pelvis/torso joint goals. It addresses tilted feet without instantly demanding
flat ankles or repeating the fixed-foot bridge.

SoleSupportRise captures actual loaded contact points. Requested foot center is
world edge minus rotated local edge. Hands initially retain actual positions as
movement goals. Hands/feet remain dynamic: no world connection, and Rapier may
allow slip, unload support or reject a pose.

Each candidate passes existing common arm/leg reach and hinge guards with 4 cm
extension reserve, then exact Rapier shape queries for **all nonadjacent parts**,
including torso/thigh pairs previously missed by selected contact diagnostics.
Reject >1 mm planned overlap; check 25/50/75% intermediate path samples too.
This is necessary sampled geometry validation, not continuous collision proof.
The bounded 81-candidate local pose search changes targets, never gains/force caps.
The initial 2 mm root correction is a motor goal, not a body translation.

Progress requires each foot >10% weight, edge slip <5 cm, foot orientation error
<0.08 rad, root error <8 cm and COM speed <0.2 m/s. Abort after >0.2 s lost support,
>1 s tracking stall or >6 s total time. Requested progress is not success.
Head-free intermediate guards remain: head load <5% weight, height >0.53 m, each
foot >15%, each hand >2%, total hands/feet >80%, COM margin >2 cm, COM speed
<0.12 m/s, all bodies <0.25 m/s and <0.7 rad/s, continuously **1 s**.
Foot upY >0.98 adds a guard. No support/success condition was loosened.

ForceBased PD 100/12, goals ≤2 rad/s, caps 12 Nm spine/neck/wrist/ankle and
20 Nm per axis shoulder/hip/elbow/knee (sphere resultant ≤20√3 Nm).
No external lift/free torque, velocity write, hidden anchor, teleport or recovery.
+16 extra iterations remain an existing fixture candidate, not raised or adopted
in production; they do not solve the failure.

## Actual result and visible movement

The original standing/head-impulse fall is generated through Rapier, with no
assignment of fallen poses. Final default-friction guarded trial:

| Last controller input **before step**, t=1.783333 s | Value |
| --- | --- |
| Foot normals L/R | 7.62067 / 7.33428 N; each must exceed 8.88786 N |
| Head normal / center height | 11.64669 N / 0.47994 m; head still supports |
| Hand normals L/R | 31.22783 / 29.97735 N |
| Actual edge slip L/R | 5.869 / 5.811 mm |
| Foot-goal angle error L/R | 0.07643 / 0.08165 rad |
| Pelvis target error | 0.07513 m |
| COM velocity | (-0.00316, 0.01662, -0.05553) m/s |
| Requested fraction / head-free dwell | 0.395833 / **0 s** |

At **1.800000 s**, roll-support-loss disables motors and restores iterations to 0.
Post-step total foot load is 13.88549 N and head load 23.40778 N, after motor
removal: do not conflate with the pre-step feedback. Overlapping torso/thigh goals
are rejected instead of forcing through colliders.
Higher-friction control (all 2, same true fall) also fails: roll-tracking-stall
at 2.4333 s, fraction 0.35833, head load 16.9588 N, dwell 0. Friction effects are
not completely excluded, but friction alone is not a demonstrated solution.

[Final traces](g3-feasibility-evidence/sole-roll.json) separate pre observation,
requested/rate-limited native commands and post errors/poses/contacts. Pre contacts
belong to the previous completed physics step, post contacts to the new one.
[Blocked diagnostic](g3-feasibility-evidence/blocked-diagnostic.json) is the earlier
unguarded control, **not** the final guarded result.

Windows Edge 154 / Windows 10, 1280×900, DPR1, separately built production fixture
at http://127.0.0.1:4174/goblin/tests/getup-browser.html, fixed 60 Hz advance.
Five fresh repetitions all fail at 1.8 s with identical phase/fraction and zero dwell.
Ordered screenshots:
[0 s](g3-feasibility-evidence/sole-0steps.png),
[0.25 s](g3-feasibility-evidence/sole-15steps.png),
[0.5 s](g3-feasibility-evidence/sole-30steps.png),
[1 s](g3-feasibility-evidence/sole-60steps.png),
[1.5 s](g3-feasibility-evidence/sole-90steps.png),
[1.8 s](g3-feasibility-evidence/sole-108steps.png),
[actual pose only](g3-feasibility-evidence/sole-108steps-actual.png).
Cyan wireframe = planned FK; opaque geometry = Rapier. Pelvis rises, head stays
loaded and feet remain tilted. This is not a quiet stand.

[Browser data](g3-feasibility-evidence/windows-edge.json): pause 16→0 without time
advance, resume 0→16, reload/prefix assets, no application warnings/errors or failed
responses. An earlier orchestration call had a server-context performance reference
error; capture was corrected and rerun. It was not an application error or a
successful measurement.

Five fresh failed fixtures retain 15 bodies/14 joints, final extra iterations 0,
renderer 20 geometries/1 texture. These counters are lifecycle proxies, not heap/
GPU proof or accepted cycles. Across five sequential 108-step active-prefix runs:
controller **including FK/contact diagnostics and sampled planner** mean
9.83–10.57 ms, p95 14.8–16.8 ms; world.step mean 0.251–0.294 ms, p95 ~0.4 ms.
This planner is too expensive to adopt unchanged. Rendering excluded; quantized
timer/no randomization/confidence interval limit interpretation. G1/G2 projectile
and older posture workloads differ. No rAF or unchanged CPU/GPU-cost claim.

## Findings and concrete next decision

| Severity / location | Finding / disposition |
| --- | --- |
| P1 — src/support-path.js reach feasibility / old selected self contacts in src/getup-observation.js | Reach alone misses torso/thigh collision. Corrected for this prototype with src/pose-audit.js full-pose/all-pair audit and forbidden-pose regression. Old controllers remain failed candidates. |
| P2 — tangential contact diagnostic interpretation | Zero legacy readback is not friction evidence. Calibration detects mismatch; no friction-utilization assertion uses it. Actual material-point slip and validated normal loads drive feedback. |
| P1 — src/sole-support-rise.js support guard / terminal trace | Guarded foot rolling still unloads feet before the head. **Open functional blocker**: retain abort, do not expand to stand/belly or claim G3. |

Reviewed added controller, full-pose FK/contact audit, diagnostic isolation,
actual-behaviour tests and browser lifecycle against the issue. Early Three
quaternion serialization via spread (_x fields) was corrected to explicit x/y/z/w
before final measurements; tests check normalized goals and actual native roll.
No new production, G1 rig or G2 change remains.

**Remaining cause:** old deep-flexion pose was collision-invalid; new contact-edge
path avoids forbidden goals but cannot sustain both foot loads and unload the head.
Contact configuration and whole-body path must change together. This does not prove
every physical path impossible or a G1 rig defect. Unloaded actuation is verified;
loaded get-up is not.

**Smallest justified next physical change:** add a collision-aware contact-handoff/
reposition phase opening hip flexion while deliberately relocating support, driven
by remaining loads/slip before extension. A static model example reduces hip pitch
by 0.3 rad and clears all >1 mm self overlaps, but moves left foot **23.90 cm forward
and 2.26 cm up** (right 23.91/2.41 cm). A 0.2 rad change still overlaps 5.19/6.45 mm.
[Reproducible probe](../../tests/support-clearance-probe.mjs),
[data](g3-feasibility-evidence/clearance.json).
These are static examples, not achieved placements or a globally minimal path.
Changing hip goals while retaining old contact targets is insufficient.
No collider/filter/limit/mass change, more force or engine change is justified.
The next handoff phase is **not implemented in this gate**.

| Alternative | Consequence / separate decision required |
| --- | --- |
| Further physical controller | Dynamic supports/Rapier ownership retained; coordinated relocation and full-body workspace needed. Success uncertain; planner cost material. Prove the same intermediate before stand/second fall. |
| Supported animation | Authored movement requires explicit physical support/transform ownership and collision/G2 integration. Scope/acceptance decision needed; cannot silently substitute for fully physical G3. Not implemented. |
| Visible recovery | Explicit timeout/reason and separately counted reset can restore playability but is recovery, not get-up success. Not introduced as a substitute. |

## Verification / scope

**48/48 tests pass**, six new foundation/feasibility regressions plus G0/G1/G2.
Correct pose convergence and wrong-goal failure are function evidence; successful
failed-attempt/cleanup tests do **not** prove G3. Pause/interruption, original joint
frames/torques/solver baselines and ordered G2 handoff 3→19→3→7→3 are tested.
Pause disables actuation/restores budget; original frames restore on stop, not
pause. Never layer controller ownership over an active G2 grab.

Normal and separate QA builds pass, pre-existing bundle-size warning remains.
Normal G2 JS index-CxG9iot5.js SHA256
157b6966aece167a9ed76792f0df37b709b0d8ed70fcc88086e77d2b1a656b04 is unchanged.
No repeat of unchanged G2 full browser QA. QA is absent from normal gameplay.
User files/MCP/server5174 preserved; CI checked on final pushed head.
No new belly/footstand success, 60 s production stand, 20 successful cycles,
integration, Android/device or GPU qualification is claimed.
PR remains Draft; #15 remains open. No merge/deployment/G4/APK.

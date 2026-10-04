# G3 contact-assisted investigation and review

Latest bounded gate from 910e82a: [controller audit, sole-roll contract, evidence and decision](g3-feasibility-review.md). The older sections below are historical failed candidates. The first head-free intermediate still fails; no stand/belly expansion or production integration. G3 remains open; PR #29 remains Draft.

2026-10-03?04. Existing Draft PR #29; fixed base `f353a51807a9d36380f266c49d78ae8c82eb2781`.
Continues report [5969619341](https://github.com/bongohorse/goblin/issues/15#issuecomment-5969619341).
AGENTS, #11/#15, G1/G2 contracts and applicable Rapier, gameplay, diagnosing-bugs,
visual-validation, QA-release, code-review and PR skills used. No engine/version change.

## Current continuation from d396d69

See [four-support / side-support review](g3-four-support-review.md) for the
current shared-path check, load/slip feedback and Windows Edge sequences.
Back aborts on hand slip, belly rejects the back-specific path, and lateral
alternatives also fail to stand. G3 remains open and blocked; 42 tests pass.
The following report preserves the previous gate and its previous evidence.

## Spec

**P1 — reliable contact-assisted get-up still fails.** `src/contact-getup.js`
(transfer/foot placement), `g3-contact-experiment.json`: zero successes in the two
20-second comparisons. Back enters transfer at 0.917 s and aborts at 3.183 s
(`unreachable-support-target`); belly aborts at 0.700 s (`support-loss`).
No sampled frame satisfies the stricter quiet foot-supported standing observation.
The ordered Windows-Edge screenshots confirm a bridge/head-supported movement,
not a plausible completed get-up. Twenty browser fixture repeats (10 back/10 belly)
fail; **0 successful acceptance cycles**, 0 recovery resets. These independent
fixtures include manual reinitialization and must not count toward the required
20 interaction–fall–get-up cycles without reset.

**P1 — G3 game integration/acceptance remains open.** `src/main.js` does not import
posture/controller; `src/posture-state.js` is isolated. No 60-second production
standing, shove→sway/leg-pull→fall proof, actual held/hit/block interruption, wedged/
unsupported/arena-exit recovery, round/teardown integration or active production
posture performance is claimed. No issue/master checkbox is completed.

### Diagnosis and bounded decisions

The original failed trials are reproduced by the exact standing fixture, 6.2 Ns
head impulse at 6 s, passive fall until 14 s; no fallen-body pose writes. Original
initial COM z is −0.197124 m (back), +0.550522 m (belly). Mass is 9.06 kg / 88.8786 N.
Initial foot load is 53.056/45.788 N, foot COM margin −0.483/−0.280 m, although
combined hand/foot margins are positive. In the old timed hip/knee sequence,
back loses hands and foot margin reaches −0.859/−0.451 m after one second; belly
loses foot load. A floor touch did not establish a load-bearing stance.

The first contact candidate still used planar arms. Native self-contact measurements
found roughly 47–155 N upper-arm/head load, plus 42–61 N forearm/torso loads; the
motor pressed into the head rather than planting a hand. The fixes are spatial,
outward-elbow arm IK and native quaternion frame targets. Independent twist targets
for a combined spherical rotation had ~0.496 rad error in the isolated 0.21 test;
frame targets had ~0.034 rad before normalization. A real native convergence regression
checks <0.05 rad. Corrected active back trials after the first second have no >5 N
head/arm contact; all nonadjacent collisions remain enabled.

Premature root uprighting made requested leg reaches ~0.899–0.970 m for 0.80 m
links, or hand reach ~1.023 m for 0.79 m links. Root uprighting is now deferred until
foot placement; sustained unreachable placement aborts. IK clamps reach before
computing both angles, preserving direction and the existing knee/elbow stops.

Without hand extension the back's remaining two hands/right foot carry only ~36–47 N
(versus 88.9 N weight), despite a +0.13–0.17 m geometric COM margin; the head still
carries ~28 N. A single bounded 0.04 m hand-extension trial increases load but loses
remaining support; allowing a lift then aborts on support loss. The final guard also
requires the head to be unloaded. Final back t=2 s has zero right-foot normal load,
only a line remaining from the two hands after excluding the left foot, so no
support area. This is the current specific blocker, not a lack of solver force.
The belly comparison loses reach feasibility (~0.820–0.827 m hands); it is diagnostic,
not an independently developed accepted belly sequence.

**Next technical decision:** retain the spatial arm/frame fixes and guarded aborts.
Before stepping, implement and prove a separate four-support/head-unloading phase
with the now-retained world hand goals, a reachable pelvis/torso path and
force-distribution feedback. World goals alone do not establish stable weight transfer. Keep both feet
loaded until the head is unloaded and one foot can be unloaded inside a nondegenerate
remaining support polygon, then permit lift. Do not weaken the remaining-support
guard or increase all motor forces to force progress. First prove that phase on this
same back fixture. Only then develop belly and varied falls / gameplay integration.
No engine overhaul is indicated by these failed controllers.

## Engineering

Reviewed the actual added code and original PR diff against the fixed base / #15.
Corrections in this continuation:

- **P1, spherical motor targeting / arm placement:** inaccurate combined rotation and
  head/self collision corrected and tested with Rapier, actual contact impulses and IK.
- **P2, `planarIK`:** clamping knee bend after computing hip angle redirected an
  unreachable goal. Reach is now clamped before both angles; endpoint direction test.
- **P2, transfer done sentinel:** completed-foot sentinel could dereference `footdone`;
  terminal step is skipped. Total attempt timeout excludes an already achieved stand.
- **P2, quaternion / direction singularities:** normalize relative orientation and
  supply orthogonal fallback for zero/parallel arm directions and vertical torso X.
- **P2, cleanup / instrumentation:** final state/abort reason recorded, experiments
  free worlds in `finally`; pause and repeated stops restore original frames/budget.
  Measurement times are actual post-step seconds, not one frame early. Quiet stand
  also limits individual body motion, avoiding false quietness from COM cancellation.

36 tests pass: six new behavioral regressions cover support area, rotated/spatial
IK, real native motor convergence, exact dynamic falls, collision fix plus safe
failure, and 20 ordered pause/stop/G2 solver handoffs. The prior six transition tests
and G0/G1/G2 suites remain green. They do not substitute for G3 gameplay acceptance.
G1 masses/colliders/hinge limits and G2 code/solver settings remain unchanged.
The candidate creates no new body/joint; all bodies stay dynamic. Motor caps are
per axis (20 Nm, up to 20√3 resultant), internal balance cap 24 Nm with opposite
reaction torque. No world anchoring, body transform/velocity writes or recovery resets.

## Windows Edge visual, resource and performance evidence

Windows Edge MCP 154, Windows 10 user agent, local production entries served under
`http://127.0.0.1:4174/goblin/`. Separate diagnostic entry is a real live Rapier
fixture compiled by Vite, not a prerecorded transform replay. Desktop 1100×850,
ordered screenshots at 0/0.5/1/2/4/6 simulated seconds (explicit fixed-step advance):

- [Back sequence](g3-evidence/back-0s.png), [1 s](g3-evidence/back-1s.png),
  [2 s](g3-evidence/back-2s.png), [abort / 6 s](g3-evidence/back-6s.png).
- [Belly](g3-evidence/belly-0s.png), [lift / 0.5 s](g3-evidence/belly-0.5s.png),
  [abort / 1 s](g3-evidence/belly-1s.png).
- [Browser samples and performance](g3-evidence/windows-edge.json),
  [Node physical trace](g3-contact-experiment.json).

Visible checks: head remains a support; the trunk bridges and feet tilt instead of
producing a quiet upright stance. Twenty fresh failed fixtures retain 15 bodies /
14 joints, final extra iterations 0, renderer 20 geometries / 1 texture. No retained
physics connection or resource-count growth observed. This is a lifecycle proxy,
not proof of arbitrary heap/GPU resource cost or 20 accepted cycles.

Sequential browser CPU-call measurements, 120 active-prefix steps per profile, same original back
fixture; active controller includes diagnostic contact queries, no renderer in the
measured call. The +0 comparison explicitly overrides the candidate's fixture
budget for measurement; it is not an integrated production setting. No warmup,
randomized order or confidence intervals: indicative costs only, short calls at
~0.1 ms timer resolution.

| Profile | world.step mean / p95 (ms) | controller+diagnostics mean / p95 (ms) |
| --- | --- | --- |
| passive, +0 | 0.0067 / 0.100 | n/a |
| passive, +16 | 0.0117 / 0.100 | n/a |
| active candidate, +0 | 0.1100 / 0.200 | 0.1300 / 0.200 |
| active candidate, +16 | 0.2675 / 0.400 | 0.0717 / 0.200 |

Sleeping passive costs cannot stand in for active stance/get-up costs. Active +16
increases world-step cost about 2.4-fold here; neither profile stands. Earlier
G1/G2 projectile/rAF evidence is a different workload; no equivalence or unchanged
CPU/GPU claim is made. Historical Node standing +16 improved stance drift to 0.234 m
in 60 simulated s (default 2.947 m); that explains investigating +16, not adopting it.
The controller owns/restores its candidate budget. Explicit G2 handoff test starts
with 3, rises to 19 during posture, restores 3, G2 adds 4 (7), then restores 3.

## Production regressions and remaining acceptance

Normal production bundle remains G2: JS `index-CxG9iot5.js`, CSS `index-CP0aMMiy.css`;
main JS SHA256 `157b6966aece167a9ed76792f0df37b709b0d8ed70fcc88086e77d2b1a656b04`.
Windows Edge desktop 1280×720: all 15 parts + prop, seven off-centre four-second
holds (1.52–7.12 cm error), slow release 0.530 m/s/no throw vs fast 7.114 m/s/throw,
three cameras/drag planes pass. Twenty grip/reset cycles stay at 26 bodies/14 joints,
clear forces/connections; pointer cancel/capture loss/blur/pause/tool/camera/resize/UI,
second pointer, coalesced input, no restart, immediate reset-picking and paused reset
pass. Debug collider/joint/contact views enable/disable, resources return to zero,
mesh/body position error 0 and rotation error ≤5.2e−8 rad; reload `/goblin/` assets pass.

Touch **emulation**: 360×744 portrait / 744×360 landscape, touch CDP events, DPR 3;
grab/throw (2.749/5.696 m/s), cancel without throw, no UI overlap/full canvas pass.
No relevant application console errors/warnings. Two diagnostic-script attempts
omitted `?debug` or ran after round end; their tool timeouts are not application
errors or claimed successful checks. Successful runs used the opt-in diagnostics
and a fresh round. True Android, OS visibility and GPU performance are not proven.

Build passes with the pre-existing large-bundle warning. Normal build excludes the
separate QA entry. All G3 production acceptance remains open, including 60 s stand,
20 successful cycles, actual grip/hit/block/recovery integration, lifecycle and active
production costs. PR stays Draft, #15/G3 stay open. No merge, deployment, G4 or APK.

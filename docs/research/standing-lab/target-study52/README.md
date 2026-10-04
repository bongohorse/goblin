# Issue52 decision: retain MovingFrame reference

2026-10-05. **Retain MovingFrame/FB100/12/Solver32.** Fixed native spherical
targets are a demonstrated candidate for the tested small orientations, not a
globally interchangeable controller. Neutral full-rig inputs are physically
identical: no stability gain. No runtime integration, default change, balance
controller, merge or deployment.

[Preregistered protocol and pilot clarification](../target-study52-protocol.md),
[raw fixture measurements](fixtures.json), [study/CPU/regression report](report.json),
[22-file SHA256 manifest](sha256.json). All20 individual runs are in this directory.

## Coordinates and feasibility

Public Rapier0.21.0 SphericalImpulseJoint methods support angular position/model/
max-force commands. The existing descriptor-checked public constructor adapter
handles the known factory classification defect; no new raw setter/mask/prototype
patch. Binding position commands set target velocity to0 (generic_joint.rs::
set_motor_position). Bodies remain dynamic, angular DOFs/anchors/contacts unchanged.

For local bind frames F1/F2, Q=inverse(parent*F1)*(child*F2). Desired relative body
orientation D maps to T=inverse(F1)*D*F2. Canonicalize unit T to w>0, then
**native a_i=2asin(T_i)**, not Euler angles. The pinned rigid-body solver
joint_constraint_helper.rs::motor_angular uses those component coordinates and
the parent attachment basis for velocity/impulse rows. The generic multibody
path instead compares sine half-angles; it was read, not physically tested.
No supported spherical scalar-position getter or actual motor-impulse getter
is used: measured orientation/velocity come from bodies, coordinate interpretation
comes from pinned source plus independent reconstruction/tracking fixtures.

Quaternion components are coupled: sum(sin(a_i/2)^2)<=1. The positive hemisphere
recovers w; at pi the hemisphere sign is ambiguous/discontinuous and component
asin can be singular. The experiment rejects targets outside <=1rad, but only
its finite small target set is verified. It does not certify every orientation
inside that domain, a global target mapping, multibody behavior or a global
continuous controller. These are adoption limits, not invented Euler targets.

MovingFrame commands F1*T and zero motor coordinates; fixed-native commands F1
and a_i. Their equilibria match here. Nonzero commands rotate the MovingFrame
motor axes and world-space per-axis cap box, and create different error/velocity
fields. Equal physical desired orientation, native gains and per-axis Nm caps
therefore do NOT mean equal transient torque or general dynamic equivalence.
That difference is explicit, not a hidden DOF/frame change. FullRig uses only the
unchanged neutral T=identity, where both representations have identical axes.

## Isolated physics evidence

144 fresh actual Rapier tracking cases: both representations/caps20,1; neutral,
+/-.3rad on every axis, two combined targets; identity and nontrivial world plus
different bind frames; q/-q. Two dynamic centred isotropic .4m spheres, masses1/2kg,
no gravity/contact/damping;240 steps/dt1/60/Solver32. Every world freed.

Maximum end error8.336975e-6rad (<.01), relative speed6.962661e-5rad/s (<.01),
independent Three.js matrix error1.179917e-5 (<.01). q/-q maximum trajectory
angle and velocity difference0. All6 off/sign/axis negatives exceed.15rad.
Quaternion-component reconstruction passes the independent matrix oracle.
Maximum MovingFrame/fixed-native transient orientation difference.008804784rad;
equal final goals are not equal trajectories. Neutral paired trajectories pass
the preregistered1e-5rad/1e-4rad/s bounds (world/bind float32 rounding included).

12 separate first-step native velocity-saturation cap/reaction rows: both
representations, caps.05/1/20, both signs, common body orientation Ry(.7),
MovingFrame command frame nontrivial. Every per-axis effort component lies within
max(1e-4,cap*1e-5)Nm; momentum residual max3.384563e-7kg*m^2/s (<1e-6), unequal
inertia angular-speed ratio within2 +/-1e-4. This indirect deltaL/dt measurement
uses the PRE-step motor-frame basis; caps are per axis, not a vector-norm bound.
The velocity command deliberately overrides position targets; these rows are
not tracking or Standing evidence.

**Preserved negative probe:** different initial body rotations from the bind-frame
tracking case, fixed-native cap20/+ velocity saturation, momentum residual
1.0696400757e-6 exceeds the strict1e-6 bound. The pilot precision miss was published
before final measurement; the original probe is still measured and stored with
strict_1e_6_pass=false. No threshold was relaxed, and it is not counted among the
12 passing common-frame cap rows. Float32/oracle resolution is a plausible cause,
not a diagnosed upstream defect. No all-frame reaction-precision claim or global
candidate acceptance follows from the other positives.

## FullRig: neutral no-op

Five fresh NORMAL runs per representation/cap (20 total), original rig, masses,
materials, contact/limits, dt1/60, FB100/12, Solver32. Hinges unchanged. All repeats
have exact physical sequence hashes, terminal data, peaks/end and contact onsets.
MovingFrame and fixed-native have identical complete body checkpoints and
secondary measurements for each cap. No invalid run or post-contact continuation.

| Both representations | Cap20 | Cap1 |
| --- | ---: | ---: |
| Steps / termination |3600 / timeout|187 / both hands|
| Standing time (s) |60|3.116666667|
| Peak drift (m) |.194125596|.864053327|
| Peak tracking (rad) |.148907878|1.284276922|
| Peak anchor error (m) |.000314006|.000380772|
| Peak hinge limit error (rad) |.000159224|.001974002|
| Both-feet-loaded steps / fraction |3300 / .916666667|31 / .165775401|
| Peak left/right load (N) |45.866628 / 43.850119|60.348502 / 61.173524|

Pelvis/torso quaternions, final loads, joint observations, tracking velocities and
contact chronology are in each run. Different cap durations make loaded fractions
descriptive, not a fairness-normalized ranking. Actual FullRig effort/saturation
remain null with the supported-getter limitation; deltaOmega there cannot separate
motors from contact/limit impulses. Cap20 timeout alone is not full standing,
support/drift/robustness or production acceptance.

Fresh passive-v1:70 steps; force-v2:3600/187; all6 model-v3 cases: FB3600/187,
AB69/73, scalar-calibratedAB252/242. All historical checkpoint comparisons have
deviation0. V3 complete peaks/end/contact/sequence values match Review50 exactly;
neutral candidate checkpoints match the current original force-v2 directly.
Old schemas/config IDs/result files and runtime behavior were not edited.

## Matched CPU evidence

Windows10.0.26300 x64, AMD Ryzen5 5600X, Node24.21.0. First60 steps only, each
cap/representation3 warmup +5 measured fresh worlds, alternated order. Startup/
reset excluded.300 samples/channel/row, raw world segments in report.json; all
summaries and segment flattening independently recalculated. Observed minimum
positive timer delta.0001ms is not guaranteed resolution. Background load is
uncontrolled; no significance or platform-wide ranking.

| Cap / representation | Physics median/P95 ms | Commands median/P95 ms | Observation median/P95 ms |
| --- | --- | --- | --- |
|20 / MovingFrame|.3364 / .5591|.0064 / .0125|.0752 / .1409|
|20 / fixed-native|.3474 / .6122|.0106 / .0200|.0796 / .1602|
|1 / MovingFrame|.3398 / .6051|.0064 / .0122|.0773 / .1588|
|1 / fixed-native|.3381 / .5692|.0097 / .0196|.0755 / .1559|

No consistent physics benefit. This prototype's fixed-native command path repeats
quaternion validation/conversion, so removing frame writes did not reduce measured
command cost. Precomputation/optimization is deferred, not a demonstrated benefit.
No GPU, weak-device, native-hidden or production CPU-budget certification.

## Spec

Reviewed against fixed base9c7ced77 and Issue52. No remaining evidenced missing
criterion for this bounded research deliverable. Global dynamic interchangeability
is explicitly unproven and contradicted by nonzero response differences; reference
retained. Per-axis caps keep native units but rotated axes are disclosed. Neutral
full-rig no-op is not a stability result. Versioned research-only namespace/config
SHA distinguishes each representation/cap; old exports remain unchanged.

## Engineering

**P2 fixed — scripts/spherical-target52.js::validateTargetRun:** additional legacy
result fields could be accepted beside the research report. Strict top-level field
set now rejects mixed/missing fields; 15 corruptions covered (including false
version, modified frozen config, missing end/metrics, bad peaks/terminal, tracking/
body/checkpoint/effort and legacy fields). Existing neutral body/measurement
validators are reused via an ephemeral local projection that is NEVER exported as
a v2 result or a claim about candidate command representation. State sequence
digests plus file manifests establish recorded identity, not cryptographic
authenticity or reconstruction of every unstored timestep.

**P3 fixed — spherical-target52-fixtures.js::counterreaction_resolution_probe:**
removed an unjustified float32-cause label. The tolerance miss remains false and
its cause explicitly undiagnosed. No physics/tolerance fix was invented.

64/64 tests pass; npm run build passes (existing Rapier chunk-size warning).
Actual fixture behavior, invalid latch,20 reset cycles, exact counts15/16/14,
handle/event/world replacement and idempotent disposal checked. No runtime/UI/
asset/gameplay/dependency/vendor/config/workflow diff, so no new browser candidate
route or #52 browser acceptance is claimed. #51 live QA is historical baseline
evidence only. Final DraftPR CI is reported in GitHub after this evidence commit.

## Provenance and reproduction

Final measured clean code/harness head:
3f6adccaa190b575c4bf39a3df9d1e4fbf53255e, dirty=false.
Raw-byte application/build/harness SHA256:
fdc00661f9a36a57a86fe6dd722efd4d89801db131d430473981e6ac2c6e7789.
Protocol raw-byte SHA256:c1786a6d42c725e0acb930337f4208769c5a5c5c651121ac6edd3e3471d500a8.
Earlier clean a882809 rehearsal also matched; only final3f6adcc evidence is stored
here. Later commit is documentation/evidence only. Line-ending-dependent byte
hashes identify this host's inputs, not a portable Git tree fingerprint.

Node24.21.0, locked npm ci, initialized pinned vendor/rapier:
`npm test`; `npm run build`; `node scripts/spherical-target52.js` from a clean
worktree. Set GOBLIN_TARGET_OUTPUT to an external directory (default external
../.standing-tools/target52) to keep measurements clean. Each exported run can be
read with validateTargetRun from that script; inspect the manifest with SHA256.
All22 final file hashes and20 stored runs have been independently revalidated.
CPU summaries match raw samples exactly. No numerical rerun is needed merely for
the later documentation/evidence commit.

Decision options: retain MovingFrame now (recommended); authorize a future,
explicitly bounded fixed-target integration separately if its maintenance benefit
is wanted; do not adopt as a global dynamically equivalent replacement. Full
balance/recovery/controller work remains outside this issue. Stop at DraftPR.

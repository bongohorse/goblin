# Issue54 / PR53 review and decision

2026-10-06. **Recommend merging the research-only PR53 at the final GitHub-reported
head after a separate merge decision.** Retain MovingFrame/ForceBased reference.
The strict rotated-body counterreaction miss remains negative and blocks an
all-frame reaction-precision claim or candidate-controller adoption; it does not
block this report that explicitly preserves the failure and changes no runtime.
No merge, deployment, default switch, new study or balancecontroller performed.

**Self-review boundary:** this is a separate execution of the repository
code-review workflow by the same agent that authored Issue52. It is not independent
human approval; no external GitHub review was present at review start. No APPROVE
submission or draft-ready action is implied by this recommendation.

Fixed review base9c7ced77f873716e9a1d9a76e9fd971a0db44a84;
original PR53 head4876bd5775ec011f82859861e0b2b84c3e39f9a5;
original measured harness3f6adccaa190b575c4bf39a3df9d1e4fbf53255e.
Actual origin/main at start245fcd2 (PR58 workflow/skill documentation only),
not substituted for the fixed review basis. No production-physics divergence.

[Original protocol/pilot amendment](../target-study52-protocol.md),
[original decision/evidence](../target-study52/README.md),
[fresh review report](review.json), [independent oracle](counterreaction.json),
[fresh fixtures](fixtures.json), [23-file review manifest](sha256.json).
All20 fresh individual normal runs are stored alongside this report.

## Spec

No remaining evidenced scope finding after the reader fix. Installed0.21.0 public
SphericalImpulseJoint position/model/cap/frame declarations and pinned
b716d375 helper::motor_angular checked. Hemisphere-canonical attachment quaternion
Q=inverse(parent*F1)*(child*F2), with desired body D yielding
T=inverse(F1)*D*F2. Targets2asin(T_i) match the rigid-body solver's component
coordinates, not Euler angles. Quaternion coupling, pi discontinuity/singular
component derivative and different generic-multibody sine coordinates are disclosed.
No claim that the whole accepted <=1rad input continuum or global control has been
physically certified: the actual finite small target set is the evidence.

Native axes use the parent attachment basis. MovingFrame rotates that basis and
the world-space per-axis cap box for nonzero T; fixed-native uses unchanged F1.
Both retain all3 angular freedoms and3 translation locks/unchanged anchors.
Equal small-target equilibria/native100,12 gains/physical per-axis Nm caps do not
imply equal transient torque/velocity fields. Existing nonzero trajectory
differences remain; neutral identity targets are identical inputs and a no-op.
Hinges, rig, masses, materials, dt, solver, limits and anomaly/termination rules
are unchanged. Actual FullRig effort/saturation remain null/N/A.

Fresh144 tracking cases,12 dedicated cap rows,6 off/wrong-sign/wrong-axis controls,
mapping-oracle and paired trajectories all reproduce the complete original
fixture payload exactly. q/-q, every axis/sign, combined targets, world and
different bind frames retained. No loosening of tracking, matrix, speed, cap,
reaction, repeatability or invalid bounds. Bodies remain dynamic; World teardown
is explicit. Existing reset/count/invalid-latch checks rerun in npm test.

## Counterreaction assessment

Exact original rotated-body case: world Ry(.7)*Rz(-.4),
F1=Rx(.4)*Rz(.2), F2=Rz(-.5)*Ry(.3), child=P*F1*inverse(F2),
centred radius.4m spheres of1/2kg, no gravity/contact/damping, both dynamic,
FB100/12/cap20/Solver32/dt1/60. Initial fixed-native small target then native
configureMotor(axis,0,100,100,12) on each axis, as originally measured.
The second command overrides POSITION targets. This is a velocity-saturation
cap/reaction fixture, not evidence of position-target actuation effort.

Independent Three.js frame composition and normalized principal-axis world
inertia R*diag(I)*R^T, with spin I_world*omega AND orbital COM cross m*linvel,
verify the momentum measurement. Recorded initial momentum0, COM0, translation0
and orbital contribution0; isotropic diagonal inertia.06400000304/.12800000608
kg*m^2 agrees with theoretical uniform-sphere2/5*m*r^2 to float storage accuracy.
We do not replace the observed oracle with an engine-derived alternate to erase
the miss. Full before/after inertias, rotations, velocities and momenta are raw.

| Independent oracle | Residual kg*m^2/s | Strict <1e-6 |
| --- | ---: | --- |
| Original scalar I*omega, fresh |1.069640075727165e-6|FAIL|
| Reconstructed WORLD tensor + orbital |1.069640075609966e-6|FAIL|
| Analytic sphere inertia |1.069640024907684e-6|FAIL|

First-step deltaL / actual float32 dt, rotated into the normalized PRE-step
motor frame, yields20-axis effort19.99999858/20.00000171/19.99999541Nm,
within unchanged cap*1e-5 component bound. Intentionally using the forward frame
instead of its inverse yields32.68786/-3.88692/-10.78867Nm and fails the intended
cap-component oracle. Norm of total WORLD momentum needs no frame rotation.
No missing inertia/orbital term or wrong world-frame/unit convention explains
the strict miss. Its engine/rounding/solver mechanism is UNDIAGNOSED; no float32
cause or production defect is asserted. No solver sweep or corrective tuning.

The pilot's change to common initial body frames was data-informed, explicitly
published before final measurement, not the original untouched a-priori cap
selection. Original negative probe and threshold remain in source/raw evidence,
never counted among12 common-frame positives. Those prove only the declared
velocity-saturation cap/reaction cases. Their cap behavior and the successful
small-goal tracking do not certify arbitrary-frame reaction precision.

**Decision on the miss:** accept the bounded scientific disclosure and retained
reference; reject all-frame pass/controller-adoption claims. Thus no fundamental
proof blocker for this research-only PR after fix. If future work requires the
strict rotated-body reaction bound, hand off exactly this fixture and raw oracle
for a separately scoped diagnosis BEFORE any adoption. Do not relax1e-6 or change
rig/solver/gains in that handoff. This review does not start that investigation.

## Fresh normal runs and old baselines

20 fresh NORMAL worlds:5 per representation/cap. Every physical report field,
contact chronology, full scheduled/terminal body checkpoints, end/peak metrics,
terminal telemetry and physical sequence hash matches the corresponding original
run exactly. Cap20:3600steps/60s/timeout, both representations; cap1:187steps/
3.116666667s/simultaneous handL,handR contact. No invalid or post-contact continuation.
Therefore all repeats and neutral A/B stay exact, with no stability advantage.
Standing-time timeout alone is not a full standing/support/drift acceptance.

Fresh passive-v1(70steps), FB-v2 caps20/1(3600/187), all6 model-v3 normal
cases(FB3600/187, AB69/73, scalar-calibratedAB252/242) have historical checkpoint
deviation0. Complete V3 metrics/end/contact chronology/sequence hashes match
Review50. No new model/calibration/pose/support/solver experiment or diagnostics
after contact. All22 original evidence byte hashes, original protocol hash and20
stored target runs validate; original evidence and schemas remain unmodified.

## Engineering

**P2 fixed — scripts/spherical-target52.js::validateTargetRun.** Original4876bd5
accepted unknown nested metrics containing NaN, metrics.schema_version=2 and
foot_load_peak_N.extra=Infinity. Top-level strictness and existing typed body
projection did not cover these ignored outer fields, so a supposedly valid
comparison import could carry nonfinite/mixed measurement data. New focused test
failed before the fix. Target-reader-only exact nested metric/load/onset keys
and recursive finite checks now reject them. No old v1/v2/v3 schema or reader
changed, no simulation/gain/tolerance change.25 new corruption cases cover unknown
and legacy fields, missing measurement/peaks, wrong study/model/frames/contracts,
nonfinite outer/inner/body/timing fields and false steps/terminal/support/chronology;
all rejected. All original20 and fresh20 reports still pass.

No remaining evidenced runtime, resource, physics, asset or scope finding.
No code changes in src/labs/public/dependencies/vendor/workflows/user config.
Self-review checks the fix and its blast radius: CLI research reader/harness/tests
only. Existing World/EventQueue reset/disposal tests and resource counts rerun.

Original CPU data independently reaggregated: all4 cap/representation rows,
3warmup/5measured worlds, rounds3..7, first60Steps,300 finite nonnegative samples
per channel; world flattening and median/P95/max exactly match stored summaries.
Alternating order and excluded startup/reset checked in source. No CPU remeasurement
or performance ranking added by this review. No GPU/weak-device/budget claim.

67/67 tests and npm run build pass; existing Rapier chunk warning only.
Browser N/A because no runtime/UI/assets changed. No candidate browser path or
new live/browser acceptance asserted; historical #51 Pages evidence stays historical.
Final PR-head CI and current metadata are documented directly on GitHub after the
evidence commit, without a docs-only repeated simulation loop.

## Provenance and reproduction

New clean measured fix/review-harness head530174871f93f28d169c6ea4ef27deebb1550ff2,
dirty=false. Source/build/harness SHA256:
a8b43967da40a2b9dbd7a6b060d389eed4db6061b43689994a81c6072e04611b.
Windows10.0.26300 x64, Ryzen5 5600X, Node24.21.0, installedRapier0.21.0,
read-only pinnedb716d375. Subsequent docs/evidence-only head is reported in GitHub;
no unreported newer code supersedes the recorded harness.23 new raw review-file
hashes and20 stored fresh reports independently validated after copy.

With locked npm ci and pinned vendor initialized, run npm test; npm run build;
node scripts/review-spherical-target54.js from a clean worktree. External output
defaults to ../.standing-tools/review54 or GOBLIN_REVIEW_OUTPUT. Review does not
remeasure CPU; it recalculates the existing raw samples. Raw-byte source hashes
include exact harness inputs, not a universal portable Git-tree/host guarantee.
Sequence digests cannot reconstruct unstored timesteps or prove authenticity.

Recommendation is limited to the final research-only PR/head, with this disclosed
negative probe and the fixed reader. Keep PR draft until a separate decision;
#52 stays open. No independent approval or production-controller release. STOP.

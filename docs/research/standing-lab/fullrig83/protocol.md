# Issue83 — bounded FullRig torso/pelvis A/B, plan v1

2026-10-08. **UNEXECUTED SPECIFICATION / HYPOTHESIS**. Decision:
`ready_for_scoped_execution` means ready for a separately authorized runner,
preflight review and preregistration, not an implemented controller or permission
to run. No world was allocated in Issue83. Base main/PR80 integration:
`2abd3db7a339666a6ca0fc1d5618712cd4d6f09c`. Parent #60, program #30/#31.
Machine-readable values and all concrete ordered IDs are in [plan.json](plan.json).
[Execution handoff](execution-handoff.md); [self-review](review.md).

## Evidence and inspected sources

Read AGENTS.md, to-tickets/research/code-review, Rapier router/joints/stability/
interaction skills, docs/rapier/README.md, Issues60/79/81/82/30/31, their current
completion decisions, review81/README.md, smalltilt79/protocol.md and the frozen
review77/upright-proposal.md. Local sources below refer to the fixed base above;
source-pins.json hashes the inspected files. It records source identity, not
experimental observations. The installed package read in the isolated Issue82
checkout is Rapier0.21.0 and agrees with package-lock.json. The read-only local
vendor submodule is exactly b716d375efc0201003f0cd9ef7168eee0b62c177 (js-v0.21.0).

| Source at base | Contract actually inspected |
| --- | --- |
| src/labs/standing/simulation.js | reset/build/audit/step/terminal/export/dispose; motor-free config currently inherits Solver8, experiment overrides32 |
| src/labs/standing/motors.js | all14 neutral targets, ForceBased100/12, moving frame, public same-handle spherical view, native per-axis cap20Nm |
| src/labs/standing/motor-config.js; model-config.js; config.js | existing exact frozen-v2/v3 validation rejects a new experiment; new namespace required |
| src/labs/standing/measurement.js; math.js | COM, actual floor contacts/load/normal/flipped, hinge frames/limits, first non-foot terminal |
| docs/research/standing-lab/baseline-config.json; contracts.md; motor-config.json; motor-contract.md | actual15-body/14-joint rig, SI/frames, material/damping, calibration and availability limits |
| scripts/torso-torque60-oracle.js; finite-step66-reference.js; review-actuation74.mjs | shape inertia, spin+orbital H and bounded f32 torque representation; no FullRig conservation oracle |
| docs/development/labs.md; docs/research/active-ragdoll-standing-recovery.md; physics-labs-experiment-program.md | isolated research, time alone insufficient, no optimization/recovery/production authorization |

Installed dist/dynamics/rigid_body.d.ts exposes addTorque(Vector,true),
resetTorques(true), userTorque(), principalInertia(), principalInertiaLocalFrame(),
effectiveWorldInvInertia(), worldCom(), linvel()/angvel(), and recomputeMassPropertiesFromColliders().
Corresponding pinned bindings/typescript/src.ts/dynamics/rigid_body.ts: world-space
torque about COM; persistent user accumulators. The pinned guides under
website/docs/user_guides/templates/rigid_body_{forces_and_impulses,mass_properties,damping}.mdx
confirm persistence, shape-derived inertia and damping. impulse_joint.ts and
src/dynamics/joint/motor_model.rs confirm native axis caps and ForceBased units.
geometry/narrow_phase.ts exposes contactDist/localContactPoint/contactImpulse.
No unsupported warmstart knob, raw motor impulse getter or controller PID is used.

SmallTilt79/81 supports only its dynamic torso/upperArmL, shoulderL, zero-gravity,
zero-contact, zero-damping/motor fixture. **Partner transient peak34.242619879418996
rad/s versus final max0.8537436605789117rad/s** is a planning warning. Gains1.34/1.34
and cap.15Nm do not transfer automatically. Engine precision remains
indeterminate_not_certified; historical false/null evidence is preserved.

## One physical distribution and its limitations

Exactly **torso +tau; pelvis -tau; every other body zero direct torque**. Both
are existing dynamic bodies linked by spine. This avoids directly accelerating
the much smaller .35kg arm; it is one adjacent trunk actuator, not a remote
hip/ankle or COM feedback distribution. Commands are free couples at body COM,
with zero direct force and zero summed direct world torque. Equal commands do
not imply opposite angular velocities, pair energy decrease, or conserved world H.

Spine: parent pelvis1.6kg capsule(h=.09,r=.20); child torso2kg
capsule(h=.15,r=.24), world anchor(0,1.34,0), local anchors pelvis(0,.20,0),
torso(0,-.15,0), revolute local+X, limits[-.3,.3]. Actual stored floating values
come from baseline JSON, not rounded values here. Local+Y is torso up; local+Z
forward. Read actual frameX1/frameX2 and world anchors every step.

**Only relative pitch is free at spine.** Roll/yaw torques encounter locked
relative axes and can be reacted by constraints rather than rotate torso alone.
The roll case is intentionally a transfer test, not a presumed spherical DOF.
Retain topology/limits; no extra joint or mask unlock. Lack of roll benefit is
an admissible negative research decision and stops further execution, not a
reason to redistribute torques or change the rig here. Gravity/feet/chain
coupling can alter response; this plan makes no controllability proof.

Anisotropic world inertia is Iw=R(qbody*qprincipal) diag(Iprincipal)
R(qbody*qprincipal)^T; its inverse uses reciprocal positive principal moments.
Read rotation, principal frame/inertia and public inverse tensor at matching PRE.
Never divide a general vector by one scalar inertia. Pure ideal capsule formula,
with cylinder mass mc=m*2h/(2h+4r/3), ms=m-mc:
Ix=Iz=mc(r²/4+h²/3)+ms(2r²/5+h²+3hr/4), Iy=mc*r²/2+2ms*r²/5.
Torso moments (.09607354838709675,.051654193548387094,.09607354838709675),
pelvis (.044105074626865685,.028179104477611946,.044105074626865685) kg*m².
The transverse reduced FREE-body inertia Ir=(1/Itx+1/Ipx)^-1
=.030228082785908345kg*m² is only a conservative design scale, not the
constrained/loaded/motorized FullRig effective inertia or a response oracle.

Select characteristic frequency1rad/s (6s provides six characteristic times;
low-bandwidth initial probe). Kp=Ir*1²=.030228082785908345Nm/rad,
Kd=2Ir*1=.06045616557181669Nm*s/rad. These correspond to a critically damped
ideal FREE relative coordinate; actual law uses absolute torso damping and the
fixture includes1.3/s body damping, so **no critical-damping claim for the rig**.
Choose C=min(pair principal inertia)*.001rad/s/(1/60s)
=.0016907462686567168Nm. This limits the isolated direct-input angular-velocity
increment on either free pair body to approximately.001rad/s per nominal step,
far below the segment sampling guards below. Actual Float32 dt is logged; its
slightly larger value changes that illustrative increment, not C. Constraints, contacts, gravity and motors can exceed it; observed state guards are mandatory.
These settings deliberately test a small input, not gravity compensation or
maximum available actuation. Native20Nm-axis commands dwarf C; a masked/no-gain
result remains useful and must not trigger tuning.

u=R(qtorso)(0,1,0); theta=atan2(|u cross Y|,u dot Y).
e=theta*(u cross Y)/|u cross Y| with e=0 at theta=0;
wperp=omegaTorso-u*(u dot omegaTorso). tauRaw=Kp*e-Kd*wperp.
No yaw target and no relative-omega damping substitution. Reject theta>.2rad
before applying any further command; antiparallel/singular state is outside
domain. Cap the entire DOUBLE vector norm to C, then round each component toward
zero Float32 with the existing bounded-toward-zero policy and exact dyadic norm
check. Pelvis command is the EXACT negative of that encoded vector, canonical
zeros. No independent negative rounding, per-axis-C substitution or double dt.
Per-body norm≤C; total absolute direct norm≤2C; exact vector sum0. Other13 body
userTorques/userForces must remain0. Encoded axial leakage is logged, not called
bit-exact transverse. Off applies zero while recording the same law as shadow.

Phase shared by Off/On: immutable PRE → wake all15 bodies (same policy both)
→ clear15 user-torque accumulators/verify0 and verify userForces0 → native pose
commands only for fb32, unchanged targets → compute from that same PRE → add
once torso/pelvis (zero in Off) → read back both/other bodies → exactly one
world.step(eventQueue) → simultaneous POST, contacts/terminal/guards → clear
accumulators/verify0. No intermediate step or state repair. Gravity is not a
user force. Native motor configuration does not expose actual solver torque in
userTorque(); do not clear/change its internal solver state. No transform writes
after step-0 initialization. All15 remain dynamic, default sleep/CCD settings
unchanged, same wake policy and fresh-world lifecycle per trial.

## Minimal paired matrix and initialization

Two separate questions, never pool their outcomes:

| Condition | Pose targets/ownership | Horizon per world |
| --- | --- | --- |
| free32 | no NativePoseHold constructed/bound; joints retain constraints | 1 step, direct-command/geometry control only, not small-upright extrapolation |
| fb32 | existing neutral moving-frame ForceBased100/12/20Nm on ALL14 joints, including spine | ≤360 steps, actual bounded behavior alongside existing pose reference |

Torso feedback owns only direct torque. NativePoseHold alone owns pose targets,
joint frames/motor models/caps. No target edits, disabling spine motor,
AccelerationBased variant or adaptive blending. Track spine opposition through
relative state/pose tracking and signed direct power; **actual native effort and
its overlap with direct actuation remain N/A**. No causal claim of motor fighting
from a pose error alone. Spherical configured vector bound is sqrt(3)*20 per
joint; hinge axis20, not a20Nm whole-body cap. The summed incident nominal cap
bound plus C is a configured upper bound only, never measured torque.

Both conditions: frozen15-body baseline dimensions/masses/damping/materials,
gravity(0,-9.81,0), floor top0, half(6,.2,6), friction.9; feet1/others.7,
restitution.03/default combine, no sensors/contact skin; adjacent contact off,
all other self collision on. Solver32/PGS1/extra0/CCDsubsteps1, allowed error.005,
prediction.02,lengthUnit1, dt1/60 (require actual Math.fround(1/60)). free32 is a
NEW study condition, not relabeled historical passive-v1/Solver8 baseline.

Four starts: null identity; yaw=Ry(.7) only; pitch=Ry(.7)*Rx(.04);
roll=Ry(.7)*Rz(.04). No negative tilt trajectory variants or sweep; q/-q,
negative-axis and yaw-covariance checks are pure preflight controls.
Rotate the ENTIRE authored rig about p=(0,.12,.08): x'=p+R(q)(x-p),
qbody'=q*qbody. Rotate authored joint positions for initialization checks;
body-local anchors/hinge axes/limits remain unchanged. Zero all initial linear/
angular velocities. Preserve neutral relative poses and bind frames through
actual joint getters; do not accidentally adopt a tilted world target as neutral.
Baseline foot clearance .02m exceeds pitch corner drop ≤.22sin(.04)+
.10(1-cos(.04))≈.008879m and roll drop≤(.16+.13)sin(.04)+
.10(1-cos(.04))≈.011677m; yaw adds no vertical drop. Common rotation preserves
nonadjacent shape separation and anchor congruence. Actual public shape queries,
mass recomputation, initial anchors/axes/limits/contacts still must validate,
not repair, the quantized setup before step1.

Exact order from plan.json: wrong-sign pitch/free32 repeats1..5, missing-reaction
pitch/free321..5; then free32 null,yaw,pitch,roll; then fb32 same cases.
Within each case repeat1..5, Off immediately followed by On. Each is a fresh
independent world, never a reset continuation. **90 allocations maximum:
10 negative+40 free32+40 fb32; maximum14,450 public steps** (50*1+40*360).
No pilot, warmup worlds, CPU benchmark, extended fall continuation or rerun.

Negatives physically APPLY a bounded faulty command for exactly one step in
free32/pitch: wrong-sign flips proportional sign only (zero initial omega,
e dot actual torsoTorque<0 instead of>0); missing-reaction applies canonical
torso torque but pelvis0 (nonzero summed direct readback). Positive command
validator must classify them as deliberate fail_command at PRE; the diagnostic
entry permits ONLY that registered fault for one step, logs POST, then terminates
expected_negative_detected. An unregistered fault is global stop. These are
actual public API faults, not mutated post-hoc records or weaker criteria.
Compare matching five planned free32/pitch/On PREs/first-step commands, no extra
worlds. Require same setup and nonzero distinct readbacks at the planned
classification phase. With gravity/contacts, H residual/tilt worsening are
DESCRIPTIVE, **no physical missing-reaction-H threshold** is invented. If faults
are not detected, stop before the next world; deferred matched comparisons are
pending until world40 (last free32/pitch pair), never secretly approved early.

## Numeric behavior limits and why they exist

These are explicit pre-run experimental design requirements, not inferred
Rapier error bounds or thresholds fitted to historical observed maxima.

| Quantity | Frozen rule | Geometric/behavioral basis |
| --- | --- | --- |
| Torso tilt/domain | any positive PRE/POST theta>.2rad stops | remain in small-angle tested domain; no antiparallel handling |
| Segment peak angular speed | every body |omega|≤rmin/(4*Rmax*T) | collider surface arc per observed step≤quarter of smallest feature, prevent poorly sampled reaction; not CCD/safety certification |
| Anchor gap | all14≤.005m | one configured allowed-linear-error length; tighter than old anomaly.08m, local joint fidelity requirement |
| Hinge limit violation | ≤.05rad | retain explicit mechanical contract anomaly boundary; spherical limits N/A |
| COM horizontal drift and each foot COM XZ drift | ≤.0325m from own initial | quarter of narrow sole half-width.13m; floor size is not an acceptance bound |
| Torso yaw drift | ≤asin(.0325/(hypot(.16,.08)+hypot(.13,.10,.22)))rad | worst sole sweep from pivot limited to same drift allowance; no yaw controller |
| fb32 On terminal torso | theta≤.02rad; |wperp|≤.04rad/s | halve .04rad perturbation; permit ≤.02rad further rotation in half-second response window |
| fb32 tilt-pair benefit | RMS(thetaOn)≤.75*RMS(thetaOff) on common recorded prefix≥30steps | remove at least one quarter of initial response, no last-sample-only victory |
| fb32 null/yaw no harm | On first-contact step≥Off or full360; common-prefix RMS≤Off+1e-6rad | no introduced fall/tilt, existing same-host angle comparison resolution, not physical error envelope |
| Actual foot support | after step30, every full60-step block and final residual block: mean total load in [.5Mg,2Mg], each foot mean≥.1Mg | majority of weight supported with bilateral≥10% shares; configured moderate≤2g average-load goal, not impulse-law inference |
| Foot contact loss | from step31, 6 consecutive POSTs without any foot actual contact stops | allow at most.1s unsupported flight in a quiet stance probe; timer for non-foot contact has NO grace |

rmin/Rmax: ball r/r; capsule r/(h+r); cuboid min(half)/norm(half).
Evaluate with actual logged T. Torso guard approximately9.23077rad/s, pelvis
10.34483; upperArm6.42857, foot approximately5.46630rad/s (exact formula rules,
not rounded prose). Record every other segment as well, not only pelvis endpoint.
Use world torso-forward projection for wrapped yaw difference from step0,
well-defined inside the .2 domain; log pelvis yaw too. Foot drift is center
drift, not a contact-point identity match or invented slip measurement.
Mg=88.8786N: total mean[44.4393,177.7572]N, each mean≥8.88786N.
At step0 loads are null/unmeasured, never assumed0; after a step load is actual
contactImpulse/T times upward normal, contactDist≤0 only. Impact peaks/normal
loads are all retained; averaging changes no contact chronology.

Hard sampled state/geometry guards apply to all conditions/variants, except
the ONE declared command fault in negatives; inherited nonfinite/resources/
quaternion/20m/50m/s/200rad/s anomalies remain as an additional outer latch.
free32 has no settled-load or terminal-upright acceptance at one step; report
its response without suggesting6s effectiveness. fb32 On must reach360 without
non-foot contact and meet ALL above eligible metrics in EACH repeat. Off first
non-foot contact is a valid counterfactual terminal, not an invalid fixture or
automatically a global blocker. Both state bounds still apply to Off; no
post-contact continuation. If Off prefix<30steps, improvement is inconclusive
and stops as insufficient_comparison, not rescued by a partial tilted pose.

## Chronology, classifications and decision

At allocation/start: wrong build/config/IDs/setup/initial non-foot contact,
counts, mass/tensor or initial-constraint failure → execution_blocker, save,
free world, **no next world**. Count allocation attempts even if setup fails.
PRE command/readback/cap/force/phase/domain failure or POST sampled safety bound
violation → global blocker immediately, no extra step. Preserve the offending
POST and all simultaneous contacts; if non-foot contact coincides with invalid
state, standing_time=null, observed_time/counter/contact facts still recorded.
Otherwise first non-foot POST stops world once, sorted all IDs, exact nominal
step time; contact wins over horizon360. Do not relabel a positive fall as an
expected negative. On fall/terminal endpoint/support failure in fb32 is a
positive behavioral blocker, stopping before any later planned world. For
paired RMS/no-harm criteria, evaluate immediately once On completes the pair;
for each repeated case compare completed repeats as they arrive. No averaging
away a failed repeat. Matched negative gate rechecked at EVERY complete prefix,
including the prefix where all matching positive first steps become available.

Within successful one-step negative controls, the declared fault is expected
negative evidence, not a global invalid latch. Failure to detect it or any
additional defect is a true global blocker. Incomplete prefix never claims
all cases pass. Reproducibility disagreement also stops before a next world.

Outcome: bounded_fullrig_candidate_supported only if the complete declared
matrix and every pair/repeat/control meet the rules. Otherwise retain exact
first blocked/pending prefix, classification and no_tuning_handoff. No skipped
roll case, condition-specific gains or second attempt. Potential outcomes
include pose-motor masking, roll-constraint limitation or over-strict quiet
stance guards; observations alone do not prove their causal explanation.
**360steps≈6s is not the60s primary criterion or full Standing acceptance**,
and even a later60s timeout alone does not satisfy #30 support/drift/physical/
cost/repeatability/browser criteria. No general controller/production release.

## New config/result/reader contract — specified, not implemented

Use independent research config/result schema version1 and namespace
fullrig-torso-pelvis-ab-v1:SHA256. Do not reuse passive-v1/motor-v2/model-v3
export identity or relax their exact validators. Embed frozen rig reference,
explicit initialization transform, condition/pose targets, law/caps, all numeric
criteria, ordered IDs/budget and phase/encoding versions. Existing baseline
JSON is unchanged. Future adaptation of StandingSimulation must preserve the
historical default/API and regression seams; allow new study-specific Solver32
and initial transform BEFORE initial audit/observation/motor binding, never
post-reset corrective writes. Renderer/UI extension unnecessary.

Raw data: every attempted world and all PRE/POSTs (not sparse checkpoints),
ordinal/UUID/repeat/condition/case, same-time15 body states/mass/principal frame/
inertia/worldCOM, collider/joint taxonomy/anchors/frames/limits/tracking, current
counts/settings/awake state, actual contact arrays/normal impulse/load, floor
and self-contact observations, COM/yaw/drift and angular peaks. Store raw/double/
encoded/readback torque, cap ratio/delta/axial component and per-body sums,
accumulator phases, direct PRE power sum(tau_i dot omega_i), step work estimate
explicitly a quadrature, spin+orbital H and kinetic+gravitational potential
energy about one fixed origin. Gravity, body damping, contacts and native
motors exchange momentum/energy: H/E are descriptive, never conserved-residual
acceptance tests. Native effort/saturation, native work, friction-impulse-derived
power, validated CoP and physical fall cause remain null/N/A with reasons.
Normal foot loads ARE available; do not mark them N/A merely because native
motor effort is unknown. Physics/command/observation CPU samples separately,
descriptive same-host only; no extra timing worlds or production budget pass.

Reader: strict field sets/types/finite/quaternion/domain, all concrete IDs and
prefix order, attempted-world budget, contiguous steps/no trailing POST after
terminal, immutable setup/settings, controller-off only applied difference,
public readbacks and exact vector caps/pairing. Independent matrix/trigonometry/
tensor/COM/contact math recomputes all criteria, every prefix stop/pending
decision and redundancies. Stored-data checker allocates NO worlds. Never
claim source hashes cryptographically attest an arbitrary supplied trace.
Version partial crash/setup records separately, fail closed; preserve originals.

Same-host repeat criteria from contracts.md: identical terminal/status/all
contact IDs and integer steps, nominal time1e-12s, position/normalized q-distance/
linear/angular velocities1e-6 SI, actual contact point1e-6m/load1e-5N;
compare each full shared state sequence, not only checkpoints. Handle q/-q
equivalence. UUID/time/CPU excluded, no cross-host bitwise guarantee. All
repeated trajectories must pass at the earliest decidable prefix; no rerun.

Pure preflight, no worlds: shape inertia/all global transforms/anchor velocity
compatibility/q-sign/positive-negative axes/yaw/null/transverse damping/units/
norm cap/Float32 negative/declared IDs/budget/phase chronology. Stored corruption
regressions: duplicate/missing step/world, swapped On/Off condition/pose targets,
wrong readback/frame/units/cap/reaction, coherent manipulated peak or terminal
pass, contact omitted at true terminal, prefix continuation, fake clean build,
unknown flags/false standing approval. Future regression suite must protect
historical passive70/handL, ForceBased20=3600/timeout and1=187/both hands from
stored baseline comparisons and the project's existing tests; runner authors
must enumerate any test-created worlds separately from the90 study budget.
No new physics preflight worlds or unlisted baselines/pilots are authorized by
this specification; future execution authorization must explicitly decide
whether existing world-creating regression tests are allowed, before running.

Publish clean harness SHA/tree, full source/build-input list, Node24.21.0/OS/
Rapier0.21.0/pinned upstream/actual dt/host and config/protocol/schema/ID hashes
on GitHub BEFORE allocation1. Freeze all parameters. After the single authorized
run preserve full raw including failures, archive byte/part/source hashes,
reader output, review and exact decision. No hidden pilot, tuning, rerun, merge
or deployment. See execution-handoff.md for the separate scope and stop.

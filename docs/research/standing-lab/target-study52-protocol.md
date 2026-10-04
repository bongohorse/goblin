# Spherical target representation / Issue52 preregistration

2026-10-05. Base main9c7ced77f873716e9a1d9a76e9fd971a0db44a84; Rapier0.21.0,
pinned js-v0.21.0/b716d375efc0201003f0cd9ef7168eee0b62c177, Node24.21.0.
Published in Issue52 before the pilot; explicit pilot clarification before final
clean-head evidence. No runtime/UI, rig, gains, solver, dependency or baseline edits.

## Coordinates and physical question

Bind attachment frames F1/F2 are fixed, in each body's local space. Observed
relative attachment orientation Q = inverse(parent.rotation * F1) *
(child.rotation * F2). Given desired relative BODY orientation D, the desired
attachment orientation is T = inverse(F1) * D * F2; conversely D = F1*T*inverse(F2).
The fixtures initialize D=F1*inverse(F2), then target D=F1*T*inverse(F2).
Unit quaternions xyzw, Hamilton product, right-handed. Canonicalize T to w>0.
Native targets a_i=2*asin(T_i), NOT independent Euler rotations. Our API rejects
targets outside a deliberately bounded <=1rad orientation domain. Only neutral,
+/-.3rad along each axis and two small combined targets are physically verified;
the whole <=1rad continuum is not experimentally certified.

Installed dist/dynamics/impulse_joint.d.ts exposes configureMotorPosition(axis,
targetPos,stiffness,damping), model, per-axis max-force and frames. Use only public
methods plus the existing descriptor-checked declared-constructor view. No raw
motor setter, masks, prototypes, body transform corrections or extra DOFs.

Pinned sources:
- bindings/typescript/src.ts/dynamics/impulse_joint.ts: SphericalImpulseJoint.
- src/dynamics/solver/joint_constraint/joint_constraint_helper.rs: construction
  canonicalizes ang_err by sign(dot(frame1,frame2)); motor_angular uses
  2*asin(clamp(ang_err.imag[i])) and wrapped angular difference. This is the
  rigid-body path tested here.
- generic_joint_constraint_builder.rs::motor_angular_generic instead uses
  quaternion component minus sin(targetPos/2) with wrapped sine difference;
  multibody path is not a measured fixture and must not be conflated with it.
- src/dynamics/joint/generic_joint.rs and motor_model.rs: FB/AB coefficients,
  per-axis max_impulse=max_force*dt and angular motor configuration.

For Q=(v,w), components v_i=sin(angle/2)*axis_i are coupled by norm(v)<=1.
The hemisphere recovers w=sqrt(1-sum(v_i^2)); arbitrary triples need not describe
an orientation. At pi, w=0 has sign ambiguity/discontinuity; asin derivatives
also become singular at |v_i|=1. Equivalent 2pi scalar targets are not an API
promise of a globally unique continuous orientation controller. We do not test
global/large-angle control, warm-start impulses or multibody equivalence.

MovingFrame commands F1*T with zero coordinates; fixed-native commands F1 with
a_i. They have the same equilibrium orientation for these targets, but different
error fields, motor axes, velocity projections and world-space per-axis cap boxes
for nonzero T. FB100/12 keeps native Nm/rad and Nm*s/rad gains; caps physical Nm
per native axis, not a vector-norm bound. A_i are solver coordinates, not Euler
joint angles. There is no claim of dynamically equivalent torque feedback or
coordinate derivatives matching angular velocity. Neutral T=identity produces
identical frames/targets; its full-rig comparison is a no-op, not improved stability.

## A/B fixtures (before final measurement)

Two dynamic centred ball colliders radius.4m, masses1/2kg, isotropic inertias
.064/.128kg*m^2; no gravity, damping or contact. dt1/60, Solver32, no sleeping.
Neutral attachment initialization, independently composed with Three.js.
Two frame cases: all identity; world Ry(.7)*Rz(-.4), F1=Rx(.4)*Rz(.2),
F2=Rz(-.5)*Ry(.3). Desired targets: identity, +/-.3rad on x/y/z,
Rx(.3)*Ry(-.25), Rz(-.35)*Ry(.2)*Rx(-.15). q/-q, both representations,
caps20/1, 240 steps: 144 cases. End orientation error<.01rad, relative
angular speed<.01rad/s, independent Three.js rotation-matrix Frobenius error<.01.
q/-q trajectories: angle<1e-5rad and body velocity<1e-4rad/s. Negative off,
wrong-sign, wrong-axis for intended Rx(.3): error>.15rad. Record paired transient
differences rather than assert dynamic equivalence.

Separate cap diagnostic: world Ry(.7), identity bind frames/common initial body
rotation, configured nonzero target to establish the representation, then large
native velocity +/-100rad/s on all axes, same FB100/12; cap .05/1/20. That
velocity command intentionally overrides the position targets: these rows prove
cap/reaction, not orientation tracking. First-step deltaL/dt in pre-step motor
frame; component error<=max(1e-4,cap*1e-5), momentum residual<1e-6kg*m^2/s,
angular-speed ratio2 +/-1e-4. Own 12 rows, every world freed. No full-rig effort inference.

Pilot clarification: with DIFFERENT initial body orientations in the second
tracking frame case, fixed-native cap20/+ produced residual1.0696400757e-6,
just outside the strict bound. All torque components were within bounds. No
tolerance loosened. Dedicated cap rows use common body frames as the historical
effort oracle; all tracking cases still exercise different F1/F2. Preserve the
original rotated-body probe separately in final raw evidence, including false
strict status. This limits any all-frame momentum-precision claim. A float32
resolution explanation is plausible, not a proven upstream defect diagnosis.

## Full rig, CPU and regressions

Proceed only after bounded nonzero mapping succeeds. Neutral full rig only,
frozen baseline rig/start/dt1/60/materials/limits/masses/contact rules, FB100/12,
Solver32, caps20/1. 5 fresh NORMAL worlds each representation/cap, <=3600 steps,
unchanged first nonfoot contact, invalid latch, timeout. Record terminal,
body checkpoints, peaks/end drift, foot loads/both-loaded fraction, pelvis/torso
orientations, tracking/relative velocity/joint errors/contact chronology and
physical state-sequence SHA. Exact repeated sequences and neutral paired
measurements/checkpoints required. No post-contact continuation or full standing
certification. Actual full-rig motor effort/saturation null with reason.

Research-only target-study config/result schema1 and namespace
spherical-target-study-v1:<SHA256>, distinct per representation/cap, embed frozen
reference settings. No old export is changed or mislabeled as the candidate.
Reader locally projects the neutral measurements into existing type/oracle
validators; that ephemeral projection is not an exported legacy-v2 result.

CPU: same first60Steps, cap20/1, each representation3 warmup +5 measured fresh
worlds, alternated order each round; commands/physics/observation separately,
raw samples, median/P95/max, host/Node/observed timer. No startup/reset in step
timings, different terminal horizons never compared. No significance, GPU,
weak-device or production budget claim.

Regress passive-v1 and both force-v2 caps against historical39/46; all6 model-v3
normal cases against Review50 (checkpoint comparison, complete end/metrics/
contact/sequence equality). No remeasurement of out-of-scope post-contact
diagnostics. npm test/build and code-review against fixed9c7ced77; final PR CI.
No runtime/UI extension, so no new candidate browser route or browser claim;
existing Pages/browser51 acceptance remains historical baseline evidence.

## Decision rule

Retain MovingFrame reference unless a supported candidate delivers an evidenced
scoped benefit. Bounded successful target tracking may establish a candidate for
future work, not a global drop-in replacement. A neutral no-op supplies no
stability advantage. Distinguish maintenance/command cost from physical
equivalence. Publish limitations, raw evidence/hashes and Draft PR, then STOP.
No merge/deployment/default switch/balancecontroller.

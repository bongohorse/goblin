# Motor-rig cause report / Issue #42 (2026-10-04)

Diagnostic scope only. Base evidence 9263a0d, Rapier JS0.21.0, read-only pinned
js-v0.21.0/b716d375, Node24.21.0, Windows10.0.26300. No standing acceptance, actual
motor-torque inference, model comparison, gain tuning or passive modification.
Code/evidence provenance and full matrix live in motor-cause-42.json and Issue #42.
Final reviewed code/test head: cfb3487ea2f06b23a464d6c70bda66e1f3bec447.
Clean harness heads: initial c280dcdaf4f5c091f3efc37be1df3c174a32e15e;
chains dd076d12c078c1883a9174de1d05cbea97fcb11b;
controls feb7e279f4ea6276220d2c26c2b59b451902b649.
Final code adds only regression tests to the controls head; all executable harness
changes and which stage used them are in those commits. The later evidence commit
changes research Markdown/JSON only; its SHA is reported on GitHub (no self-hash).
The compact evidence retains summaries of all32 cases; raw windows retain the
affected ankleL/kneeL/kneeR/elbowL/elbowR and proximal hipL/shoulderR joints for
full-rig cases, all joints for minimized cases, and every contact in those windows.
Successful controls retain their final raw step; breaches retain all four preceding/
terminal steps plus the first small-limit crossing. The harness output includes
every joint at every stored window; evidence selection is explicit, not a new run.

## Trigger and bounded conclusion

Neutral ForceBased100/12/20 on the complete dynamic rig with floor loads exceeds
the existing .05 rad hinge-limit tolerance: ankleL step110, angle-.450850274 at
lower limit-.4. The1 Nm reference ends elbowR step140, angle.122396600 at upper
limit.05. Both remain invalid, standing_time=null.

The20 Nm problem minimizes to FIVE bodies (pelvis, torso, upperLegL, lowerLegL,
footL), four original joints (spine, hipL, kneeL, ankleL), gravity and floor, same
shapes/masses/inertias/anchors/damping/friction/limits/dt and solver8. It exceeds
the tolerance at kneeL step70, angle-.104513858 vs lower limit-.05. First small
limit breach (>1e-5) at step51. This minimizes the failure CLASS; it does not claim
the original ankleL trajectory or the1 Nm arm impact is identically reproduced.

**Isolated causal interaction:** floor loading plus proximal spherical pose actuation
and torso-linked dynamic chain at the existing solver budget. Remove floor, remove
spherical motors, remove all motors, or increase only solver budget to32: the
five-body tolerance breach disappears within the same180-step diagnostic horizon.
Remove self-contact: identical step70/angle/contacts. Remove torso/spine: four-body
case has zero limit violation over180 steps. Independent angle and frame oracles
rule out a measurement/sign/wrap explanation of these failures. These positive
and negative counterprobes support a loaded coupled-constraint convergence/compliance
problem, not a demonstrated local JS command bug or self-contact conflict.

The exact solver-row residual/softness contribution is NOT exposed by the supported
JS getters; no unique engine-level defect or mathematical proof of convergence is
claimed. Solver32 alone would not establish cause; the load-path minimization and
orthogonal controls above provide the additional evidence. No tested alternative
is a60-second or full five-run motor acceptance.

## Independent measurement and raw state

scripts/motor-rig-oracle.js uses Three.js Quaternion/Vector3, independent of the
existing math helper. Joint-frame relative matrix tangent angle is atan2(Y.z-Z.y,
Y.y+Z.z); invariant under q/-q, tested signed twists, rotated world/bind frames,
near +/-pi and forbidden swing. Existing swing-twist agrees to <9e-16 rad in the
matrix. Pinned RevoluteJoint::angle instead uses signed2asin(relative.x), and its
largest difference in original20/1 runs is <1.1e-6 rad. The pinned LIMIT row uses
wrapped atan2 after recentering on limit midpoint, matching the twist definition.
Motor rows use signed2asin(component). Their tiny differences here cannot explain
the .05-.072 rad breaches. Frame1/2 and bind frames stay identity for neutral targets.

At minimal step70 kneeL: anchor error .000946973 m, axis error .006292109;
parent omega (.232436,.050831,1.172512), child(-.243402,-.225904,1.094109) rad/s;
oracle angle-.104513858, pinned asin angle-.104513340. Foot-floor normals(0,1,0),
normal impulses .579744101/.008046060 N s, step-averaged normal loads
34.784644/.482764 N (actual float32 world.timestep). No self-contact manifold.
Full20 failure has only foot-floor contacts; full1 failure includes hand-floor
impact, particularly handR181.2258 N. The latter coupled impact is not fully minimized:
arm3/arm4 do not breach over180, so its exact mechanism remains a separate limitation.

Rohzustand traces store rotations, translations, angular velocities, local anchors,
joint frames, target/cap/limits, independent relative quaternion, existing and
oracle measurements, contact partners, manifold normals/flipped flag, collider-local
contact points, distances and normal impulses. Normals are manifold-order normals;
normal_load_N is impulse/dt magnitude, not signed vertical force or motor torque.
First limit-crossing and last four steps include contacts even when normal Lab
telemetry is invalidated at the terminal step. Actual motor effort remains null.

No-floor full rig step138 is NOT a numerical explosion: footL y=-20.105127 m crosses
the existing |position|20 safety bound, with near-zero joint angles/axis error.
Report the original exploding_state label honestly, but interpret it as out-of-arena
free fall. No-floor diagnosis cannot count as a standing success.

## Native API and source cross-check

Factory spherical misclassification is a real binding issue, already bounded by
the declared public same-handle SphericalImpulseJoint constructor and #41 fixtures.
Pinned JointAxesMask conversion in bindings/typescript/src/dynamics/joint.rs uses
ANG_X|Y|Z for spherical classification, while SphericalJoint::new locks translations.
Constructor view changes neither mask, physical joint count nor raw state.
Public configureMotor(axis,0,0,100,12) forwards the correct native axis/model; cap
forwards to set_motor_max_force. No per-step cumulative frame offset: stored bind
frame times identity target every step. Installed fixture evidence remains authoritative.

Pinned sources (all at b716d375): src/dynamics/joint/revolute_joint.rs angle;
src/dynamics/solver/joint_constraint/joint_constraint_helper.rs recentered_angle,
limit_angular, motor_angular (finite ERP/CFM and bias-limited correction);
bindings/typescript/src.ts/dynamics/impulse_joint.ts public wrappers;
bindings/typescript/src/dynamics/impulse_joint.rs forwarding;
src/dynamics/solver/staged_island_solver/mod.rs solver substep groups. Higher
numSolverIterations changes the internal solve/substep budget, not the outer1/60
fixed dt; therefore it is a numerical experiment change, not a free accuracy toggle.

## Concrete decision proposal (no implementation authorization implied)

Recommended next decision: authorize a separately versioned MOTOR experiment with
numSolverIterations32 while keeping passive config/schema-v1/solver8 untouched.
Reason: both full-rig20 and minimized five-body diagnostics have zero limit violation
through180 with32, whereas8 fails with genuine measured error and identical self-contact-off
fixture. No gain/model/target changes needed for this specific bounded counterprobe.

Before accepting that experiment: explicitly record numerical config/identity,
check CPU cost and native joint/anchor limits under the original20 AND1 Nm cases
and representative contact impacts, then complete the independently authorized
#41 five-run/lifecycle/export/browser/CI gates. This report does not authorize their
execution.32 is a candidate, not proof of robustness, torque saturation or balance.
Alternative decision: retain8 and leave #41 blocked pending deeper engine-row diagnostic
or an explicitly scoped rig/controller change. Do not weaken tolerances or redefine
invalid runs as accepted times. Do not replace baseline solver or rig silently.

No clear local implementation/measurement error was proven, so no fabricated fix
is applied. Tests lock down the minimized failing interaction and its counterprobes.

## Verification and review

46/46 Node tests pass (four new Issue42 tests), npm run build passes with the existing
Rapier chunk-size warning, git diff --check passes. These are numerical/production
regression checks, not GPU/browser evidence.

Run Node24.21.0, npm ci, npm test, npm run build. For bounded numerical evidence:
node scripts/motor-rig-cause.js (initial matrix); --chains (proximal minimization);
--controls (last orthogonal controls). GOBLIN_CAUSE_OUTPUT selects report path.
Every case uses a fresh freed World; complete-rig cases use the existing simulation
step; minimized fixtures use a diagnostic-only step and no passive export. They
continue after nonfoot contact up to180 or constraint breach to study loaded dynamics,
and deliberately do not evaluate the Lab standing termination criterion.

Passive checkpoint regression compares original review-39/baseline/run-1.json;
pass:true and all six max deviations0 in every stage. Simulation/config/readers,
baseline JSON/schemas, production, package/lock, vendor and user config unchanged.
Numerical-only changes require no new browser/arena acceptance; none claimed.

## Spec

Diagnosis scope fulfilled through precise bounded conclusion and concrete decision
proposal, not a claimed motor fix. #41 remains blocked/open. Original1 impact exact
cause and engine-row convergence/softness split remain explicit limitations.

## Engineering

No production import or alternate production loop. Public APIs only, no direct raw
motor calls, world forces, transform corrections or vendor mutation. Fresh/freed
worlds and independent oracle regression checks. Evidence records clean source heads
and subsequent evidence-only head separately. No merge recommendation for #41.

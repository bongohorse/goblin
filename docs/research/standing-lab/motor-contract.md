# Native motor baseline / Issue #41

Base main: 06b520628502593d034485ee21fb8428daa6781b. Node24.21.0, installed
Rapier0.21.0, matching read-only js-v0.21.0 source b716d375, Three0.186.1.
Passive rig/startpose/materials/masses/inertia/dt/solver/limits/contact rules/config-v1
and comparison tolerances remain unchanged. No controller-model or target-representation
A/B, balance feedback, recovery import or standing optimisation.

## Actuation contract / Gate A

Exactly ForceBased. Stiffness100 Nm/rad, damping12 Nm/(rad/s), per-angular-axis cap20 Nm,
target velocity0 rad/s. These bounded reference values match the documented native pose
reference in PR29; they are not a tuning result. Full neutral pose: every hinge target0
(within existing asymmetric limits), every spherical relative quaternion identity. No
world anchor, manual body transform correction, free world torque or support controller.

Hinges use configureMotorModel(ForceBased), setMotorMaxForce(cap), configureMotor(angle,
0,stiffness,damping). Spherical commands retain the existing moving-frame representation:
frameX1 = bindFrameX1 * desired relative quaternion, frameX2 remains bindFrameX2; all
AngX/AngY/AngZ native coordinate targets are0. World target attachment = parent.rotation
* bindFrameX1 * target; child attachment = child.rotation * bindFrameX2. Quaternion xyzw,
Hamilton product, right-handed rotations. Constant neutral targets need no interpolation.
Commands execute before world.step, on the same fixed-step path as passive mode.

## Installed factory defect and declared constructor adapter

PROJECT EVIDENCE: World.createImpulseJoint(JointData.spherical(...)) and
impulseJoints.get return GenericImpulseJoint, type6, lacking the motor/cap methods.
SphericalImpulseJoint prototype exposes them and its constructor is publicly declared
in the installed impulse_joint.d.ts; ImpulseJointSet.raw is publicly declared too.
The pinned Rust bindings/dynamics/joint.rs classify spherical using ANG_X|ANG_Y|ANG_Z,
whereas SphericalJointBuilder locks LIN_X|LIN_Y|LIN_Z. This explains the factory mismatch.
The installed source map confirms GenericImpulseJoint has no motor wrappers.

The motor-only adapter, for a handle explicitly created from a spherical descriptor,
uses the declared public SphericalImpulseJoint(world.impulseJoints.raw, world.bodies,
handle) constructor, just as the documented PR29 reference does. This is explicitly a
typed view over the existing handle: no replacement joint, mask mutation, prototype
patch, direct raw-WASM motor setter, vendored edit or dependency change. The generic
classification remains visible. Passive code keeps the original factory object.
Tracking/three-axis freedom/translation-lock and count/handle tests validate the view;
other descriptor kinds are rejected. This adapter is version-specific and must be
reviewed on any dependency upgrade; do not infer general arbitrary Generic motor support.

## Diagnostic evidence / Gate B

Zero gravity, no floor, centred isotropic radius .4 m sphere colliders, masses1 and2 kg,
no damping, both partners dynamic, contact disabled only between these fixture partners.
Initial centres/anchors coincide: no lever arm, contact, gravity or translational impulse
can contaminate angular momentum. All fixture worlds freed. Not Standing evidence.

Tracking: both hinge signs, asymmetric stops[-.35,.7], all spherical axes and signs,
combined quaternion, nontrivial common world rotations. Relative orientation uses
inverse(parent.rotation)*child.rotation independently of the command-frame setters.
240 fixed steps; error<.01 rad, relative angular speed<.01 rad/s. Motor-off, wrong-sign
and wrong-axis controls remain >.15/.2 rad away from the intended target.

Effort: first-step angular impulse deltaL = I*deltaOmega in WORLD coordinates for the
isotropic centred balls (I=.064/.128 kg m2). No nonmotor angular effort on that first
step. Divide by actual Rapier world.timestep (float32 dt) for step-average Nm and rotate
into pre-step parent motor-frame axes. This is validated indirect momentum measurement,
not a public motor-impulse getter or instantaneous torque measurement. Tiny diagnostic
cap .05 Nm plus large error deliberately saturates; bound1e-5 Nm single axis,1e-4 combined;
reaction momentum residual<1e-7 kg m2/s. Unequal inertia requires angular-speed ratio2,
not equal speeds. Measured single-axis torque approximately +/- .049999993 Nm;
combined components approximately .050000002/.050000000/.050000000 Nm, magnitude
.086602541 Nm = sqrt(3)*axis cap. Removing the cap exceeds the intended bound.

Full-rig actual effort/saturation is unavailable from supported joint getters. Contacts,
limits and coupled-body motion prevent treating deltaOmega as motor-only torque there.
Full results must report null/N/A with that reason, never infer actual torque from
requested cap or zero tracking error. Diagnostic measurements do not certify every
full-rig torque; the engine's per-axis cap is a configuration and fixture-validated bound.

## Current continuation (#44)

The previously planned v2 contract is now implemented with experiment identity
`native-force-solver32-v2:<hash>`, solely for the explicitly authorized motor-only
Solver32 Lab continuation. Passive v1/Solver8 is unchanged. See
[integration and acceptance report](motor-integration-44.md). The Solver8 failures
below remain historical negative evidence; they are not corrected or reclassified.

## Versioning and gates (historical #41 plan)

Passive config/result schema-v1 is preserved. The planned motor experiment/result schema-v2 embeds
rig-v1 plus explicitly versioned actuation config, controller_id native-pose-hold-force-v1,
different config SHA and native-force-v2 experiment identity. A compatible reader accepts
both versions; motor tracking/effort semantics never masquerade as passive N/A fields.
Reset uses a fresh World/EventQueue and rebinds motor views/targets; no old handle survives.

Gate C must run the full neutral pose hold, five fresh motor runs and passive regression,
then clean built browser checks in both modes. Early falls are valid measurements; one
60-s timeout is not complete standing acceptance. No change to passive numerical bounds
or predeclared repeatability tolerances to force a pass. Final evidence records clean
code head separately from a later documentation/results-only head and current PR CI.

## Gate C blocked - do not integrate

The neutral full-rig hold with the reference100/12/20 configuration violates the
unchanged .05 rad limit-error bound at step110 (ankleL). One predeclared corrective
check reduced only the cap20 to1 Nm, reducing allowed step impulse95%, to test whether
lower actuation load avoids this invalid state. No standing-time optimisation/sweep.
That also fails at step140 (elbowR violation .072396600 rad). Both runs terminate
invalid_simulation with standing_time=null, not first-contact baseline measurements.
The source of loaded-chain error needs a bounded diagnostic before integration; the
isolated tracking/cap positives do not establish valid full-chain actuation under load.
No change to rig/pose/gains/dt/solver/materials/limits or passive safety tolerance.

scripts/standing-motor-diagnostic.js reproduces these exact two diagnostic cases using
the existing simulation step, then verifies passive checkpoints against the original
review baseline. It deliberately exits2 on this blocker. Do not export these motor
diagnostics as passive-v1 runs or count five identical invalid runs as an accepted motor
baseline. No motor UI or accepted v2 result path has been integrated. Planned v2,
full-rig lifecycle/browser proof and five valid motor runs remain incomplete. Stop
here rather than add controller/model/solver/target or further parameter experiments.

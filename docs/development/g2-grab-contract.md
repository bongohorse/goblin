# G2 contact grab and throw contract

G2 uses the G1 body IDs, Three 0.186.1 and Rapier 0.21.0. The Hand selects a physical part/prop and pulls its chosen point with a bounded connection. The ragdoll remains passive; standing/recovery belongs to G3.

## Selection and depth

- Query the closest selectable dynamic Rapier collider using the G1 body-handle map. Cosmetic ears/eyes/belt have no independent physical contact. Propagated reset poses are queryable before another broad-phase step.
- Store the hit relative to Rapier's position, rotated by its inverse quaternion. Reconstruct the same local point every step. Meshes mirror Rapier.
- Mouse/touch share Pointer Events, one primary pointer owner and capture. The fixed plane passes through the initial hit and faces the selected camera. Camera position/direction freeze during a grip; camera/viewport changes cancel it. Target displacement is limited to 3 m.
- Only primary button-zero canvas input begins an action. Additional pointers cannot replace, move or release it. UI input does not raycast; release over controls/panel backgrounds cancels. Trailing events cannot restart a cancelled action.

## Physical connection

One grip owns one collider-free kinematic anchor and one zero-rest-length Rapier spring joint attached at the stored body-local point. Rapier solves it with normal contacts and the articulated joints, including lever-arm rotation. All rotations remain free at the grip; G1 hinge constraints remain authoritative.

Stiffness = load mass * 360 N/m; damping = load mass * 36 N s/m. For the connected rig, load mass is the sum of its 15 body masses (9.06 kg); an independent prop uses its own mass. Force bound = min(120 N, load mass * 80 m/s^2). The absolute 120 N ceiling did not increase. This avoids a hand being limited to 14.4 N while supporting the rig.

Rapier 0.21.0 exposes spring force limiting through public `ImpulseJointSet.raw.jointSetMotorMaxForce`. Its coupled linear motor uses `JointAxis.LinX`; the JS SpringImpulseJoint wrapper lacks the setter. This compatibility detail is isolated in begin and tested through actual mass * velocity-change / timestep, including diagonal targets. It is a resultant bound, not three independent 120 N components. The [official motor guide](https://rapier.rs/docs/user_guides/javascript/joints/) explains force-limited motors; installed declarations and engine tests decide compatibility.

The connected rig receives four extra solver iterations only while held, resolving remaining light-extremity constraint error after correcting the connection model. The previous setting restores on every detach. Unheld contacts and independent props retain their settings. No global solver, engine, dependency or CCD change.

The anchor advances at fixed 1/60 s, capped at min(10, 8 / sqrt(max(1, selected body mass))) m/s. Samples cap at 10 m/s. Bodies are never clipped before/after the contact solver: legitimate collisions can exceed input limits or 18 rad/s. Overwriting one body would destroy momentum/joint consistency. Representative grab trajectories are tested for stable actual speeds; these limits do not globally cap collision-generated motion.

The force-limited connection can stretch transiently or against obstructed/unreachable targets. Acceptance measures settled target error below 0.12 m after a controlled four-second hold for head, hand/arm, torso, leg/foot and prop. Verified browser errors are approximately 0.013-0.062 m, visibly retaining the chosen point. This is not an exact positional pin or anatomical-pose guarantee.

## Release and cancellation

Target velocity uses PointerEvent timestamps in seconds and 35 ms exponential smoothing, consuming coalesced samples in order. A normal 30 Hz interval gets 33 ms ageing grace; 100 ms without motion disables throwing. Genuine stationary movement samples damp velocity. Only an identical final pointerup coordinate is ignored.

A recent speed >= 1 m/s requests a throw. Its requested COM component along the gesture caps at 8 / sqrt(max(1, selected body mass)) m/s. Release fills only a missing component in that direction, preserving transverse gravity/contact motion and spin. It neither boosts an already faster component nor brakes it to the requested value. The correction is reduced to keep its resulting speed <= 10 m/s; existing faster contact motion receives no extra impulse. lastRelease.threw records recent intent; an already fast enough body may need no additional impulse.

Detach before release so the next step adds no final spring boost. Slow/stale release adds no impulse. Pointercancel, lost capture, focus/pause, reset, tool/camera change, resize, UI release and removal detach without throwing. Detach restores iteration settings and removes joint/anchor even if Rapier already removed the selected body/joint. No persistent grip user force/torque exists. Fan/magnet retain their separate clearing path.

## Verification and limits

npm test covers rotated anchors, off-centre torque/settling, actual resultant force, high-speed contact momentum, preserved release motion, 30/60/144/240 Hz, stationary/stale release, removal and 20 articulated cycles. Build/browser tests add G0/G1 regressions, native Edge mouse, camera-plane invariance, explicitly synthetic secondary-pointer/coalesced handler checks, cancellation/reset and labelled touch emulation. See [g2-review.md](g2-review.md).

Production is served at /goblin/; this review includes no deployment. Free shoulder/hip joints remain. Real Android/iOS, native OS visibility transitions, weak-device acceptance, GPU timers, finished GLB and arbitrary thin-target CCD are not claimed. Established boundaries create no additional G2 obligations.

# G2 contact grab and throw contract

G2 is implemented on the G1 body IDs and Rapier 0.21.0. The player selects a physical part or existing prop with the Hand tool, pulls the selected point with a bounded spring, and can release slowly or throw through a recent fast gesture. The existing score confirms selection. The ragdoll remains passive; standing/recovery belongs to G3.

## Selection and depth

- Raycast selectable dynamic Rapier colliders directly, using the existing body-handle map and G1 semantic part IDs. Choose the closest collider surface. Cosmetic eyes/ears/belt do not introduce separate physical contact points. Direct per-collider queries see propagated reset poses without depending on the previous broad-phase step.
- Store the hit in body-local coordinates using the authoritative Rapier position/quaternion; reconstruct that same point every physics step.
- Mouse and touch use Pointer Events and pointer capture. The plane passes through the initial hit, parallel to the camera image. Camera position and look direction stay fixed while grabbing; camera changes and resize cancel the grip. There is no depth wheel or second touch gesture. Targets are limited to a 3 m displacement from the original hit.
- Only a primary button-zero pointer starting on the canvas can begin an action. UI-started input does not raycast; release over controls cancels rather than throwing. A second pointer cannot take over an active grip.

## Physical connection

One ContactGrab owns a soft point connection. No temporary Rapier body/joint or Three object is created. Every 1/60 s step solves a damped spring implicitly with the point's full inverse-mass/rotational-inertia response, then applies the bounded impulse at the reconstructed contact point. Rapier integrates translation and rotation; meshes only mirror the result. Angular motion comes from the lever arm, not an authored rotation.

Spring stiffness = mass * 360 N/m; damping = mass * 36 N s/m. The equivalent spring force is bounded by min(120 N, mass * 80 m/s²). Selected-body translation and angular speeds are capped at 10 m/s and 18 rad/s before and after the solver. These are grab controls, not global velocity caps on every body. A limited soft connection can stretch under gravity, friction, collision or linked-body load; it cannot force an anatomical pose or guarantee zero anchor error.

The connection uses per-step impulses, so it never leaves persistent user forces or torques. Fan/magnet retain their existing separately cleared force path. No new CCD, solver settings or dependency versions are introduced.

## Release and cancellation

World-plane target velocity uses seconds from PointerEvent.timeStamp and exponential smoothing with 35 ms time constant, including coalesced movement samples. Samples are capped at 10 m/s. A 33 ms normal sample interval is allowed before ageing the velocity; after 100 ms without motion a gesture cannot throw. A repeated pointerup coordinate does not insert a misleading zero-velocity sample.

A recent speed >= 1 m/s requests a throw. Desired centre-of-mass velocity is capped at 8 / sqrt(max(1, mass)) m/s. The release impulse is mass * (desired - current), so it corrects existing translation rather than adding another speed boost. It preserves existing bounded spin and adds no release torque. Slow/stale release applies no extra impulse; existing physical motion continues naturally. This is an explicit game-control rule, not a physically powered additional boost or mass-independent teleport.

Pointercancel, lost capture, focus/pause, reset, tool/camera change, resize, release over UI and object removal cancel without a throw. The pointer/capture and connection state clear together. Body removal is checked before reading its transforms. Existing reset restores all forces, velocities, poses and score; paused reset propagates collider poses before the next physics step.

## Verification

`npm test` runs the real-Rapier local-point, torque/hold, event-rate, release/mass, extreme-target, cancellation/removal and 20 articulated-cycle checks alongside G0/G1 tests. `npm run build` then `npm run test:browser` runs the existing G0/G1 production smoke plus `tests/g2-browser.cjs` for native mouse selection/drag/release/cancellation and labelled Edge touch emulation. The latter is also run through Windows Edge MCP in separate stages.

The official TypeScript changelog for 0.21.0 (24 September 2026, `bindings/typescript/CHANGELOG.md`) was read; no newer APIs or version changes were adopted. API compatibility was checked against the installed 0.21.0 declarations: `effectiveWorldInvInertia`, `worldCom`, `velocityAtPoint`, `applyImpulseAtPoint`, `applyImpulse`, `isValid` and `Collider.castRayAndGetNormal`. The [official force/impulse documentation](https://rapier.rs/docs/user_guides/javascript/rigid_body_forces_and_impulses/) establishes persistent-force ownership and the force/impulse distinction; installed declarations and real engine tests decide availability here.

G1's unrestricted shoulder/hip joints remain unchanged. Genuine Android, native OS visibility transitions, GPU timer profiling and arbitrary thin-target CCD remain outside the established evidence. Touch emulation is not real-device acceptance.

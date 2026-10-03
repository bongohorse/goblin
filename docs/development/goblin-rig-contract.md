# Goblin rig / asset contract v1 (G1)

Source of truth: `src/goblin-rig.js` (`RIG_VERSION = 1`, `RIG_PARTS`, `RIG_JOINTS`). This gate supplies a procedural test figure and an integration contract, not a finished GLB or an active standing controller.

## Coordinates and bind pose

One world unit is one metre. Right-handed coordinates: +Y up, +Z character-forward, **+X character-left**. L/R always refer to the character, not the viewer. The old test figure had inconsistent side/hinge conventions; v1 makes these explicit. Import transforms must be baked; no nonuniform scaling above the skeleton. `goblinRoot` is the identity asset/scene root, not an extra physics body. `pelvis` is the root bone. Floor Y=0; soles start at Y=.02.

Bind pose: symmetric A-pose, arms splayed .55 radians (31.5 degrees) from downward vertical, legs straight, feet forward. Body rotations are identity except arms/hands: L rotation around +Z by +.55, R by -.55. Target height 2.78 m, head diameter .96 m (35% of total height); head sphere excludes cosmetic ears, eyes and nose. The shape dimensions in the table also drive the production procedural mesh, so there is one geometry specification.

## Parts, mass and skeleton

Every row has exactly one body, one nonsensor collider, one pickable visual root and one future bone with **the same ID**. Hands and feet are independent bodies/bones with wrist/ankle joints, not decorations or aliases of forearms/shins. Decorations inherit their physical part's visual root and map to that part when picked.

| ID / bone | Parent bone | Body centre (X,Y,Z), metres | Collider | Mass kg |
|---|---|---|---|---|
| pelvis | goblinRoot | 0,1.14,0 | capsule half=.09 r=.20 | 1.60 |
| torso | pelvis | 0,1.49,0 | capsule half=.15 r=.24 | 2.00 |
| head | torso | 0,2.30,0 | ball r=.48 | 1.40 |
| upperArmL / R | torso | ±.404,1.487,0 | capsule half=.12 r=.09 | .35 each |
| lowerArmL / R | upperArmL / R | ±.582,1.197,0 | capsule half=.10 r=.085 | .25 each |
| handL / R | lowerArmL / R | ±.723,.967,0 | ball r=.115 | .18 each |
| upperLegL / R | pelvis | ±.16,.84,0 | capsule half=.12 r=.12 | .55 each |
| lowerLegL / R | upperLegL / R | ±.16,.44,0 | capsule half=.12 r=.105 | .40 each |
| footL / R | lowerLegL / R | ±.16,.12,.08 | cuboid half=.13,.10,.22 | .30 each |

Capsule `half` is half the centre-line segment, excluding the hemispheres. Total mass 9.06 kg. Mass is set explicitly on each collider; Rapier derives shape inertia and local COM at its centre. Symmetric bind COM is approximately (0,1.254,.0053), not shifted with a hidden corrective force. Torso/pelvis carry 40% of total mass, head 15%; largest adjacent mass ratio is 5.71 (torso/upper arm). Linear damping .35 s⁻¹, angular damping 1.3 s⁻¹. Friction .7, feet 1.0, arena .9; restitution .03 on all body parts. No motor or artificial balance torque.

Maps are `byId`, `byBody`, `byCollider`; each entry lists incident joint IDs. Rapier handles are opaque ephemeral numbers and must never be serialized as durable asset IDs. Ordinary reset restores persistent bodies; full rig disposal removes bodies/joints/colliders and clears maps.

## Joints / bone pivots

Positions below are world positions in the bind pose. Both body-local anchors are computed from these positions with inverse bind rotation; they coincide before the first physics step. A future bone pivot is the incoming joint position (pelvis uses its body centre). Store each constant body-to-bone offset from this bind pose rather than assuming body COM equals bone pivot.

| Joint | Parent → child | Bind position | Type / limits radians |
|---|---|---|---|
| spine | pelvis → torso | 0,1.34,0 | hinge X [-.30,.30] |
| neck | torso → head | 0,1.83,0 | hinge X [-.45,.45] |
| shoulderL/R | torso → upperArmL/R | ±.31,1.64,0 | spherical, free swing |
| elbowL/R | upperArm → lowerArm | ±.498,1.333,0 | hinge local X [-2.35,.05] |
| wristL/R | lowerArm → hand | ±.665,1.060,0 | hinge local X [-.35,.35] |
| hipL/R | pelvis → upperLeg | ±.16,1.04,0 | spherical, free swing |
| kneeL/R | upperLeg → lowerLeg | ±.16,.64,0 | hinge X [-.05,2.30] |
| ankleL/R | lowerLeg → foot | ±.16,.24,0 | hinge X [-.40,.40] |

X hinge axes are body-local; paired arm bodies share the bind rotation, so their world hinge axes coincide. Elbow negative rotation flexes forward; knee positive rotation flexes the lower leg backward. Neck/spine/wrist/ankle use deliberately simple hinge approximations in this gate. Shoulders/hips intentionally allow all three rotational DOFs: nonadjacent self contacts can obstruct some poses but do not guarantee anatomical swing or twist limits, especially for axisymmetric capsules. No cone/twist limit is implemented. If art requires other DOFs or anatomical shoulder/hip bounds, revise this versioned contract with physical tests.

Direct joint partners have contacts disabled to avoid overlapping capsule ends fighting constraints. Every other self pair remains eligible; no global ragdoll collision exclusion. Fixed step 1/60 s, maximum 3 catch-up steps; default solver settings unchanged. A repeatable small-sphere floor test at 10/35/60 m/s, from Y=1.5 over 20 steps, passes with and without CCD in installed Rapier 0.21. No evidence currently justifies enabling CCD. This does not prove arbitrary thin moving targets or all speeds safe; rerun the regression when collider thickness, forces or projectile speed changes.

## Transform and animation ownership

Rapier owns body position/rotation. Three.js visual roots copy these values once per render. Cosmetic children use only local offsets. The future adapter computes `boneWorld = bodyWorld * bodyToBoneBind`, then `boneLocal = inverse(parentBoneWorld) * boneWorld`; update parent-first. Skin bind matrices must match this A-pose and unit scale. An AnimationMixer must never simultaneously write these physical bone transforms. Any future kinematic/animated transition requires explicit ownership handoff outside G1.

Face mesh attaches to head. Reserve normalized morph inputs `blinkL`, `blinkR`, `jawOpen`, `browAngry`, `smile` in [0,1], neutral default 0; optional gaze is head-local radians with bounded yaw/pitch. The asset adapter reports supported channels and ignores unsupported ones without modifying physics. G1 does not implement expressions. Future clips use names `idle`, `hit`, `stunned`, `recover`; do not assume these assets already exist. Root motion is disabled for physical gameplay; facial/cosmetic animation is separate from physical bones. Standing/recovery is G3.

## Debug and verification

Open `?debug`; the Rig v1 panel independently toggles cyan Rapier debug lines, yellow anchor connectors/crosses and orange world-space solver contact points. Contact display includes pairs involving a goblin part, deduplicated and capped at 256 points. Collider lines are capped at 32768 vertices. Buffers are reused while enabled and disposed when disabled; debug is off by default and does not change physics. `goblinDiagnostics()` reports IDs/maps, body pose/velocity/mass, mesh-position error and enabled debug resource counts. No gameplay-driving debug API.

Tests cover bind-anchor coincidence, unique mappings, 12 reset/drop/impulse cycles × 900 fixed steps, bounded anchor separation, settling, nonadjacent contacts, fast floor contact and full teardown. Browser checks must additionally cover every part picking, visual rotation alignment, touch emulation, repeated resets/debug toggles and camera views. Falling naturally from the bind pose is expected; actively holding it upright is outside this gate.

Budget: **15 ragdoll bodies / 14 joints**, versus G0 11/10. Exactly +4/+4 buys independent hands and feet. Arena adds 7 props + 4 fixed bodies, so baseline 26 and projectile cap 24 gives maximum 50 bodies (G0 22/46). Rendering retains the WebGL path, shadow map 1024² and existing DPR caps. Compare foreground 1280×720/DPR1, reset+2.2s settle, 30 head-targeted Ball clicks, debug overlays off, 1800 rAF intervals; median sorted index floor(n/2), P95 floor(.95n). The G0 hardware Edge/RTX3070Ti baseline was median 6.1ms/P95 6.2ms, max physics .4ms. Actual measurements and limitations belong in Issue #13/PR, including any browser/environment drift.

API references: installed `@dimforge/rapier3d-compat@0.21.0/dist/**/*.d.ts` was checked for setMass, joint anchors/limits, world.debugRender, contactPair/contactPairsWith and solverContactPoint. [Official Rapier contact geometry](https://www.rapier.rs/docs/user_guides/javascript/advanced_collision_detection_js/) defines solver contacts in world space. [Official CCD guidance](https://rapier.rs/docs/user_guides/javascript/rigid_body_ccd/) motivates enabling CCD only after a reproducible tunneling problem.

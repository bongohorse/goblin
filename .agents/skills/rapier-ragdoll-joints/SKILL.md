---
name: rapier-ragdoll-joints
description: Build and tune Beat your Goblin's segmented Rapier ragdoll using compatible rigid-body, collider, impulse-joint, mass, damping and limit settings.
---

# Rapier Ragdoll & Joints - Goblin

Use for body-part physics, floppy/explosive joints, unnatural limbs, unstable poses, body proportions and collider alignment.

## Build order

1. Define semantic body parts.
2. Give each part one simple collider matching gameplay, not visual detail.
3. Set mass/density ratios intentionally.
4. Place joint anchors in each body's local space.
5. Choose the simplest joint type that matches the anatomy.
6. Add limits.
7. Tune damping and solver accuracy only after anchors/masses are correct.
8. Test the whole chain under extreme impulses.

## Joint guidance

Official JS bindings expose impulse joints such as fixed, spherical, revolute and prismatic joints, but exact methods and limit APIs vary by Rapier version.

For Goblin:
- neck: constrained rotation; avoid unrestricted head spinning
- shoulders/hips: broader angular freedom
- elbows/knees: hinge-like revolute behaviour with asymmetric anatomical limits
- torso/pelvis: limited articulation, not a free ball joint

Always verify joint APIs against the installed version.

## Mass and inertia

- Keep neighbouring limb masses within sensible ratios.
- Avoid a head or torso that is orders of magnitude heavier than connected limbs.
- Prefer collider density/mass design over arbitrary corrective impulses.
- If using additional mass/inertia APIs, confirm the installed-version method names.

## Stability checklist

If the ragdoll explodes or jitters:
1. inspect overlapping colliders and bad joint anchors
2. check initial pose for constraint violations
3. inspect extreme mass ratios
4. inspect self-collision policy
5. verify timestep
6. only then increase per-body/island solver effort if supported

Do not increase solver iterations as the first fix.

## Self-collision

Decide deliberately which adjacent body parts may collide. If unwanted self-collision causes jitter, use compatible collision groups/filters rather than shrinking all colliders until hits feel wrong.

## Acceptance

Verify:
- spawn pose is stable
- head/arms/legs respond separately
- heavy hit transfers through the chain without numeric explosion
- floor contact is stable
- reset restores a clean pose
- repeated resets do not create duplicate bodies or joints

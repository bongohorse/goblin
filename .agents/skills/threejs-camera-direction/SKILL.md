---
name: threejs-camera-direction
description: Design stable Three.js cameras for Beat your Goblin: subject framing, follow/orbit modes, transitions, resize handling, clipping limits and mobile-safe composition.
---

# Camera Direction - Goblin

The camera is part of gameplay readability.

## Build order

1. Define the Goblin's desired screen occupancy in landscape.
2. Choose FOV, near/far and target height from subject scale.
3. Derive position and look target separately.
4. Add follow smoothing with frame-rate-independent response.
5. Add alternate camera modes only with explicit transition ownership.
6. Add arena/collision constraints if the camera can enter walls or props.
7. Revalidate after resize/orientation changes.

## Rules

- The Goblin must remain readable during extreme ragdoll poses.
- Use `lerp` for position and `slerp` for orientation when interpolating.
- Avoid stacking multiple smoothers over one transition.
- Clamp delta time before spring/follow integration.
- Update the projection matrix after aspect/FOV/near/far changes.
- Camera motion must not affect Rapier state.
- Keep UI safe areas independent of camera framing.
- Prevent near-plane clipping on large head/limb motion.
- Prefer 2-3 intentional camera modes over unrestricted orbit for the core game.

## Verification

Check:
- upright Goblin
- Goblin lying on floor
- Goblin thrown toward camera
- widest limb spread
- desktop wide
- mobile landscape
- resize/orientation change

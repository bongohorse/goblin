---
name: threejs-procedural-animation
description: Build frame-rate-independent non-physics animation in Beat your Goblin for camera-independent props, UI-world cues, secondary motion and authored visual sequences.
---

# Procedural Animation - Goblin

Animate semantic state, not arbitrary transform curves.

Rapier owns physical Goblin/body motion. This skill is for authored visual motion layered around physics.

## Good uses

- tool anticipation/follow-through visuals
- floating world-space prompts
- prop idle motion
- effect envelopes
- camera-independent environmental motion
- deterministic secondary wobble that does not change collision state

## Rules

- Use elapsed seconds / delta seconds, never frame count.
- Clamp large delta values after tab restore.
- Keep gameplay transforms and visual-only transforms clearly separated.
- Derive orientation from direction first; apply roll/spin separately.
- Use springs for convergence, analytic curves for authored timelines.
- Reset every owned state on replay/reset.
- Seed randomness when visual regression needs reproducibility.
- Never animate a Rapier-owned mesh independently from its rigid body unless it is a child visual with an explicit local offset.

## Acceptance

Animation must behave consistently at 30, 60 and high refresh rates and must not leave stale state after Reset.

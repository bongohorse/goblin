---
name: threejs-procedural-vfx
description: Author performant Three.js interaction VFX for Beat your Goblin: impact bursts, sparks, dust, trails, screen-readable hit feedback and pooled effect lifetimes.
---

# Procedural VFX - Goblin

Build effects from an event, direction, lifetime and rendering response. Effects must explain gameplay, not obscure it.

## Effect graph

gameplay event
-> spawn data
-> motion/age
-> visual response
-> lifetime/pool
-> optional HDR/bloom contribution

## Rules

- Pool reusable particles/instances; avoid allocating new meshes every hit.
- Use normalised lifetime curves.
- Derive secondary motion from the hit/tool direction.
- Cap particle count and overdraw.
- Prefer instancing for many identical particles.
- Keep transparent layers few and bounded on mobile.
- Bloom may enhance an effect, but the effect must still read with bloom disabled.
- Separate hit strength from visual exaggeration with named parameters.
- VFX must never drive Rapier gameplay outcomes.
- Clean up finished GPU resources and event references.

## Recommended Goblin effects

- small directional impact burst
- dust/contact puff at floor hits
- short tool motion trail
- subtle combo escalation
- restrained screen/world feedback for heavy hits

Avoid constant ambient particle noise until core hit feedback works.

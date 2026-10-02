---
name: threejs-gameplay-systems
description: Build and tune Beat your Goblin gameplay systems: tools, pointer/touch input, Rapier ragdoll physics, scoring, objectives, rounds, state, game feel and progression hooks.
---

# Three.js Gameplay Systems - Goblin

Build playable behaviour with clear ownership and deterministic update order.

## Core loop contract

For substantial gameplay changes state:

`Player uses [tool/input] on the Goblin to create [physical result], receives [feedback/reward], while [constraint/objective] shapes the next action.`

Every clause must exist in the actual game.

## Ownership

- Input layer -> pointer/touch intents
- Game state -> rounds, score, combo, objectives, unlock hooks
- Rapier -> rigid bodies, joints, contacts, impulses, fixed physics step
- Three.js -> visible representation
- UI -> render state + emit intents
- Audio/VFX -> react to gameplay events

## Physics rules

- Keep a fixed timestep.
- Clamp accumulated frame time after stalls.
- Apply impulses/forces through Rapier, not visual meshes.
- Render meshes from physics transforms.
- Reset all rigid-body velocities and gameplay flags on restart.
- Keep render geometry and collision geometry intentionally separate.
- Bound dynamically spawned objects and remove/reuse stale ones.
- Tune masses, damping and joint limits together; avoid random per-part fixes without checking the full ragdoll.

## Input

- Pointer and touch must use the same intent path.
- Use pointer capture for drag interactions.
- Never depend on hover for required mobile gameplay.
- Touch targets must remain usable in landscape.
- A tool selection should have one authoritative state.

## Game feel

Prioritise responsiveness and readable cause/effect:
- immediate tool feedback
- directional hit response
- short, bounded camera/VFX/audio emphasis
- fast reset
- clear scoring/objective acknowledgement

Do not hide weak physics behind excessive screen shake or particles.

## Acceptance

For any gameplay gate verify: trigger -> physics/state change -> feedback -> reset/retry, plus `npm run build`.

---
name: threejs-picking-interaction
description: Implement Three.js Raycaster/layer-based picking for Beat your Goblin while keeping Rapier authoritative for physical interactions.
---

# Three.js Picking & Interaction - Goblin

Use when the visual object hierarchy is the right source for selection. For physics-authoritative hit geometry, prefer Rapier scene queries via `rapier-interaction-queries-events`.

## Choose the correct picking owner

Use Three.js Raycaster when:
- selecting UI-like 3D visuals
- selecting render-only props
- selecting model submeshes by visual geometry

Use Rapier queries when:
- gameplay collider hit location matters
- interaction must match physics exactly
- selecting ragdoll body colliders

Do not maintain two conflicting hit-test systems for the same interaction.

## Raycaster rules

Official Three.js Raycaster supports:
- `setFromCamera()`
- recursive object intersection
- layers
- per-object raycast implementations

For Goblin:
- convert pointer coordinates from the actual canvas rect
- account for canvas not filling the whole page
- decide recursion intentionally
- filter selectable objects via a dedicated collection or Layers
- map visual hits to semantic entities once

## Pointer/touch

Use Pointer Events as the shared desktop/mobile input path.

Raycasting is selection only. Drag ownership, capture, release and physics application still belong to the gameplay/input layer.

## Performance

Do not raycast the entire scene graph every pointer-move if only a small selectable set matters.

For continuous dragging:
- select once on pointer-down
- retain the semantic target
- update drag target without reselecting everything each frame unless necessary

## Acceptance

Verify:
- center and edge-of-canvas coordinates
- resized canvas
- nested model submeshes
- transparent/decorative meshes do not steal selection
- mobile pointer/touch path
- selection remains aligned with visuals after camera movement

---
name: threejs-scenegraph-transforms
description: Manage Beat your Goblin's Three.js Object3D hierarchy, local/world transforms, parenting, visibility layers and transform ownership without fighting Rapier.
---

# Three.js Scene Graph & Transforms - Goblin

Use when objects appear in the wrong place/orientation, parenting changes behaviour, world/local coordinates get mixed, or a model/prop needs a stable hierarchy.

## Ownership first

For Rapier-owned gameplay objects:
- Rapier rigid-body transform is authoritative.
- The Three.js root mesh/group mirrors the rigid body.
- Child visuals may use local offsets for art alignment.
- Do not write world-space gameplay corrections into child visuals.

For purely visual objects:
- Three.js owns the transform.

## Local vs world

Before modifying a transform, state which space it is in:
- local position/quaternion/scale
- world position/quaternion/scale

Use official Object3D helpers such as world/local conversion methods when appropriate rather than hand-rolling parent transforms.

## Parenting rules

- `add()` reparents and preserves the child's local transform, not necessarily its previous world placement.
- `attach()` is intended to preserve world transform, but official docs warn about scene graphs with non-uniformly scaled nodes.
- Avoid non-uniform parent scale in hierarchies that need stable physics/attachment math.
- Keep semantic groups shallow: model root -> visual parts is usually enough.

## Matrices

Leave automatic matrix updates enabled unless profiling proves manual control is useful.

If disabling auto updates:
- own `updateMatrix()` / world-matrix propagation deliberately
- document who marks matrices dirty
- test raycasting and world-space helpers after changes

## Layers and visibility

Use Layers for intentional renderer/raycaster filtering, not as a substitute for gameplay collision groups.

## Goblin examples

Good hierarchy:
`physicsBodyVisualRoot -> characterArt -> cosmetic/details`

Avoid:
`physicsBody -> scaledParent -> rotatingParent -> cosmetic -> hitTarget`
when hit detection/attachment relies on predictable coordinates.

## Acceptance

Verify:
- correct pose after reset
- correct world placement after reparenting
- ray/picking target still lines up
- camera tracking reads the intended root
- no double application of Rapier + Three.js motion

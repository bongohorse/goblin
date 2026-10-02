---
name: rapier-debug-reset-performance
description: Debug and profile Beat your Goblin's Rapier world using debug rendering, handle/entity maps, lifecycle checks, deterministic reset and measured body/joint/event counts.
---

# Rapier Debug, Reset & Performance - Goblin

Use when physics behaviour is unclear, bodies disappear, reset breaks, memory grows, handles go stale or physics becomes slow.

## Debug rendering

Official Rapier JS exposes physics debug-shape data through world debug rendering in current upstream docs.

When compatible with the installed version:
- render debug lines in a dedicated Three.js overlay
- make it dev/debug only
- show colliders independently from production meshes
- use it to inspect body/collider alignment, overlaps and unexpected shapes
- remove/dispose debug geometry cleanly

The purpose is to see Rapier's world, not the art mesh.

## Handle maps

Maintain explicit mappings:
- rigid-body handle -> semantic entity/body part
- collider handle -> owning body/entity
- body -> Three.js mesh

After deletion/reset, remove stale mappings immediately.

Do not assume a handle remains meaningful after the underlying object is removed.

## Reset contract

A reset must restore or recreate:
- translation/rotation
- linear/angular velocity
- accumulated forces/torques where applicable
- sleep/wake state as intended
- tool/grab state
- score/objective flags outside Rapier
- spawned projectiles/props according to game rules
- event-processing state

Choose one reset model:
A. deterministic in-place restore for stable persistent bodies
B. full world/entity teardown and rebuild

Do not mix both casually.

## Lifecycle

The official JS bindings use WebAssembly-backed resources. Exact `free()` requirements have changed over Rapier versions.

Before manually freeing or relying on GC:
- inspect installed-version docs/changelog
- own long-lived World/EventQueue lifecycle explicitly
- do not copy old cleanup snippets blindly

## Profiling

Measure a fixed scenario:
- physics step time
- rigid-body count
- collider count
- joint count
- awake body count if available
- spawned object count
- event count per step
- reset count/resource trend

If performance degrades, classify whether cost comes from broad collision load, constraint islands, CCD, too many awake bodies, event spam or object leaks before tuning.

## Bug workflow

1. enable debug visualization
2. reproduce with minimal objects
3. log semantic IDs plus Rapier handles
4. compare before/after one physics step
5. fix the owner
6. remove temporary logging
7. repeat the original scenario and multiple resets

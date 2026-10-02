---
name: threejs-resource-lifecycle
description: Prevent Beat your Goblin GPU/resource leaks by disposing Three.js geometries, materials, textures, render targets, loaders' resources and detached scene objects deliberately.
---

# Three.js Resource Lifecycle - Goblin

Removing an Object3D from the scene does not automatically free all GPU resources.

Official Three.js cleanup guidance explicitly calls out disposal for resources such as geometries and textures, and loaded files may contain shared/nested resources.

## Ownership model

Every runtime-created or dynamically loaded resource needs one owner that decides when it becomes unreachable.

Track at least:
- BufferGeometry
- Material(s)
- Texture(s)
- render targets
- post-processing buffers/passes where applicable
- environment/PMREM resources
- loaded model roots
- AnimationMixer state
- temporary debug/VFX resources

## Shared resources

Do not dispose a shared geometry/material/texture when one consumer disappears.

Prefer:
- asset-level ownership
- reference-counted/shared cache ownership
- or one clear lifetime equal to the whole game session

## Object teardown

Typical permanent teardown:
1. detach listeners/references
2. stop animation ownership
3. remove object from parent
4. traverse owned descendants
5. dispose owned geometry/materials/textures
6. dispose extra render targets/resources
7. clear maps/caches pointing at the object

Do not call renderer recreation as a generic cleanup strategy.

## Reset vs destroy

A normal round reset should reuse stable scene assets where practical.

Destroy/reload only:
- temporary projectiles/props that are not pooled
- replaced model packs
- abandoned render targets/effects
- debug resources
- scene instances whose lifetime truly ended

## Loaded assets

GLTF assets may use shared materials/textures and ImageBitmap-backed textures. Treat disposal at the asset package level unless ownership is known.

## Leak verification

Use `threejs-renderer-diagnostics` and repeated resets.

Watch for trends in:
- geometries
- textures
- programs
- render targets
- scene children
- event listeners
- mixers
- spawned objects

A count that rises during warm-up and then stabilises may be normal. A count that grows every reset is not.

---
name: threejs-assets-loading
description: Integrate production Three.js assets into Beat your Goblin using LoadingManager, GLTFLoader and explicit load/error/lifecycle handling compatible with Vite and GitHub Pages.
---

# Three.js Asset Loading - Goblin

Use for GLB/GLTF, textures, compressed assets, model replacement or loading UX.

## Preferred 3D format

Prefer glTF 2.0 / GLB for production web assets unless a specific requirement justifies another format.

Official `GLTFLoader` supports scenes, meshes, materials, textures, skins, skeletons, morph targets and animations.

## Import discipline

Use Three.js addons via supported module imports matching the installed version, e.g. loader modules under `three/addons/...` when available in that release.

Do not copy loader source into the repo.

## Loading architecture

For non-trivial asset sets:
- use one intentional LoadingManager scope
- surface load/error state to the game
- fail gracefully if a cosmetic/optional asset fails
- block gameplay start only for truly required assets
- keep URLs compatible with Vite's production base and GitHub Pages

Prefer `loadAsync()` where it simplifies control flow.

## Compression

Draco, Meshopt and KTX2 can reduce delivery cost but add decoder/runtime complexity.

Only introduce compression when:
- asset size warrants it
- decoder paths work in production Pages builds
- mobile decode/runtime cost is measured
- CI/live test covers decoder assets

## GLTF caveat

Official GLTFLoader uses ImageBitmapLoader where possible and warns that image bitmaps can require special disposal handling.

Therefore asset loading and lifecycle must be designed together; invoke `threejs-resource-lifecycle` for replaceable/unloaded models.

## Model contract

When loading a Goblin/prop asset, define:
- expected root
- scale/orientation
- named semantic nodes if relied upon
- whether animations exist
- material ownership
- collider mapping
- disposal ownership

Do not scatter `getObjectByName()` assumptions throughout gameplay code.

## Acceptance

Verify dev + production Pages URLs, load failure behaviour, repeated reset/reload, model scale/orientation, texture color correctness and absence of new network/console errors.

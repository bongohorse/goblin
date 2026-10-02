---
name: threejs-skill-router
description: Route Beat your Goblin Three.js graphics and runtime work to the smallest relevant skill set. Use for scene graph, render loop, picking, loading, animation, lifecycle, diagnostics, camera, materials, VFX, shadows, WebGPU/TSL or final-image changes.
---

# Three.js Skill Router - Goblin

Use only the Three.js expertise that materially changes the requested result.

## Version gate first

The project declares `three ^0.186.1`. The official `mrdoob/three.js` `dev` branch can differ from the installed release.

Before implementation:
1. read `package.json` and lockfile if present
2. identify the actually installed Three.js version
3. prefer docs/examples matching that release
4. verify APIs that only appear on `dev`
5. make dependency upgrades a separate explicit task when required

## Route

### Core/runtime
- Object3D hierarchy, parenting, local/world transforms -> `threejs-scenegraph-transforms`
- Animation/render loop, canvas size, DPR, resize/orientation -> `threejs-render-loop-responsive`
- Click/touch object selection with Three.js geometry -> `threejs-picking-interaction`
- GLTF/models/textures/loading state -> `threejs-assets-loading`
- Imported skeletal/keyframe clips -> `threejs-animation-mixer`
- Geometry/material/texture/render-target cleanup -> `threejs-resource-lifecycle`
- Draw calls, triangles, renderer memory/state inspection -> `threejs-renderer-diagnostics`

### Graphics
- Camera composition, follow modes, framing or transitions -> `threejs-camera-direction`
- Authored object motion not owned by Rapier -> `threejs-procedural-animation`
- Surface identity, roughness, emissive response or procedural detail -> `threejs-procedural-materials`
- Generated props, arena pieces or custom mesh construction -> `threejs-procedural-geometry`
- Hit sparks, trails, impact bursts, dust, stylised particles -> `threejs-procedural-vfx`
- Shadow stability, quality or cost -> `threejs-shadow-systems`
- Bloom, exposure, tone mapping or several post passes -> `threejs-image-pipeline`
- Visual acceptance, fixed-view comparison or graphics budgets -> `threejs-visual-validation`

### WebGPU
- WebGPU renderer, TSL or node materials -> `threejs-webgpu-tsl`
- High-count visual simulation with a proven CPU bottleneck -> `threejs-webgpu-compute`
- WebGPU support checks, fallback, limits or device loss -> `threejs-webgpu-resilience`

## Goblin execution order

1. Define the player-visible target and mobile frame budget.
2. Establish correct scene-graph ownership and render-loop behaviour.
3. Make silhouette, scale and framing work without post effects.
4. Make materials readable under normal lighting.
5. Add motion and VFX only where they communicate interaction.
6. Add/adjust shadows.
7. Add image-space treatment last.
8. Consider WebGPU only if a measured need exists.
9. Validate desktop + mobile landscape + repeated reset.

## Constraints

- Rapier owns gameplay physics; Three.js renders it.
- Never move a Rapier-owned gameplay mesh independently unless it is an explicit child visual offset.
- Do not solve resource leaks by forcing renderer recreation every round.
- Do not solve weak geometry/materials with bloom.
- Prefer one strong mechanism over several unrelated effects.
- Keep `WebGLRenderer` as the default unless a dedicated issue explicitly approves migration.

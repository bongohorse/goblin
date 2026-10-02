---
name: threejs-skill-router
description: Route Beat your Goblin Three.js graphics work to the smallest relevant graphics skill set. Use for visual rewrites, scene polish, camera work, materials, VFX, shadows or final-image changes.
---

# Three.js Skill Router - Goblin

Use only the graphics expertise that materially changes the requested result.

## Route

- Camera composition, follow modes, framing or camera transitions -> `threejs-camera-direction`
- Authored object motion not owned by Rapier -> `threejs-procedural-animation`
- Surface identity, roughness, emissive response or procedural detail -> `threejs-procedural-materials`
- Generated props, arena pieces or custom mesh construction -> `threejs-procedural-geometry`
- Hit sparks, trails, impact bursts, dust, stylised particles -> `threejs-procedural-vfx`
- Shadow stability, quality or cost -> `threejs-shadow-systems`
- Bloom, exposure, tone mapping or several post passes -> `threejs-image-pipeline`
- Visual acceptance, fixed-view comparison or graphics budgets -> `threejs-visual-validation`

## Goblin execution order

1. Define the visible target and mobile frame budget.
2. Make silhouette, scale and framing work without post effects.
3. Make materials readable under normal lighting.
4. Add motion and VFX only where they communicate an interaction.
5. Add/adjust shadows.
6. Add image-space treatment last.
7. Validate near/design/far views plus mobile landscape.

## Constraints

- Inspect the installed Three.js version and official docs for API details.
- Rapier owns gameplay physics; do not duplicate physics in visual animation.
- Do not solve weak geometry/materials with bloom.
- Avoid adding a render pass just because it exists in Three.js.
- Prefer one strong mechanism over several unrelated noise/effect layers.
- Every added graphics system needs an explicit cost and a way to disable or simplify it.

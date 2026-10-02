---
name: threejs-procedural-materials
description: Author coherent, performant Three.js materials for the Goblin, arena, tools and props using causal PBR channels, filtered detail and explicit mobile budgets.
---

# Procedural Materials - Goblin

A material should describe one believable/stylised surface identity. Color, roughness, metalness, normal and emission should reinforce the same cause.

## Material order

stable coordinates
-> large structural variation
-> material identity
-> wear/dirt/damage masks
-> filtered small detail
-> PBR channels
-> optional emission

## Goblin priorities

- skin: readable green hue, soft rough response, damage marks as restrained overlays
- cloth/sack: broad roughness and weave suggestion, not noisy per-pixel chaos
- wood/arena: scale-consistent grain and wear
- metal tools: controlled metalness/roughness, readable edge highlights
- emissive effects: HDR values only when the image pipeline actually supports them

## Rules

- Never use independent random noise for every PBR channel.
- Respect physical texture scale across differently sized objects.
- Filter high-frequency procedural bands by distance/footprint.
- Keep shader branches bounded and measurable.
- Avoid custom ShaderMaterial when MeshStandard/Physical material plus small extensions is enough.
- Dispose textures/materials that are replaced dynamically.
- Keep a cheap material tier for mobile if a material becomes expensive.
- Validate materials without bloom before tuning bloom.

## Diagnostics

Expose or temporarily inspect:
- base color only
- roughness
- normals
- emission
- final lit result

---
name: threejs-procedural-geometry
description: Build and audit procedural Three.js geometry for Goblin arena props, tools and generated meshes with clean topology, designed joins and bounded complexity.
---

# Procedural Geometry - Goblin

Use procedural geometry where it improves iteration or avoids unnecessary asset overhead. Do not replace authored character art with primitive approximations once final art exists.

## Build order

1. Define semantic parts and dimensions.
2. Build the simplest complete silhouette.
3. Add designed thickness, bevels and transitions.
4. Create normals/UVs/material groups deliberately.
5. Audit intersections, loose pieces and coplanar surfaces.
6. Set a triangle/instance budget appropriate to how often the object appears.

## Rules

- Avoid razor-sharp box/cylinder joins on visible hero props.
- Do not leave coplanar faces that can z-fight.
- Closed solids should have consistent winding and usable normals.
- Repeated props should prefer instancing where practical.
- Geometry complexity must follow screen size.
- Keep collision geometry simpler than render geometry; Rapier colliders do not need to mirror every bevel.
- Name semantic parts when later interaction or material ownership depends on them.
- Do not merge all geometry before debugging individual pieces.

## Goblin use cases

- arena furniture/props
- simple tool meshes
- breakable-looking decorative objects
- procedural floor/wall detail
- temporary prototype geometry before final art

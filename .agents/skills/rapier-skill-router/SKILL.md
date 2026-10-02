---
name: rapier-skill-router
description: Route Beat your Goblin Rapier work to the smallest relevant physics skill while enforcing compatibility with the installed @dimforge/rapier3d-compat version.
---

# Rapier Skill Router - Goblin

Use this whenever a task materially changes rigid bodies, colliders, joints, forces, queries, collision events, stepping, CCD, reset or physics performance.

## Version gate first

The project currently declares `@dimforge/rapier3d-compat ^0.21.0`, while the official Rapier repository may document newer APIs.

Before implementation:
1. read `package.json` and lockfile if present
2. identify the actually installed Rapier version
3. check the official TypeScript changelog or version-matched docs
4. use only APIs supported by that version
5. if an upstream API is newer, either use the older equivalent or make the dependency upgrade a separate explicit task

Do not silently mix examples from Rapier master with an older installed package.

## Route

- Goblin body setup, mass ratios, collider sizing, joint anchors/limits, floppy or explosive ragdoll -> `rapier-ragdoll-joints`
- Punch/hammer/grab/projectile interaction, ray/shape queries, collision/contact events, CCD -> `rapier-interaction-queries-events`
- Fixed timestep, accumulator, sleep, solver tuning, scale, tunneling/stability -> `rapier-simulation-stability`
- Physics debugging, debug draw, reset, leaked bodies/events, handle maps, performance -> `rapier-debug-reset-performance`

## Core ownership

- Rapier owns physical state.
- Three.js mirrors Rapier transforms for rendering.
- UI/tools emit intents; they do not directly move render meshes as gameplay state.
- VFX/audio react to physics events; they do not become a second collision system.

## Default rule

Prefer the smallest physically coherent change. Do not compensate for a bad joint or mass setup by adding arbitrary forces elsewhere.

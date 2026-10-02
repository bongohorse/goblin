---
name: threejs-webgpu-resilience
description: Handle WebGPU capability detection, portability, device limits, initialisation failure, device loss and graceful fallback for Beat your Goblin.
---

# Three.js WebGPU Resilience - Goblin

WebGPU support is a runtime capability, not an assumption.

## Capability strategy

Before enabling a WebGPU-only feature:

1. check current target-browser support from authoritative sources
2. feature-detect at runtime
3. query only the limits/features actually needed
4. avoid requesting device limits above what the feature requires
5. define behaviour when initialisation fails

The core game must remain understandable and playable when an optional graphics feature is unavailable.

## Fallback hierarchy

Prefer:
1. WebGPU feature path
2. simpler WebGL equivalent
3. feature disabled with normal gameplay preserved

Do not hard-fail the whole game for decorative effects.

## Device loss

If a WebGPU renderer is introduced:

- listen for device-loss conditions
- separate persistent game state from transient GPU resources
- recreate renderer/GPU resources through one controlled path
- avoid spawning multiple animation loops during recovery
- show a concise user-facing graphics error if recovery fails
- do not serialize transient particle/buffer state just to restore an effect

## Limits and portability

- Query adapter/device capabilities before allocating large buffers.
- Design around conservative limits first.
- Higher limits need a measured justification and a fallback.
- Texture compression/features vary by device; do not hardcode desktop-only assumptions.
- Treat optional GPU timing features as diagnostics, not requirements.

## Goblin-specific invariants

A WebGPU failure must not corrupt:
- score
- timer/round state
- tool selection
- Rapier world
- objectives
- saved progression/settings

## QA

Test:
- unsupported/no-WebGPU path
- successful WebGPU initialisation
- feature disabled/fallback path
- resize/orientation change
- repeated renderer initialise/dispose cycles in development
- device-loss recovery when the implementation exposes a safe test hook

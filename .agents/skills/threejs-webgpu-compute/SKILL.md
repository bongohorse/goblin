---
name: threejs-webgpu-compute
description: Design measured WebGPU compute workloads for Beat your Goblin, especially high-count visual simulations, while keeping Rapier authoritative for gameplay physics.
---

# Three.js WebGPU Compute - Goblin

GPU compute is an optimisation/simulation tool, not a replacement for the game's authoritative physics.

## Use compute only when

- there is a large parallel workload
- the CPU path is actually a measured bottleneck
- results can stay visual or have a clearly defined readback boundary
- target devices support the required limits/features

Likely useful future cases:
- thousands of purely visual particles
- large decorative debris fields
- screen-space or simulation buffers with independent elements

Do not use it for:
- Goblin ragdoll physics
- tool hit resolution
- score/objective logic
- small particle counts where CPU/instancing is already cheap

## Workflow

1. Establish a CPU baseline with fixed scene/state.
2. Estimate element count, buffer footprint and update frequency.
3. Check adapter/device limits before selecting buffer sizes/workgroup sizes.
4. Prototype one compute kernel with deterministic initial state.
5. Keep GPU state visual-only whenever possible.
6. Measure dispatch, rendering and memory cost against the CPU baseline.
7. Add a cheaper fallback or disable path for unsupported hardware.

## Data rules

- Minimise CPU<->GPU readback; it can erase compute gains.
- Pack data deliberately; document element layout.
- Bound every buffer by a project-level maximum.
- Never allocate per frame.
- Reuse storage buffers and compute pipelines.
- Keep compute work proportional to active visual elements.
- Avoid requesting larger device limits than the feature actually needs.

## Synchronisation

Rapier continues to update at the fixed gameplay timestep. Visual compute may interpolate/react to gameplay events, but it must not become a second source of truth for collision or ragdoll state.

## Acceptance

Include element count, memory footprint, target device/browser, before/after frame-time evidence, fallback behaviour and a stress test.

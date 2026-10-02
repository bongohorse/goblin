---
name: threejs-webgpu-tsl
description: Use Three.js WebGPU and TSL safely in Beat your Goblin for scoped renderer experiments, node materials and modern shader work while preserving compatibility and a WebGL fallback.
---

# Three.js WebGPU / TSL - Goblin

Use this skill when an issue explicitly calls for WebGPU, TSL, node materials, or a measured graphics problem that WebGPU can plausibly solve.

## Default posture

Goblin currently has a working WebGL renderer. Do not migrate the whole game merely because WebGPU is newer.

Before changing renderer architecture:

1. identify the concrete benefit
2. measure the current bottleneck
3. verify current browser/device support from primary sources
4. verify the exact API against the installed Three.js version
5. define fallback behaviour
6. prototype the smallest isolated slice first

## TSL use cases

Good candidates:
- a custom material that would otherwise require brittle shader-string patching
- a visual effect shared by WebGPU and Three.js node-material infrastructure
- renderer-specific experiments behind a capability gate

Poor candidates:
- simple color/roughness changes already handled by standard materials
- gameplay physics
- basic hit feedback that normal Three.js materials/particles handle well

## Architecture rules

- Keep renderer creation behind one explicit factory/interface.
- Do not scatter `three/webgpu` imports through unrelated gameplay modules.
- Keep gameplay state renderer-agnostic.
- Rapier simulation must not depend on WebGPU availability.
- DOM UI must remain usable if WebGPU initialisation fails.
- Keep asset paths compatible with GitHub Pages.
- Avoid maintaining two divergent material systems unless the benefit is demonstrated.

## TSL rules

- Prefer TSL/node materials over raw WGSL for normal Three.js material work.
- Use named semantic nodes/uniforms rather than giant inline expression chains.
- Keep animation time frame-rate independent.
- Treat node graphs as production code: small functions, explicit ownership, debuggable inputs.
- Verify renamed/deprecated nodes against current Three.js docs before implementation.

## Acceptance for a WebGPU change

- production build passes
- WebGPU path renders the intended state
- fallback/non-WebGPU behaviour is defined and tested
- no gameplay-state divergence
- mobile/target-device support is documented
- before/after performance or capability evidence exists when performance is the justification

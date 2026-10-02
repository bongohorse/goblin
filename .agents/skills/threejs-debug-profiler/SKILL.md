---
name: threejs-debug-profiler
description: Diagnose and profile Beat your Goblin Three.js/Rapier runtime issues, mobile input failures, rendering problems, memory growth and performance bottlenecks using measured evidence.
---

# Three.js Debug Profiler - Goblin

Find the owning subsystem before changing code.

## Debug order

1. Reproduce the exact user-visible failure.
2. Capture browser console errors/warnings.
3. Check failed network/module/asset requests.
4. Identify owner: startup, renderer, loop, camera, Rapier, input, UI, audio or Pages base path.
5. Minimise the repro.
6. Fix the root cause.
7. Re-run the same repro and production build.

Use `diagnosing-bugs` for hypothesis discipline.

## Common Goblin failure checks

- more than one animation loop or timer
- wrong seconds vs milliseconds
- canvas CSS size vs drawing buffer mismatch
- stale pointer capture / missing pointer-up cleanup
- touch events blocked by page scrolling
- body/mesh maps referring to deleted physics state
- reset clears position but not velocity/flags
- spawned rigid bodies/meshes accumulate forever
- renderer/material/geometry resources not disposed
- shadow-map cost too high for mobile
- camera near/far or clipping hides the Goblin
- Vite/Pages asset paths wrong under `/goblin/`

## Profile

Use a fixed repeatable scenario and record before/after:
- frame time/FPS
- `renderer.info.render.calls`
- triangles
- textures/geometries/programs where available
- active Rapier body count
- spawned gameplay-object count
- bundle/build size when relevant

Classify the likely bottleneck as CPU update, physics, draw calls, vertex load, fragment/overdraw, memory or network before optimising.

Change one thing, then measure the same scenario again.

---
name: threejs-renderer-diagnostics
description: Diagnose Beat your Goblin rendering cost and renderer state using official Three.js renderer.info metrics, capabilities and repeatable visual/performance scenarios.
---

# Three.js Renderer Diagnostics - Goblin

Use for suspected rendering regressions, draw-call growth, geometry/texture leaks, shader/program churn or unexplained GPU load.

## Version first

Metric shapes differ between WebGLRenderer and newer common/WebGPU renderer APIs. Inspect the installed Three.js version and renderer type before assuming property names.

## Core measurements

For WebGLRenderer, official docs/source expose `renderer.info` data including render counts such as calls/triangles and memory/program information.

Record a fixed scenario:
- renderer type/version
- viewport + DPR
- scene/object count
- draw calls
- triangles
- geometries/textures/programs where exposed
- shadow enabled/map sizes
- number/size of render targets
- frame time from browser profiling

## Reset semantics

Three.js may automatically reset per-frame renderer.info counters. If a multi-pass/custom loop changes auto-reset behaviour, call reset deliberately according to the installed API.

Do not compare counters from differently configured reset modes.

## Diagnose by category

If draw calls are high:
- too many separate meshes/materials
- missing instancing/batching
- too many shadow casters
- many transparent/effect layers

If triangles are high:
- overspecified hero/prop geometry
- too many spawned objects
- no sensible LOD/visibility bounds

If textures/memory trend upward:
- resource lifecycle leak
- repeated model/texture load
- undisposed render targets
- stale debug/post resources

If programs grow:
- excessive material/shader variants
- dynamic defines/custom materials created repeatedly

## Workflow

1. capture baseline after warm-up
2. perform the suspect action N times
3. capture same metrics
4. identify the growing category
5. trace owner
6. fix owner
7. rerun the exact same scenario

Use browser performance tools for actual CPU/GPU timing; renderer.info is diagnostic evidence, not a complete profiler.

## Acceptance

For significant graphics changes, record before/after values and ensure repeated resets/rounds stabilise rather than monotonically grow.

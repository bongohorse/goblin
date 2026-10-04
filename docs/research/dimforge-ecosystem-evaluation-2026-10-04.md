# Dimforge Ecosystem Evaluation — 2026-10-04

**Purpose:** assess whether other Dimforge projects are useful for Beat your Goblin now or later.

**Current stack:** Three.js + `@dimforge/rapier3d-compat` 0.21.0.

## Executive decision

Keep **Rapier** as the game/runtime physics engine.

Do **not** add another Dimforge dependency to the current Standing Lab.

One project is especially interesting for the future:

> **Nexus** may become useful as a high-throughput research backend for many parallel physics environments, parameter optimization, evolutionary search or reinforcement-learning experiments.

Even then, Nexus must not become the authoritative acceptance environment for gameplay physics unless the game itself moves to Nexus. Final candidates must be revalidated in the real Rapier-based Goblin Lab because Nexus runs a different GPU physics pipeline/solver.

The rest of the ecosystem is either already represented indirectly through Rapier or solves problems Goblin does not currently have.

## Nexus — GPU multiphysics

Repository:
- https://github.com/dimforge/nexus

Dimforge:
- https://www.dimforge.com/

### Current status

Nexus describes itself as essentially **"Rapier on the GPU"** and is still under heavy development.

It currently provides:

- GPU rigid-body simulation;
- contacts;
- ball/fixed/prismatic/revolute joints;
- joint limits and motors;
- reduced-coordinate multibodies;
- WebGPU, CUDA, Metal and CPU backends;
- WebAssembly/browser support;
- Python bindings;
- headless rendering/simulation support;
- deterministic mode on the same machine/build;
- batched environments.

The Nexus changelog explicitly states that it can keep one Rapier world per environment, bake those worlds into GPU buffers, and step the environments in parallel. Dimforge describes this batching as making Nexus usable as an RL simulator.

Nexus also contains MPM simulation for deformable/granular/fluid-like materials.

### Why Nexus is interesting for Goblin

This directly overlaps with the long-term Physics Labs idea:

- generate many candidate controllers;
- run many isolated environments;
- score Standing Time;
- optimize parameters;
- evolve populations;
- train/test future learned controllers.

Instead of simulating 500 Goblins serially in the browser, a future research tool might batch many environments on the GPU.

### Why we should NOT adopt Nexus now

1. **Heavy development / API churn.**  
   The project explicitly warns that features are missing and its 2026 changelog contains large rewrites and breaking changes.

2. **Not a JavaScript/Three.js drop-in replacement.**  
   The primary integration is Rust, with Python bindings. Browser support is through Rust/WASM/WebGPU rather than the mature `@dimforge/rapier3d-compat` JavaScript API we already use.

3. **Different solver = transfer risk.**  
   Candidate behavior found in Nexus may not behave identically in Rapier.

4. **Browser constraints.**  
   Nexus notes current browser/backend limitations, including no Safari support in its README.

5. **Our current problem is not simulation throughput.**  
   We first need a correct deterministic Standing Lab and useful metrics.

### Recommended future role

**Deferred research accelerator.**

Only revisit Nexus after:

1. Standing Lab exists;
2. headless Rapier runs exist;
3. parameter sweeps are useful;
4. simulation throughput becomes a real bottleneck.

Potential future workflow:

```text
Goblin experiment schema
        |
many candidates
        |
Nexus GPU batch search
        |
best candidates
        |
real Rapier headless validation
        |
real browser Standing Lab validation
        |
only then production consideration
```

This preserves Rapier as the final physics truth while using Nexus for throughput.

### Special future possibilities

Nexus may also become interesting for:

- reinforcement learning;
- neuroevolution;
- large evolutionary populations;
- robot-style multibody research;
- deformable materials;
- sand/snow/granular material experiments;
- fluid-like MPM interactions.

These are future research ideas, not current scope.

## Parry — collision detection

Repository:
- https://github.com/dimforge/parry

Parry is Dimforge's geometry and collision-detection library and underlies much of the collision/query functionality around Rapier.

It provides concepts such as:

- intersection tests;
- distance queries;
- contact computation;
- ray casting;
- shape casting / time of impact.

### Goblin relevance

**Conceptually useful, but no new dependency needed now.**

Rapier already gives the game the collision/contact/query functionality needed for:

- foot contacts;
- ground checks;
- ray/shape queries;
- collision events;
- contact manifolds.

For the Standing Lab, prefer Rapier's public JS APIs so experiments match production physics.

### Possible future role

Parry could become useful if we build a separate **Rust-native analysis tool** that needs custom geometry calculations without a full physics world.

Until that happens: no action.

## Kiss3d — simple Rust graphics engine

Repository:
- https://github.com/dimforge/kiss3d

Kiss3d is a small Rust 2D/3D renderer and is used by Dimforge for lightweight testbeds/viewers.

### Goblin relevance

**No direct need.**

Goblin already uses Three.js, which is the right rendering layer for the browser game and Labs.

Switching Lab rendering to Kiss3d would:

- create a second renderer;
- require Rust/WASM integration;
- reduce parity with the actual game;
- increase maintenance.

### Useful indirect lesson

Kiss3d confirms the value of lightweight testbed visualization: boxes, lines, contacts and simple cameras are enough for physics research.

We should copy that philosophy, not the rendering engine.

## nalgebra — Rust linear algebra

Repository:
- https://github.com/dimforge/nalgebra

nalgebra provides Rust vectors, matrices, transformations and decompositions.

### Goblin relevance

**No direct need in the current JavaScript codebase.**

Three.js already supplies the vector/quaternion/matrix math we need on the browser side, and Rapier exposes its own JS-friendly math data.

If a future native Rust research tool is created, nalgebra may become useful there.

Do not add it to the current web project.

## Simba — abstract/SIMD algebra traits

Repository:
- https://github.com/dimforge/simba

Simba is low-level Rust numeric infrastructure for generic/SIMD mathematics.

### Goblin relevance

**None directly.**

This is library-infrastructure territory, not game or Lab functionality.

Do not adopt directly.

## Salva — fluid simulation

Repository:
- https://github.com/dimforge/salva

Salva is a 2D/3D particle fluid simulation library. It supports WebAssembly and optional two-way coupling with Rapier rigid bodies.

### Goblin relevance today

**None for Standing.**

Adding fluid simulation now would only distract from the physics foundation.

### Possible future game use

Potentially interesting much later if the game wants real simulated:

- liquids;
- slime/goo;
- pools;
- fluid hazards;
- exaggerated physical environmental effects.

This would need its own isolated Lab and performance budget.

It should not become a dependency simply because it integrates with Rapier.

### Relationship to Nexus

Nexus's newer MPM work may eventually cover some broader material/fluid/deformable experiments on GPU. If we ever need this class of feature, compare Nexus MPM and Salva at that time instead of choosing now.

## Vortx — GPU tensors

Repository:
- https://github.com/dimforge/vortx

Vortx provides GPU tensor/matrix operations and is built on Dimforge's newer GPU-compute stack.

Its README currently labels it incomplete and under heavy development.

### Goblin relevance

**No direct need.**

Possible future relevance only if we build custom GPU-side:

- optimization;
- machine-learning math;
- large numerical workloads.

If Nexus already solves the required batched physics problem, using Vortx directly would be unnecessary lower-level work.

## Khal — GPU compute abstraction

Repository:
- https://github.com/dimforge/khal

Khal is a Rust compute-shader abstraction targeting WebGPU, CUDA and CPU. It is infrastructure used by Dimforge's GPU projects such as Nexus/Vortx.

Its README also describes it as under heavy development.

### Goblin relevance

**No direct need.**

Using Khal ourselves would mean becoming GPU-compute-engine developers. That is far below the level of abstraction our current problem requires.

Only revisit if, in the future, we intentionally create custom Rust/GPU simulation or optimization kernels that Nexus cannot provide.

## Practical ranking for Goblin

| Project | Now | Future | Decision |
| --- | --- | --- | --- |
| Rapier | Essential | Essential | Keep as runtime physics |
| Nexus | No | **High potential for massive Lab simulation/learning** | Watch/re-evaluate later |
| Parry | Indirectly via Rapier | Maybe for Rust analysis tools | No extra dependency |
| Kiss3d | No | Low | Keep Three.js |
| nalgebra | No | Maybe in Rust tooling | No web dependency |
| Simba | No | Very low | Ignore directly |
| Salva | No | Optional game-content idea | Revisit only if fluids become a feature |
| Vortx | No | Low/indirect | Let Nexus own this layer |
| Khal | No | Low/indirect | Let Nexus own this layer |

## Important architecture rule

The existence of faster or more specialized Dimforge engines does **not** mean the game should continuously change its physics stack.

For research tools, distinguish:

### Runtime truth

The physics configuration actually used by the game.

Currently:

> Three.js + `@dimforge/rapier3d-compat`.

### Research accelerator

A different backend may explore many candidates faster.

Potential future example:

> Nexus GPU batches.

Any candidate produced by a different backend must be re-run and accepted in the runtime-truth environment before it can influence production.

This avoids optimizing a Goblin for the wrong simulator.

## Trigger for a future Nexus spike

Create a Nexus evaluation issue only when all of these are true:

- Standing Lab exists and is deterministic enough for repeatable experiments;
- we have a machine-readable experiment schema;
- Rapier headless simulation works;
- we are actually running enough experiments that throughput is limiting progress;
- the same candidate configuration can be represented in both Rapier and Nexus well enough for comparison.

A bounded Nexus spike should then answer:

1. how many Goblin-like environments can be stepped in parallel?
2. how close are results to Rapier for the same fixture?
3. what is the candidate ranking correlation between Nexus and Rapier?
4. what is setup/maintenance complexity?
5. does GPU batching materially beat simpler parallel Rapier CPU workers?
6. can the chosen target environment run it reliably?

If those answers are poor, keep the simpler Rapier experiment runner.

## Decision

For the current architecture review and subsequent Codex plan:

- **use Rapier only;**
- do not add Nexus, Parry, Kiss3d, nalgebra, Simba, Salva, Vortx or Khal as current dependencies;
- record Nexus as the strongest future Dimforge candidate for large-scale Physics Labs;
- revisit Salva/Nexus MPM only if deformable/fluid materials become a real gameplay goal;
- keep all other libraries as reference/infrastructure rather than roadmap commitments.

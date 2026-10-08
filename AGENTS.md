# Beat your Goblin - Agent Guide

## Project
Browser game built with Three.js, Rapier 3D and Vite.

- Repository: `bongohorse/goblin`
- Main: `main`
- Live: https://bongohorse.github.io/goblin/
- Node: >=24.21.0 <25
- Package manager: npm; install locked dependencies with `npm ci`
- Development port: 5174 (strict); preview: 4174
- VS Code / container setup: `docs/development/vscode.md`
- Keep Goblin tools/configuration scoped to this repo; do not modify MGD or global editor settings.
- Windows browser MCP is optional and disabled by default. Only enable it when Codex executes on Windows; Linux container browsers do not prove Windows GPU performance.
- Build: `npm run build`
- CI and GitHub Pages must stay green.

## Product direction: gameplay first

Read [Gameplay-first policy](docs/development/gameplay-first.md) for all new game and motion work. The goal is a responsive, locally real-time playable Goblin, not unassisted physics or machine learning at any cost. Clearly labelled animation, IK, balance assistance and hybrid motion are legitimate **gameplay** solutions. Their success must never be reported as full-dynamic Standing research evidence. Preserve experimental contracts and stop rules.

## Working style
Follow [Outcome-driven development](docs/agents/development-workflow.md).
Deliver one useful functional outcome per issue: implementation, ordinary in-scope repairs, targeted validation, internal review and draft PR are one work package. Gates are internal checkpoints, not automatic new tickets or user handoffs.

Before a frozen research run, use small real API/observer smoke checks within the issue's diagnostic budget. Validate measurement semantics and timing, not only synthetic data layouts. Distinguish technical invalidity from a valid negative behavioral result; neither justifies hidden tuning.

Run focused checks while developing and required tests/build at the final head. Repeat full checks or historical experiment reproductions only for a concrete changed risk, failure or disputed claim. Documentation-only work needs consistency/link review, not new physics or browser runs.

Report baseline versus candidate behavior and one next development lever. Tests green alone is not functional progress. Reuse existing evidence infrastructure and avoid duplicate reports or new manifests without a specific need.

Explicit issue budgets, frozen protocols, scope and release authorization remain binding. This workflow activates no stopped experiment. Do not mix unrelated cleanup with gameplay work.

## Agent skills
Repo-local skills live in `.agents/skills/`.

### Engineering workflow
- `to-tickets`: split a parent issue into agent-sized GitHub sub-issues
- `diagnosing-bugs`: reproduce, minimise, diagnose and lock down bugs
- `code-review`: review a PR/diff against issue scope and engineering risks
- `implement`: implement one issue/spec end-to-end
- `implement-spec`: explicitly requested multi-ticket orchestration with dependencies and isolated worktrees; preserve gate stops
- `pr`: write concise PR bodies with evidence and risk
- `retro`: user-requested session analysis and environment recommendations; no automatic configuration edits
- `domain-modeling`: clarify domain terms in `docs/GLOSSARY.md` and record consequential decisions
- `research`: investigate technical questions from primary sources
- `triage`: turn rough issues into agent-ready work
- `grill-me`: sharpen unclear product/design decisions
- `handoff`: leave compact continuation context

### Three.js game production
- `threejs-game-director`: coordinate gameplay, graphics, UI, audio, debugging and release work
- `threejs-gameplay-systems`: core loop, tools, input, Rapier physics, scoring, objectives and game feel
- `threejs-game-ui-designer`: HUD, menus, responsive layout, safe areas and touch UX
- `threejs-debug-profiler`: diagnose Three.js/runtime/input failures and measured performance bottlenecks
- `threejs-qa-release`: browser QA, production build, Pages verification and release evidence
- `threejs-audio-systems`: browser audio architecture, event-driven SFX, mixing and lifecycle

### Three.js core/runtime
- `threejs-scenegraph-transforms`: Object3D hierarchy, local/world transforms, parenting and transform ownership
- `threejs-render-loop-responsive`: renderer loop, canvas sizing, DPR, resize/orientation and frame timing
- `threejs-picking-interaction`: Raycaster/layers-based picking and interaction mapping
- `threejs-assets-loading`: LoadingManager, GLTFLoader and production asset-loading architecture
- `threejs-animation-mixer`: AnimationMixer/actions/clips and clean animation teardown
- `threejs-resource-lifecycle`: geometry/material/texture/render-target disposal and reset-safe cleanup
- `threejs-renderer-diagnostics`: renderer.info, draw calls, triangles, GPU-memory proxies and render diagnostics

Project dependency: `three ^0.186.1`. The official `mrdoob/three.js` `dev` branch can be ahead of or differ from the installed release, so agents must verify installed-version API compatibility before implementation.

### Three.js graphics
- `threejs-skill-router`: choose the smallest Three.js skill set for a visual/runtime task
- `threejs-camera-direction`: framing, follow cameras, transitions and camera constraints
- `threejs-procedural-animation`: frame-rate-independent authored transform motion
- `threejs-procedural-materials`: coherent PBR/material identity and filtered detail
- `threejs-procedural-geometry`: robust procedural props/arena geometry and mesh audits
- `threejs-procedural-vfx`: pooled hit VFX, particles, trails and emissive event effects
- `threejs-shadow-systems`: stable, budgeted shadows for the arena and moving camera
- `threejs-image-pipeline`: HDR, bloom, exposure, tone mapping and final image ownership
- `threejs-visual-validation`: deterministic visual QA and performance evidence

### Rapier physics
- `rapier-skill-router`: choose the correct Rapier physics skill and enforce version compatibility
- `rapier-ragdoll-joints`: body masses, colliders, anchors, joint limits and ragdoll tuning
- `rapier-interaction-queries-events`: impulses, grabbing, scene queries, collision/contact events and CCD
- `rapier-simulation-stability`: fixed timestep, sleeping, solver accuracy, scale and tunneling control
- `rapier-debug-reset-performance`: debug rendering, deterministic reset, lifecycle, leaks and physics profiling

Project dependency: `@dimforge/rapier3d-compat ^0.21.0`; `package-lock.json` currently resolves **0.21.0**. A matching upstream Rapier snapshot is pinned locally as the `vendor/rapier` submodule at tag `js-v0.21.0`, commit `b716d375efc0201003f0cd9ef7168eee0b62c177`. Read `docs/rapier/README.md` before external Rapier research. Prefer the installed package first, then the pinned local TypeScript bindings/user guide/source. If `vendor/rapier` is not initialized in the working tree, run `git submodule update --init --recursive` before Rapier research. Use current online docs/master only when the local reference is insufficient. Treat `vendor/rapier` as read-only and do not advance it independently of a scoped Rapier dependency upgrade.

Canonical fully dynamic standing/recovery research: `docs/research/active-ragdoll-standing-recovery.md`. Read it for physical Standing/Recovery research; it does not ban separately scoped assisted gameplay movement. Use `docs/development/gameplay-first.md` when deciding the product implementation.

Physics Lab workflow: `docs/development/labs.md`. Develop unresolved low-level physics behaviors in an isolated Lab before integrating them into the normal arena. The Standing Lab is mandatory for **fully dynamic standing research**, not a global blocker to a separate, clearly identified hybrid gameplay proof-of-fun.
Broader Physics Labs research/backlog: `docs/research/physics-labs-experiment-program.md` (Issue #31). Treat optimization, evolution and learned-control ideas there as deferred research unless a scoped issue explicitly activates them.

### Three.js WebGPU / TSL
- `threejs-webgpu-tsl`: optional WebGPU renderer and TSL/node-material work
- `threejs-webgpu-compute`: measured GPU-compute workloads such as large visual particle simulations
- `threejs-webgpu-resilience`: capability checks, fallback, device-loss handling and portability

WebGPU is optional. Do not replace the stable `WebGLRenderer` path unless a scoped issue explicitly requires it and target-browser evidence supports the change. Rapier remains the owner of gameplay physics.

GitHub Issues are the source of truth. See `docs/agents/issue-tracker.md`.

## Browser tools
- On native Windows, prefer the configured `chrome-devtools` MCP for console/network diagnosis, screenshots and performance traces. Use the existing project Playwright MCP or browser scripts for repeatable input/reset/pause checks. Confirm tool availability and the actual browser before acting; report failures instead of silently switching browsers.
- Read `docs/development/vscode.md` for setup. Keep absolute executable/profile paths local; do not change global configuration or the user's running devserver without task authorization.
- Record browser version, executable/profile identity, launch arguments, URL, viewport/DPR and rendering backend when relevant to acceptance. A connection smoke test does not establish gameplay, GPU performance or Hidden/Resume acceptance.
- Hidden/Resume acceptance requires observed native hidden and visible `visibilitychange` events and subsequent simulation progress. Synthetic events or disabled background throttling do not prove native behavior. Keep this separate from foreground performance runs.

## Game-specific checks
For gameplay, physics, rendering or input changes, verify behaviour as well as build output.

Pay special attention to pointer/touch input, Rapier body/joint stability, reset behaviour, camera clipping, mobile landscape layout, browser console errors and GitHub Pages asset paths.

For Three.js work, prefer a readable no-post baseline, bounded GPU cost, deterministic visual inputs where practical, and explicit disposal of temporary GPU resources.

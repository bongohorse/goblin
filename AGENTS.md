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

## Working style
Work in small, verifiable gates:
1. understand the issue and current code
2. implement the smallest complete change
3. run relevant checks
4. review against the issue
5. fix findings
6. only then move on

Do not mix unrelated cleanup with gameplay work.

## Agent skills
Repo-local skills live in `.agents/skills/`.

### Engineering workflow
- `to-tickets`: split a parent issue into agent-sized GitHub sub-issues
- `diagnosing-bugs`: reproduce, minimise, diagnose and lock down bugs
- `code-review`: review a PR/diff against issue scope and engineering risks
- `implement`: implement one issue/spec end-to-end
- `pr`: write concise PR bodies with evidence and risk
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

Project dependency: `@dimforge/rapier3d-compat ^0.21.0`. Upstream Rapier master is newer, so agents must verify the installed version before using APIs from current upstream docs/changelog.

### Three.js WebGPU / TSL
- `threejs-webgpu-tsl`: optional WebGPU renderer and TSL/node-material work
- `threejs-webgpu-compute`: measured GPU-compute workloads such as large visual particle simulations
- `threejs-webgpu-resilience`: capability checks, fallback, device-loss handling and portability

WebGPU is optional. Do not replace the stable `WebGLRenderer` path unless a scoped issue explicitly requires it and target-browser evidence supports the change. Rapier remains the owner of gameplay physics.

GitHub Issues are the source of truth. See `docs/agents/issue-tracker.md`.

## Game-specific checks
For gameplay, physics, rendering or input changes, verify behaviour as well as build output.

Pay special attention to pointer/touch input, Rapier body/joint stability, reset behaviour, camera clipping, mobile landscape layout, browser console errors and GitHub Pages asset paths.

For Three.js work, prefer a readable no-post baseline, bounded GPU cost, deterministic visual inputs where practical, and explicit disposal of temporary GPU resources.

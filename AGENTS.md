# Beat your Goblin - Agent Guide

## Project
Browser game built with Three.js, Rapier 3D and Vite.

- Repository: `bongohorse/goblin`
- Main: `main`
- Live: https://bongohorse.github.io/goblin/
- Node: 24
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

### Three.js graphics
- `threejs-skill-router`: choose the smallest graphics skill set for a visual task
- `threejs-camera-direction`: framing, follow cameras, transitions and camera constraints
- `threejs-procedural-animation`: frame-rate-independent authored transform motion
- `threejs-procedural-materials`: coherent PBR/material identity and filtered detail
- `threejs-procedural-geometry`: robust procedural props/arena geometry and mesh audits
- `threejs-procedural-vfx`: pooled hit VFX, particles, trails and emissive event effects
- `threejs-shadow-systems`: stable, budgeted shadows for the arena and moving camera
- `threejs-image-pipeline`: HDR, bloom, exposure, tone mapping and final image ownership
- `threejs-visual-validation`: deterministic visual QA and performance evidence

GitHub Issues are the source of truth. See `docs/agents/issue-tracker.md`.

## Game-specific checks
For gameplay, physics, rendering or input changes, verify behaviour as well as build output.

Pay special attention to pointer/touch input, Rapier body/joint stability, reset behaviour, camera clipping, mobile landscape layout, browser console errors and GitHub Pages asset paths.

For Three.js work, prefer a readable no-post baseline, bounded GPU cost, deterministic visual inputs where practical, and explicit disposal of temporary GPU resources.

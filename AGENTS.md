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

- `to-tickets`: split a parent issue into agent-sized GitHub sub-issues
- `diagnosing-bugs`: reproduce, minimise, diagnose and lock down bugs
- `code-review`: review a PR/diff against issue scope and engineering risks
- `implement`: implement one issue/spec end-to-end
- `pr`: write concise PR bodies with evidence and risk
- `research`: investigate technical questions from primary sources
- `triage`: turn rough issues into agent-ready work
- `grill-me`: sharpen unclear product/design decisions
- `handoff`: leave compact continuation context

GitHub Issues are the source of truth. See `docs/agents/issue-tracker.md`.

## Game-specific checks
For gameplay, physics, rendering or input changes, verify behaviour as well as build output.

Pay special attention to pointer/touch input, Rapier body/joint stability, reset behaviour, camera clipping, mobile landscape layout, browser console errors and GitHub Pages asset paths.

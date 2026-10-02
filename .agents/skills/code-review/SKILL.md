---
name: code-review
description: Review Goblin changes or a PR against both the originating issue and project quality risks such as physics, input, mobile layout, build and Pages.
---

# Code Review - Goblin
Review against a fixed base, normally `main`.

## Spec
Find the originating issue and report missing criteria, partial/incorrect behaviour, scope creep and contradictions.

## Engineering
Check especially:
- runtime errors and unsafe assumptions
- Three.js lifecycle/resource leaks
- Rapier body/joint creation, cleanup and reset
- pointer/touch parity
- mobile landscape regressions
- camera clipping/visibility
- unbounded spawned physics objects
- stale debug code
- Pages relative-path breakage
- CI/build regressions
- unnecessary duplication/blast radius

Run relevant checks. At minimum for code changes: `npm run build`.
For gameplay changes, verify the changed behaviour too.

Output `## Spec` and `## Engineering`. Include severity, location and reason. Do not invent findings.

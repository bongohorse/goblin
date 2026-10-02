---
name: threejs-visual-validation
description: Validate Beat your Goblin graphics with deterministic views, no-post baselines, camera-scale checks, temporal stability and mobile performance evidence.
---

# Visual Validation - Goblin

A single attractive screenshot is not enough.

## Validation sequence

1. Freeze a reproducible game/reset state where practical.
2. Capture/check a no-post baseline.
3. Inspect relevant diagnostic modes.
4. Check near, design and far camera distances.
5. Check extreme ragdoll poses.
6. Check motion for shimmer, popping and temporal artifacts.
7. Record frame-time/render-target/object-count evidence for expensive changes.
8. Check desktop and mobile landscape.

## Required evidence for significant graphics changes

- final view
- no-post view when post-processing changed
- at least one stress state
- browser console clean of new relevant warnings/errors
- production build passes
- written note of major performance trade-offs

## Rejection conditions

- effect only looks correct in one camera pose
- post processing hides broken base lighting/materials
- random visual state cannot be reproduced when debugging
- GPU-heavy feature has no quality fallback
- temporal artifact is judged only from a still
- resources grow continuously during repeated resets/rounds

---
name: threejs-shadow-systems
description: Tune stable, performant Three.js shadows for the compact Goblin arena with correct map coverage, bias, caster ownership and mobile quality tiers.
---

# Shadow Systems - Goblin

The arena is bounded, so prefer a well-tuned single directional shadow setup before advanced cascades.

## Workflow

1. Identify the receiver region actually visible to the camera.
2. Fit the directional shadow camera tightly to that region.
3. Choose map resolution from observed quality, not habit.
4. Tune normal bias/bias against acne and peter-panning.
5. Mark only meaningful meshes as casters/receivers.
6. Measure cost on mobile.
7. Add quality tiers before considering more shadow maps.

## Rules

- Do not render shadows for invisible/off-stage decorative objects unnecessarily.
- Keep shadow bounds stable under ordinary camera motion to avoid shimmering.
- Avoid giant frusta that waste texels.
- Increase map size only after fixing coverage/bias.
- Contact-looking darkness should not be faked by crushing global ambient light.
- If a static prop never moves, consider whether its contribution can be simplified.
- Any advanced multi-map/cascade approach needs evidence that the bounded arena cannot meet quality with one map.

## Acceptance

Check the Goblin at center, floor, near walls and during a throw. Confirm no obvious acne, detached shadows, severe shimmer or unacceptable mobile cost.

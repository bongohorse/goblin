---
name: threejs-render-loop-responsive
description: Build Beat your Goblin's Three.js render loop and responsive canvas correctly across desktop/mobile, DPR changes, resize/orientation and tab stalls.
---

# Three.js Render Loop & Responsive Canvas - Goblin

Use for animation-loop ownership, resize bugs, browser-height scaling issues, blurry/oversized rendering, orientation changes or frame-timing problems.

## One loop owner

There must be exactly one top-level render loop.

Current official Three.js examples commonly use `renderer.setAnimationLoop()`; a manual `requestAnimationFrame` loop can also work, but do not run both.

If changing loop style, treat it as an architectural change and verify physics timing.

## Separate clocks

- Rapier advances on its fixed physics step.
- Renderer runs at display cadence.
- authored visual animation uses seconds.
- large tab/background deltas are clamped.

Do not tie physics behaviour to monitor refresh rate.

## Responsive sizing

Official Three.js manual guidance distinguishes CSS display size from drawing-buffer size.

For Goblin:
1. size layout with CSS
2. derive the required drawing-buffer dimensions from displayed size
3. cap effective DPR for mobile/GPU cost
4. call renderer size update only when dimensions changed
5. update camera aspect + projection matrix
6. handle orientation/viewport-height changes

Avoid blindly multiplying every scene/gameplay dimension by browser height.

## Pixel ratio

Higher DPR increases fragment cost and render-target memory quickly.

Use a bounded policy, not unrestricted devicePixelRatio, especially on mobile.

## Resize acceptance

Test:
- desktop resize
- Android landscape rotation
- very short landscape viewport
- browser UI expanding/collapsing
- DPR/high-density display
- repeated resize without canvas growth or layout drift

## Failure signs

- canvas CSS size and drawing-buffer size diverge unexpectedly
- camera aspect updates but renderer size does not
- scene scale changes with viewport height
- multiple loops continue after reset/reinit
- huge catch-up after tab restore

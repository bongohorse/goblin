---
name: threejs-game-ui-designer
description: Design and implement Beat your Goblin HUD, menus, tool selection, overlays, responsive mobile landscape layout, safe areas and touch-friendly states.
---

# Three.js Game UI Designer - Goblin

Make UI readable, compact and subordinate to the Goblin interaction area.

## State inventory

When relevant account for:
- start
- active play
- selected tool
- score/combo/timer
- objectives
- help/onboarding
- pause/settings if added
- round end/retry
- loading/error states

## Rules

- UI reads authoritative game state; do not duplicate scoring or objective rules.
- Keep the Goblin and likely interaction zone unobstructed.
- Support safe-area insets on mobile.
- Required touch targets should be comfortable, not tiny icon-only hitboxes.
- Horizontal tool lists need intentional overflow/scroll behaviour.
- Use stable dimensions so score/combo changes do not shift the whole HUD.
- Verify longest likely text and largest numeric values.
- Provide selected, pressed, disabled and focus-visible states where applicable.
- Do not rely on hover for mobile affordance.
- Keep DOM UI separate from WebGL post-processing unless there is a strong reason otherwise.

## Mobile landscape checks

Check:
- short-height phone viewport
- safe-area edges
- toolbar reachability
- objectives not covering Goblin
- no accidental page scrolling/zoom during play
- orientation resize does not leave stale dimensions

## Evidence

For UI changes verify desktop + mobile landscape and the actual state transitions affected.

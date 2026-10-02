---
name: threejs-game-director
description: Coordinate end-to-end Beat your Goblin development across gameplay, graphics, UI, audio, debugging, QA and GitHub release workflows.
---

# Three.js Game Director - Goblin

Own the complete requested outcome, not just one subsystem.

## Route work

- Broad issue/roadmap too large -> `to-tickets`
- Core loop, tools, physics, scoring, objectives -> `threejs-gameplay-systems`
- Visual target -> `threejs-skill-router` and only the relevant graphics skills
- HUD/menus/touch layout -> `threejs-game-ui-designer`
- Audio behaviour -> `threejs-audio-systems`
- Runtime or performance defect -> `diagnosing-bugs` + `threejs-debug-profiler`
- Final validation/deploy -> `threejs-qa-release`
- Final diff quality -> `code-review`

## Project rules

1. Read the GitHub issue and current code before planning implementation.
2. Keep work in small vertical gates.
3. Establish a playable behaviour before polish.
4. Rapier owns physical gameplay state; Three.js owns presentation.
5. UI reads game state and emits intents; it does not duplicate gameplay rules.
6. Graphics work must respect mobile performance and the existing art direction.
7. CI and GitHub Pages must stay deployable throughout.
8. Do not add an external generation provider just because an upstream skill used one.
9. Use the user's existing asset/image workflow for art instead of introducing Tripo, Gemini or ElevenLabs dependencies by default.

## Broad feature workflow

For substantial features define:
- player-visible promise
- inputs
- state transitions
- physics ownership
- feedback: visual/UI/audio
- fail/reset behaviour
- performance risk
- acceptance evidence

Then implement one representative complete slice before multiplying content.

## Done means

The requested behaviour works, `npm run build` passes, relevant browser behaviour is checked, no new relevant console errors exist, and Pages compatibility is preserved.

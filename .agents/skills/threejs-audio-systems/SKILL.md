---
name: threejs-audio-systems
description: Design and integrate Beat your Goblin browser audio: event-driven SFX, ambience/music hooks, Web Audio lifecycle, volume groups, pooling, gesture unlock and mobile-safe cleanup.
---

# Three.js Audio Systems - Goblin

Audio should reinforce actual game events. Do not add sounds just to fill categories.

## Start from an event matrix

For each sound define:
- gameplay event
- sound role
- priority
- retrigger/cooldown rule
- volume group
- whether overlap is allowed
- lifecycle on reset/end

Likely Goblin events:
- light/medium/heavy impacts
- tool-specific contact
- thrown-object collision
- objective complete
- combo escalation
- round start/end
- UI selection/click

## Browser rules

- AudioContext must unlock from a user gesture.
- Resume suspended context when appropriate.
- Do not start required audio before unlock succeeds.
- Handle missing/failed assets without breaking gameplay.
- Stop or recycle loops on reset/restart.
- Keep master/SFX/music groups separate if music is introduced.
- Persist mute/volume only when the project intentionally adds settings.

## Performance

- Reuse decoded buffers.
- Bound simultaneous voices.
- Use cooldown/priority for rapid physics collisions.
- Avoid one sound per contact manifold tick.
- Prefer one meaningful impact event over noisy collision spam.

## Asset policy

This skill does not require ElevenLabs or another external generation service.
Use project-provided/generated assets when available. Temporary synthesis may be used for prototyping, but production SFX should be replaceable through a clean event-to-asset mapping.

## QA

Test through the real game event, not only by calling a sound function manually. Verify gesture unlock, rapid repeated hits, reset, round end and mute/volume if present.

---
name: threejs-animation-mixer
description: Manage imported Three.js AnimationMixer clips/actions for Beat your Goblin with deterministic state transitions and clean teardown alongside Rapier-owned gameplay motion.
---

# Three.js AnimationMixer - Goblin

Use for glTF keyframe/skeletal/morph animations. Do not use this skill for Rapier ragdoll motion itself.

## Ownership

Rapier remains authoritative for **dynamically simulated** ragdoll transforms. Explicitly handed-off animated/kinematic game states may have an animation owner; verify transitions and interruption, and do not treat them as fully dynamic Standing acceptance. See `docs/development/gameplay-first.md`.

AnimationMixer may own:
- non-physics character/cosmetic animation
- pre-hit/idle animation on a non-ragdoll visual rig
- facial/morph animation
- tool/prop animation
- transition animation before handing control to physics

Never let mixer and Rapier continuously write the same transform hierarchy.

## Mixer lifecycle

One mixer per intended animation root is usually clearer than hidden global mixers.

Track:
- root
- clips
- active actions
- update ownership
- cleanup ownership

Advance mixers with delta time in seconds.

## Actions

Use named semantic state transitions rather than starting clips ad hoc from arbitrary event handlers.

Examples:
- idle
- frightened
- hit-react visual layer
- round-end

Avoid restarting the same action every frame.

## Cleanup

Official AnimationMixer docs provide explicit cleanup APIs such as stopping actions and uncaching clips/roots.

When an animated asset is permanently replaced/unloaded:
1. stop relevant actions
2. uncache the root/clips as appropriate for the installed version
3. dispose the asset resources via `threejs-resource-lifecycle`
4. drop references

Resetting a round is not necessarily the same as destroying the animation asset.

## Acceptance

Verify:
- no duplicate mixers after reset
- expected clip state after replay
- animation speed independent of refresh rate
- no fight with Rapier transforms
- unloaded/replaced assets do not retain mixer references

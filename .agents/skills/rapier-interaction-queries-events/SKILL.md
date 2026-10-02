---
name: rapier-interaction-queries-events
description: Implement Beat your Goblin physics interactions with Rapier impulses, forces, scene queries, event queues, collision/contact events and CCD without duplicating physics in Three.js.
---

# Rapier Interactions, Queries & Events - Goblin

Use for hand dragging, punches, tools, projectiles, hit detection and collision-driven feedback.

## Forces vs impulses

- Use an impulse for an instantaneous hit.
- Use a force for sustained effects such as pulling, fan force or magnet-like influence.
- Apply at a point when torque from the contact location matters.
- Wake the body when the interaction should be immediate.
- If a Rapier version retains accumulated forces, reset/own them deliberately instead of assuming they clear automatically.

Verify exact method names for the installed version.

## Grabbing

A drag interaction needs one authoritative target body.

Good pattern:
pointer/touch intent -> choose collider/body -> compute world-space target -> apply bounded spring-like force or compatible joint -> release cleanly

Rules:
- use pointer capture
- cap force
- clear grab state on pointer-up/cancel/reset
- never drag the Three.js mesh independently of its rigid body

## Scene queries

Rapier JS supports physics-space queries such as ray casts, shape casts, point projection and intersection tests in current upstream bindings.

Use them when physics geometry should be authoritative, for example:
- selecting a collider
- line-of-action checks
- spawn-space validation
- proximity/overlap checks

Use filtering to exclude irrelevant bodies when supported by the installed version.

## Collision/contact events

Official Rapier JS uses an event queue with collider active-event flags for collision/contact-force events.

For Goblin:
- enable events only on colliders that need them
- drain/process the queue every relevant physics step
- map collider/body handles to semantic game entities
- convert raw events into named gameplay events once
- do not emit audio/VFX every solver/contact tick without cooldown/aggregation

If an event queue is configured not to auto-drain, failing to drain it can grow memory indefinitely.

## CCD

Use CCD for genuinely fast/thin bodies that tunnel through colliders, especially thrown objects.

Do not enable CCD on everything by default. It has a cost.

If a newer Rapier version offers soft/predictive CCD controls, use them only after confirming they exist in the installed package.

## Acceptance

Verify pointer and touch paths, direct hit, glancing hit, fast projectile, repeated contacts, release/reset and no duplicate score/audio event from one physical impact.

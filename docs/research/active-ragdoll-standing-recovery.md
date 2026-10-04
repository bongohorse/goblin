# Goblin Standing Foundation Research

**Status:** active research document  
**Last updated:** 2026-10-04  
**Current scope:** stable physical standing only  
**Related work:** Issue #15, Draft PR #29  
**Engine baseline:** Three.js 0.186.1, `@dimforge/rapier3d-compat` 0.21.0

## Current problem

The Goblin cannot yet stand reliably on its own.

That is the only problem this research document is trying to solve right now.

We are **not** currently solving:

- getting up from the floor;
- walking or running;
- stepping after large pushes;
- sitting;
- grabbing or carrying objects;
- hiding, fleeing or other AI behavior.

Those features depend on a stable physical body and are deferred until standing works.

## Goal

The Goblin must remain a fully dynamic physical ragdoll and stand reliably for **60 seconds** without:

- teleporting bodies;
- directly forcing transforms as a hidden correction;
- invisible supports or world anchors;
- resetting the character;
- disabling the physical ragdoll;
- relying on extreme force or friction as a brute-force workaround.

Small natural body motion is acceptable. The goal is not a perfectly frozen statue.

## Success criteria

A standing solution is accepted only when it:

1. survives 60 seconds in the standing fixture;
2. keeps both feet meaningfully loaded;
3. keeps the head and torso off the floor;
4. does not drift excessively across the floor;
5. keeps joint errors bounded;
6. uses bounded motor forces/torques;
7. remains fully dynamic and collision-reactive;
8. is repeatable across multiple runs;
9. has acceptable physics-step cost;
10. does not depend on a reset or recovery shortcut.

Exact numeric thresholds beyond the existing 60-second/stationary checks should be defined by the fixture before production adoption.

## Research rules

Use these labels:

- **PROJECT EVIDENCE** — reproduced with Goblin code/fixtures.
- **PRIMARY SOURCE** — supported by Rapier docs/source or a research paper.
- **EXTERNAL PATTERN** — used elsewhere but not proven for Goblin.
- **HYPOTHESIS** — plausible and still needs a Goblin experiment.
- **DEFERRED** — intentionally not part of the current standing problem.
- **REJECTED FOR NOW** — tested or considered and not justified as the current solution.

Test one meaningful variable at a time where practical.

Do not convert a hypothesis into production code before a bounded standing fixture proves it.

Before implementation, verify APIs against the installed `@dimforge/rapier3d-compat` version. Current upstream Rapier docs can differ from 0.21.0.

## What we already know

### Current rig

**PROJECT EVIDENCE**

The Goblin currently uses:

- 15 dynamic rigid bodies;
- 14 impulse joints;
- revolute limits on spine, neck, elbows, wrists, knees and ankles;
- spherical hips and shoulders without authored anatomical angular limits;
- self-collision between non-adjacent body parts;
- ball colliders for hands;
- cuboid colliders for feet;
- authored masses, damping and friction.

Source:
https://github.com/bongohorse/goblin/blob/57eb17c23884c6b8d94dd679b88447c2fc164f81/src/goblin-rig.js

### Solver convergence matters

**PROJECT EVIDENCE**

Earlier standing experiments showed that solver budget changes the result materially.

- Passive ragdoll falls.
- Joint motors alone were not enough for a durable stationary stance.
- Additional solver iterations improved standing strongly.
- The +16-iteration fixture reached the existing 60-second standing/stationary criterion.
- +12 iterations could remain standing for 60 seconds but still exceeded the previous stationary-drift threshold.

Conclusion:

**Constraint convergence is part of the standing problem.**

But +16 is fixture evidence, not yet a production setting.

### Friction alone is not the answer

**PROJECT EVIDENCE**

Increasing tested friction values to 2 did not solve the previous standing/recovery problems.

Conclusion:

**Do not treat higher friction as the primary standing solution.**

### More torque alone is not the answer

**PROJECT EVIDENCE**

The project has already shown that physically invalid or poorly supported poses cannot simply be forced into success with stronger actuation.

Conclusion:

**Do not solve standing by continuously increasing motor force.**

### Self-collision can invalidate apparently reachable poses

**PROJECT EVIDENCE**

A previous deep-flexion target was joint-reachable but produced approximately 18–20 mm torso/thigh overlap. It converged only when collision behavior was removed diagnostically.

Conclusion:

Any future standing pose or correction must remain physically collision-valid.

## Most promising standing architecture

The current leading hypothesis is to separate **pose control** from **balance control**.

```text
standing reference pose
        |
   joint PD motors
        |
  physical ragdoll
        |
 contacts + COM + velocity
        |
    balance controller
```

### 1. Joint PD for posture

**PRIMARY SOURCE — high confidence**

Rapier joint motors are PD-style controllers using target position/velocity, stiffness, damping and bounded force/torque.

Sources:
- https://rapier.rs/docs/user_guides/javascript/joints/
- https://rapier.rs/javascript3d/classes/SphericalImpulseJoint.html

Use joint motors as the Goblin's "muscles".

**HYPOTHESIS:** direct native per-axis spherical motor targets may be easier to tune and reason about than the current experimental technique of changing joint frames and driving toward zero.

This needs an isolated A/B test.

### 2. Pelvis/root balance controller

**PRIMARY SOURCE + HYPOTHESIS**

Rapier provides a PID controller for dynamic rigid bodies.

Source:
- https://rapier.rs/docs/user_guides/javascript/pid_controller/

A root/pelvis controller may stabilize the overall body while limb joints maintain the standing pose.

This must not teleport the pelvis or make it effectively kinematic.

Required experiment:

- joint PD only;
- joint PD + bounded pelvis/root PID;
- same initial pose and solver settings;
- compare survival, drift, COM motion, joint error and physical response.

### 3. Solver iterations

**PRIMARY SOURCE + PROJECT EVIDENCE**

Rapier exposes solver iteration controls, and higher iteration counts improve constraint accuracy at a CPU cost.

Source:
- https://rapier.rs/docs/user_guides/javascript/integration_parameters/

Required experiment:

Compare a bounded solver sweep such as:

`0 / 2 / 4 / 8 / 12 / 16` additional iterations.

Measure both standing quality and physics cost.

The goal is the **lowest solver budget that remains robust**, not simply the highest number.

### 4. Joint warm-starting

**PRIMARY SOURCE — installed-version verification required**

Current Rapier documentation describes joint warm-starting as useful for convergence of stiff impulse-joint assemblies.

Source:
- https://rapier.rs/docs/user_guides/javascript/integration_parameters/

First question:

Does installed Rapier 0.21.0 expose and support this setting exactly as documented?

If yes, test it independently before combining it with other changes.

### 5. Hip and shoulder limits

**PROJECT EVIDENCE + HYPOTHESIS**

Hips and shoulders currently use unrestricted spherical joints.

A standing character may be easier to stabilize if useless swing/twist configurations are physically bounded.

Required research:

- verify the installed 0.21.0 API for multi-axis angular limits;
- create a standing-only A/B fixture;
- compare unrestricted versus anatomically bounded hips/shoulders.

Do not mix this test with a new get-up controller.

### 6. Real support/contact measurements

**PRIMARY SOURCE**

Rapier exposes contact manifolds and solver-contact information.

Source:
- https://rapier.rs/docs/user_guides/javascript/advanced_collision_detection/

Standing diagnostics should measure:

- which foot is loaded;
- real contact points;
- support region;
- foot slip;
- COM position;
- COM velocity.

A binary "foot touching floor" signal is not enough.

## Research order

### R1 — Verify Rapier 0.21.0 APIs

Check the installed package for:

- spherical motor position/velocity APIs;
- per-axis motor force limits;
- PID controller support;
- solver/integration settings;
- joint warm-starting;
- multi-axis joint limits;
- contact-manifold data.

Deliverable: a compatibility table:

`feature | current Rapier docs | installed 0.21.0 | usable for Goblin`

### R2 — Establish one deterministic standing fixture

Use one known standing pose and one fixed simulation setup.

Record at least:

- fall/survival time;
- floor drift;
- COM trajectory;
- foot loads;
- pelvis/torso orientation;
- joint tracking error;
- maximum applied motor force/torque;
- physics-step cost.

This fixture becomes the common benchmark for every standing experiment.

### R3 — Test controller variables independently

Recommended order:

1. current motor approach baseline;
2. direct native spherical motor targets;
3. solver sweep;
4. joint warm-starting;
5. bounded hip/shoulder limits;
6. pelvis/root PID.

Do not stack several unproven changes in the first comparison.

### R4 — Combine only proven improvements

After isolated experiments identify improvements, combine the smallest useful set and rerun the complete 60-second standing acceptance test.

Only after that result is repeatable should a production standing controller be designed.

## Current decision

**Do not continue physical get-up development yet.**

Draft PR #29 demonstrated useful physics findings, but the Goblin still lacks a proven standing foundation.

The next work should answer:

> What is the smallest Rapier-based controller and solver configuration that lets the existing fully dynamic Goblin stand reliably for 60 seconds?

Until that question is answered, get-up work is deferred.

## Deferred work

These are intentionally outside the current research scope:

- push-recovery stepping;
- walking;
- running/sprinting;
- sitting;
- back/belly/side get-up;
- object manipulation;
- autonomous behavior and AI.

They should not influence the standing implementation unless a finding is directly necessary for stable standing.

## Open questions

- Does Rapier 0.21.0 expose joint warm-starting in the installed JS package?
- Can we drive spherical hips/shoulders directly with native per-axis motor targets?
- Can we give spherical hips/shoulders useful angular limits in 0.21.0?
- What is the minimum solver budget required for stable standing?
- Does root/pelvis PID materially improve balance without making the Goblin feel non-physical?
- Which standing failures are controller failures versus solver/convergence failures?
- What COM/contact measurements best predict an imminent loss of balance?
- Can the current 15-body rig stand robustly as designed, or does the rig itself require a bounded structural change?

## Source register

### Rapier

- Rigid bodies: https://rapier.rs/docs/user_guides/javascript/rigid_bodies
- Colliders: https://rapier.rs/docs/user_guides/javascript/colliders
- Joints: https://rapier.rs/docs/user_guides/javascript/joints/
- Joint constraints: https://rapier.rs/docs/user_guides/javascript/joint_constraints
- Integration parameters: https://rapier.rs/docs/user_guides/javascript/integration_parameters/
- PID controller: https://rapier.rs/docs/user_guides/javascript/pid_controller/
- Advanced collision detection: https://rapier.rs/docs/user_guides/javascript/advanced_collision_detection/
- SphericalImpulseJoint API: https://rapier.rs/javascript3d/classes/SphericalImpulseJoint.html

### Existing Goblin evidence

- Draft PR #29: https://github.com/bongohorse/goblin/pull/29
- G3 feasibility review: https://github.com/bongohorse/goblin/blob/57eb17c23884c6b8d94dd679b88447c2fc164f81/docs/development/g3-feasibility-review.md
- Goblin rig: https://github.com/bongohorse/goblin/blob/57eb17c23884c6b8d94dd679b88447c2fc164f81/src/goblin-rig.js

## Update protocol

When new standing research is performed:

1. record the source or fixture;
2. mark the evidence type;
3. record the result, including negative results;
4. state what it changes about the current standing hypothesis;
5. update the comparison/decision;
6. do not expand scope into get-up or locomotion until standing is accepted.

This file is the durable research memory for the current standing problem.

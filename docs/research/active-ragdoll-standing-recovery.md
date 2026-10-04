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

Detailed literature/industry review:
- `docs/research/standing-literature-review-2026-10-04.md`

Physics Lab workflow:
- `docs/development/labs.md`

**Development rule:** standing experiments must now run in the isolated Standing Lab, not in the normal gameplay arena. Build the Lab before the next controller A/B experiment.

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

The 2026-10-04 literature review sharpened the leading hypothesis:

> **Pose tracking is not balance control.**

SIMBICON shows this directly: local PD pose targets alone do not provide robust balance. Its controller adds world-space torso control and feedback from COM position and velocity. This is a better match for our problem than another get-up path or a hidden pelvis support.

```text
standing reference pose
        |
native joint motors ("muscles")
        |
fully dynamic ragdoll
        |
COM + COM velocity + foot contacts / CoP
        |
world-space torso + ankle/hip balance feedback
```

### 1. Motor model first: ForceBased vs AccelerationBased

**PRIMARY SOURCE + PROJECT CODE AUDIT — very high priority**

Current G3 experiments explicitly select `MotorModel.ForceBased`.

Rapier documents `MotorModel.AccelerationBased` as its default and says stiffness/damping are mass-scaled, which makes motors easier to tune across bodies with different masses.

Sources:
- https://rapier.rs/docs/user_guides/javascript/joints/
- https://github.com/dimforge/rapier/blob/master/bindings/typescript/src.ts/dynamics/impulse_joint.ts

**HYPOTHESIS:** `AccelerationBased` will give the heterogeneous Goblin rig more consistent joint response than the current force-based motor configuration.

This does not mean it will solve balance by itself. Test it first because it is small, native and directly relevant.

### 2. Direct native spherical motor targets

**PRIMARY SOURCE + HYPOTHESIS**

Rapier's TypeScript API exposes per-axis spherical motor position/velocity targets and per-axis torque caps.

Current G3 changes `frameX1` over time and drives motor coordinates toward zero. That method already converges in an unloaded Goblin diagnostic, but direct angular motor targets are a simpler native abstraction.

Required A/B:

- current frame-reorientation method;
- fixed frames + direct spherical angular targets.

### 3. World-space torso balance

**PRIMARY SOURCE + HYPOTHESIS — very high priority**

SIMBICON controls torso orientation relative to the world and realizes the desired effect through internal torques. It also modifies stance control from COM position and velocity.

Sources:
- https://www.microsoft.com/en-us/research/publication/simbicon-simple-biped-locomotion-control/
- https://www.microsoft.com/en-us/research/wp-content/uploads/2007/08/Yin_SIG07.pdf

For Goblin, test a bounded torso-upright controller that is physically realized through the torso/pelvis/hip chain.

Do **not** use an unpaired free world torque or invisible world anchor as the accepted production solution.

### 4. COM position + velocity feedback

**PRIMARY SOURCE + HYPOTHESIS**

For quiet stance, use horizontal COM offset and COM velocity to make small bounded adjustments to ankle/hip targets.

Conceptually:

`target = neutral + Kp_balance * COM_error + Kd_balance * COM_velocity`

This is a simplified game-oriented feedback law inspired by SIMBICON, not a reproduction of the full locomotion controller.

### 5. Contact pressure / support measurement

**PRIMARY SOURCE**

Biomechanics/animation research on ballet balance shows that center of pressure (CoP) can provide useful balance information beyond COM alone.

Sources:
- https://doi.org/10.1016/j.simpat.2006.09.009
- https://researchprofiles.ku.dk/en/publications/ballet-balance-strategies-2/

Use validated Rapier foot contact points and normal loads to log:

- COM;
- COM velocity;
- CoP;
- support polygon;
- left/right foot load;
- slip.

Initially this is diagnostic telemetry, not another controller.

### 6. Solver iterations remain a separate variable

**PRIMARY SOURCE + PROJECT EVIDENCE**

Rapier solves impulse-joint constraints iteratively. Goblin already shows that more solver work greatly reduces drift.

Source:
- https://rapier.rs/docs/user_guides/javascript/integration_parameters/

Keep controller quality and solver convergence separate. After a controller candidate exists, sweep solver budget and choose the lowest robust value.

### 7. Joint warm-starting is not currently an assumed JS knob

General Rapier documentation describes `warmstart_joints`, but the current public TypeScript `IntegrationParameters` wrapper inspected on 2026-10-04 does not expose `warmstartJoints`.

Source:
- https://github.com/dimforge/rapier/blob/master/bindings/typescript/src.ts/dynamics/integration_parameters.ts

Therefore do not plan around joint warm-starting unless the exact installed 0.21.0 runtime/API proves it accessible through a supported path.

### 8. Pelvis/root PID is a later experiment, not the first fix

Rapier includes a dynamic-body `PidController`, but a pelvis position controller can easily become a hidden world-space support.

Additionally, the upstream TypeScript source inspected on 2026-10-04 has suspicious `setKi`/`setKd` implementations that delegate to the raw `set_kp`; verify exact installed behavior before depending on live gain setters.

Sources:
- https://github.com/dimforge/rapier/blob/master/bindings/typescript/src.ts/control/pid_controller.ts
- https://github.com/dimforge/rapier/blob/master/bindings/typescript/CHANGELOG.md

Keep PID as a controlled later experiment, preferably angular-only first.

### 9. Hip limits remain a structural fallback

Hips and shoulders are currently unrestricted spherical joints. Anatomical limits may reduce wasted DOF, but they should be tested **after** the controller experiments above so we do not confuse controller and rig changes.

## Research order

### R1 — Build the isolated Standing Lab

Before further controller work, create the sterile Standing Lab defined in `docs/development/labs.md`.

It must exclude weapons, props, combat, AI, normal arena logic and unrelated gameplay UI. Use one deterministic standing fixture with no get-up logic.

Record:

- survival/fall time;
- floor drift;
- COM and COM velocity;
- foot loads/contact points;
- torso orientation;
- joint tracking error;
- torque saturation;
- physics-step cost.

### R2 — A/B Rapier motor model

Compare only:

- current `ForceBased`;
- `AccelerationBased`.

Keep rig, pose, timestep, contacts and solver budget fixed.

### R3 — A/B spherical target representation

Compare:

- current moving-frame method;
- direct native per-axis spherical motor targets.

### R4 — Add world-space balance

In this order:

1. bounded torso-upright control realized through physical internal torque logic;
2. bounded COM-position/velocity feedback into ankle/hip targets;
3. CoP/contact telemetry for diagnosis.

No pelvis position spring.

### R5 — Solver sweep

With the best controller candidate, measure the lowest solver budget that still satisfies the standing criteria.

### R6 — Structural changes only if necessary

Only if the existing rig still cannot stand robustly:

- hip angular limits;
- mass/inertia distribution;
- foot contact geometry;
- 60 Hz vs 120 Hz fixture.

Change one variable at a time.

### R7 — Combine only proven improvements

Run the full repeated 60-second acceptance fixture.

Only after that result is repeatable should a production standing controller be adopted.

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

- Does `AccelerationBased` materially improve standing versus the current `ForceBased` motors?
- Are direct spherical angular targets more stable under load than the current moving-frame method?
- Can a SIMBICON-style world-space torso controller stabilize the Goblin using only physically realizable internal torque logic?
- What COM-position/velocity gains create a quiet standing attractor without making the body rigid?
- Does CoP telemetry explain drift or impending falls better than COM alone?
- What is the minimum solver budget required after the controller is improved?
- Can spherical hips receive useful limits through a supported 0.21.0 API, or only through raw/internal access?
- Is joint warm-starting available through any supported installed JS 0.21.0 surface?
- Can the current 15-body rig stand robustly as designed, or does it eventually require a bounded mass/inertia/contact change?

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

### Character-control research and industry references

- Detailed review: `docs/research/standing-literature-review-2026-10-04.md`
- SIMBICON: https://www.microsoft.com/en-us/research/publication/simbicon-simple-biped-locomotion-control/
- Stable PD controllers: https://faculty.cc.gatech.edu/~turk/my_papers/stable_pd.pdf
- Ballet balance strategies: https://doi.org/10.1016/j.simpat.2006.09.009
- Virtual Model Control: https://doi.org/10.1177/02783640122067309
- Rockstar on Euphoria as a behavior system: https://www.rockstargames.com/newswire/article/ak14o88381o725/asked-answered-max-payne-3-la-noire-red-dead-and-more.html
- EA/Frostbite driven ragdolls: https://www.gdcvault.com/play/1025210/Physics-Driven-Ragdolls-and-Animation

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

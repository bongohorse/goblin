# Physics Labs

**Status:** project development rule  
**Purpose:** isolate and validate complex physical behavior before game integration.

## Principle

Complex physics features are developed and proven in small, sterile **Labs** before they are integrated into the normal game arena.

A Lab is not a second game level. It is a controlled experiment environment built for one question.

The normal arena contains weapons, props, gameplay UI, camera behavior, AI, interaction systems and additional colliders. Those systems make physics failures harder to diagnose and increase the number of uncontrolled variables.

Labs deliberately remove that noise.

## Rule

> **Build and validate the physical primitive in a Lab first. Integrate it into gameplay only after the Lab acceptance criteria pass repeatedly.**

Do not use the main arena as the primary development environment for unresolved low-level physics behavior.

## Lab design requirements

A Lab should be:

- **single-purpose** — one physical question at a time;
- **minimal** — only geometry and systems required for the experiment;
- **deterministic** where practical — same initial state, fixed timestep, repeatable inputs;
- **observable** — expose the measurements needed to understand failure;
- **resettable** — fast, exact reset to the initial state;
- **independent of gameplay UI** — no weapon HUD, objectives or unrelated controls;
- **cheap to run** — suitable for repeated automated/headless tests when possible;
- **disposable visually** — debug geometry is preferred over production art.

A Lab may use special diagnostics and controls that never ship in the game.

It must not silently use helpers that invalidate the physical question being tested. Diagnostic cheats are allowed only when explicitly labelled as such and must not count as acceptance evidence.

## Suggested layout

Labs should have independent entry points/routes and shared reusable diagnostics where useful.

Examples:

- `standing`
- `push-recovery`
- `walking`
- `get-up`
- `grabbing`
- `object-interaction`

These names describe future possibilities, not current implementation priorities.

## Current first Lab: Standing

The first and only current Lab priority is **Standing**.

Question:

> What is the smallest Rapier-based controller and solver configuration that lets the existing fully dynamic Goblin stand reliably for 60 seconds?

The Standing Lab should initially contain only:

- flat floor;
- one Goblin;
- fixed deterministic starting pose;
- fixed physics timestep;
- pause;
- resume;
- single-step;
- exact reset;
- physics/debug rendering;
- test configuration controls;
- measurement/readout panel.

No weapons, boxes, combat, AI, normal arena logic or gameplay objectives.

## Standing Lab measurements

### Primary standing metric

Standing time is measured from simulation start until the **first floor contact by any Goblin body part other than the feet**.

- Foot-floor contacts are allowed and expected.
- The first hand, knee, shin, pelvis, torso, head, arm or other non-foot floor contact ends the run.
- Record the exact elapsed time for every run.
- **60.0 seconds or more is the full Standing Lab success condition.**
- Shorter runs remain valid measurements for regression and A/B comparison; they are not separate pass gates.

Expose at minimum:

- standing time as defined above;
- pelvis and torso orientation;
- center of mass;
- center-of-mass velocity;
- left/right foot normal load;
- foot contact points;
- floor drift from start;
- joint tracking error;
- motor/torque saturation where available;
- solver configuration;
- physics-step timing.

Add center of pressure (CoP) once validated contact-force data is available.

## Experiment discipline

For A/B tests:

1. freeze the Lab starting state and all unrelated settings;
2. change one meaningful variable;
3. run the same acceptance measurement;
4. record both positive and negative results;
5. only combine variables after isolated evidence exists.

Examples for the Standing Lab:

- `ForceBased` vs `AccelerationBased`;
- moving spherical joint frames vs direct angular motor targets;
- balance feedback off vs on;
- solver-budget sweeps.

## Integration gate

Passing a Lab does not automatically mean the feature is finished.

After Lab acceptance:

1. integrate the proven primitive into the normal game;
2. verify that gameplay systems do not break it;
3. run game-world QA separately.

If integration fails, return to the Lab only when the failure is inside the physical primitive. Do not contaminate the Lab with unrelated game systems just to reproduce arena behavior.

## Current scope decision

For the present G3 work:

- build the Standing Lab first;
- stop further get-up work;
- use the Lab for all standing-controller research;
- do not resume broader physical abilities until stable standing is proven.

Canonical standing research:
- `docs/research/active-ragdoll-standing-recovery.md`
- `docs/research/standing-literature-review-2026-10-04.md`


## Broader experiment program

The long-term Labs research backlog, including multi-rig comparison, automated experiment runners, parameter sweeps, evolutionary optimization and deferred learning approaches, is documented in:

- `docs/research/physics-labs-experiment-program.md`
- GitHub Issue #31

Do not expand a concrete Lab implementation to cover that entire backlog unless a reviewed issue explicitly scopes it.

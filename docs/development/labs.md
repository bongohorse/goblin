# Physics Labs

**Status:** project development rule  
**Purpose:** isolate and validate complex physical behavior before game integration. Separate scientific Standing acceptance from assisted gameplay development; see [Gameplay-first policy](gameplay-first.md).

## Principle

Complex physics features are developed and proven in small, sterile **Labs** before they are integrated into the normal game arena.

A Lab is not a second game level. It is a controlled experiment environment built for one question.

The normal arena contains weapons, props, gameplay UI, camera behavior, AI, interaction systems and additional colliders. Those systems make physics failures harder to diagnose and increase the number of uncontrolled variables.

Labs deliberately remove that noise.

## Rule

> **Validate an unresolved low-level physical primitive in a Lab before claiming that primitive is proven or integrating it as proven physics.** A separately scoped, explicitly assisted or animated gameplay prototype may be tested without passing the full-dynamic Standing research gate.

An exploratory game-motion slice belongs in a small controlled gameplay scene, **not** in a frozen scientific fixture and not as an untested full-arena integration. Specify permitted assistance, animation/physics handoffs, obstruction/interruption cases and game QA. This does not change the scientific rig, thresholds or existing experiment stops.

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

A research Lab must not silently use helpers that invalidate the physical question being tested. Diagnostic supports are permitted only as explicitly labelled non-acceptance controls. Gameplay assistance is permitted in a separate labelled prototype and cannot be counted as unassisted research acceptance.

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

The first and only currently active **fully dynamic physical-research Lab** priority is **Standing**. This does not prevent separately approved small gameplay/hybrid prototypes.

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
- Record the elapsed simulation time and termination reason for every run.
- **60.0 seconds or more passes the Standing *time criterion*, not necessarily full Standing acceptance.** Meaningful support, bounded drift/joints/effort, repeatability and acceptable cost remain mandatory under #30; see [Glossary](../GLOSSARY.md).
- Shorter runs remain valid measurements for regression and A/B comparison; they are not separate pass gates.

Report observed duration, termination reason and first non-foot contact separately. If a valid run stops without observing that contact (including timeout or a drift stop), its contact time is right-censored at the observed duration, not a measured fall time. A drift-limit violation remains an acceptance FAIL even if no contact occurs; whether observation stops or continues is determined only by the scoped protocol. Invalid measurements provide no valid contact-time bound. Contact times are resolved at the fixture's fixed-step/observer resolution, not an exact continuous collision instant. Preserve historical exports and measurement versions; this clarification does not change schemas, thresholds or stop rules.

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

Passing a scientific Lab does not automatically mean the feature is game-ready. Conversely, a separately tested assisted gameplay feature need not pass the unassisted Standing research gate; its own collision, interaction and performance checks still apply.

After Lab acceptance:

1. integrate the proven primitive into the normal game;
2. verify that gameplay systems do not break it;
3. run game-world QA separately.

If integration fails, return to the Lab only when the failure is inside the physical primitive. Do not contaminate the Lab with unrelated game systems just to reproduce arena behavior.

## Current scope decision

For the currently scoped **fully dynamic G3 research**:

- keep the Standing Lab as the first fully physical research environment;
- defer fully dynamic get-up research until a separate authorization/acceptance path exists;
- use the Standing Lab for unassisted standing-controller experiments;
- keep existing Standing/Recovery research gates, budgets and stops unchanged.

**This restriction does not prohibit** a separate, explicitly assisted gameplay proof-of-fun for getting up, walking or other behaviors. Such a prototype uses its own small test scene and game QA, declares aids/ownership, and does not claim successful unassisted Standing. Coordinate any masterplan/gate amendments explicitly instead of reinterpreting archived measurements.

Canonical standing research:
- `docs/research/active-ragdoll-standing-recovery.md`
- `docs/research/standing-literature-review-2026-10-04.md`


## Broader experiment program

The long-term Labs research backlog, including multi-rig comparison, automated experiment runners, parameter sweeps, evolutionary optimization and deferred learning approaches, is documented in:

- `docs/research/physics-labs-experiment-program.md`
- GitHub Issue #31

Do not expand a concrete Lab implementation to cover that entire backlog unless a reviewed issue explicitly scopes it.

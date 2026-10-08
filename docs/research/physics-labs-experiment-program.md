# Physics Labs Experiment Program

**Status:** design/research backlog for review before implementation  
**Last updated:** 2026-10-04  
**Current execution priority:** Standing Lab / Issue #30  
**Purpose:** create a controlled environment for developing, measuring and comparing **unassisted physical** Goblin behavior before accepting it as proven physics. Gameplay hybrid solutions follow [gameplay-first policy](../development/gameplay-first.md).

## Core idea

The project should treat difficult physical behavior as an experimental problem.

Instead of repeatedly changing the Goblin inside the full arena, build small sterile Labs where one physical question can be reproduced, measured and compared.

The Labs should eventually support:

- multiple rig variants;
- multiple controller variants;
- deterministic replay;
- automated headless experiments;
- parameter search;
- evolutionary optimization;
- later, if justified, learned controllers.

This is not a commitment to use AI or machine learning in production.

The immediate purpose is much simpler:

> **Make physics failures measurable, reproducible and comparable.**

## Why Labs

The normal game arena contains many variables that are irrelevant to low-level physics research:

- weapons;
- props and boxes;
- combat state;
- AI;
- gameplay UI;
- camera behavior;
- interaction systems;
- extra colliders;
- recovery/get-up logic;
- other runtime systems.

Those variables make it harder to identify the actual cause of a failure.

The Lab approach isolates a physical primitive before claiming it has been proven by research. Assisted/animated gameplay prototypes may independently demonstrate game value without being counted as unassisted physical evidence.

Canonical Lab rules:
- `docs/development/labs.md`

Standing research:
- `docs/research/active-ragdoll-standing-recovery.md`
- `docs/research/standing-literature-review-2026-10-04.md`

Dimforge ecosystem evaluation:
- `docs/research/dimforge-ecosystem-evaluation-2026-10-04.md`

## Current primary metric: Standing Time

For the Standing Lab, the primary outcome is deliberately simple.

**Standing Time = elapsed simulation time until the first ground contact by any Goblin body part other than a foot.**

Rules:

- timer starts when the simulation starts;
- feet may contact the floor normally;
- first non-foot ground contact ends the run;
- exact elapsed time is recorded;
- every failed run remains useful data;
- **60.0 seconds or more = Standing time criterion met; full research acceptance still needs the #30 support, drift, joint, force, repeatability and cost requirements.**

Examples:

- 3.2 s = failed run, useful measurement;
- 18.7 s = failed run, strong improvement over a 5 s baseline;
- 59.9 s = failed acceptance gate but highly informative;
- 60.0+ s = time criterion met; check all other research gates before claiming full Standing acceptance.

Secondary metrics must help explain *why* one run is better, but they should not replace the primary 60-second success definition unless we later deliberately revise the benchmark.

## Lab architecture

### One common harness

Prefer one reusable Lab/test harness instead of unrelated experimental applications.

Shared capabilities should include:

- deterministic reset;
- fixed timestep;
- pause/resume;
- single physics step;
- simulation clock;
- debug render toggles;
- telemetry capture;
- result export;
- experiment configuration;
- headless execution where possible.

Individual Labs then provide only the environment and behavior needed by their question.

### Isolated physics worlds

When comparing several rigs/controllers, do not place them together in the same Rapier world unless the experiment explicitly requires interaction.

Preferred comparison modes:

1. separate Rapier worlds in independent Lab instances; or
2. run variants sequentially with exactly the same fixture; or
3. run headless variants in isolated simulations.

Reasons:

- no accidental inter-rig collisions;
- no shared solver island effects;
- cleaner timing measurements;
- easier deterministic reproduction;
- easier attribution of failures.

### Visual quality

Labs are engineering tools.

Prefer:

- debug shapes;
- simple materials;
- labels;
- graphs;
- vectors;
- contact markers.

Do not spend production-art time on Lab presentation unless it directly improves diagnosis.

## Standing Lab — first implementation

Issue #30 owns the first implementation.

Initial contents:

- flat floor;
- one Goblin;
- deterministic starting pose;
- fixed physics timestep;
- exact reset;
- pause/resume;
- single-step;
- debug bodies/colliders/joints;
- Standing Time;
- telemetry panel.

Explicitly exclude:

- weapons;
- arena props;
- combat;
- AI;
- grabbing;
- walking;
- get-up;
- production HUD;
- hidden support.

## Multiple rig strategy

Testing several rigs can produce useful data faster than betting everything on one construction.

However, the comparison is only valid if differences are controlled.

### Recommended initial rig families

**Rig A — clean baseline**

A clean rebuild of the current intended humanoid structure with no inherited G3 recovery logic.

**Rig B — mass/inertia variant**

Same topology/controller as A, but controlled mass/inertia changes.

Question:

> Is the current mass/inertia distribution a major source of instability?

**Rig C — joint/limit variant**

Same as A except for explicitly defined hip/shoulder/other angular constraints.

Question:

> Are unrestricted or poorly chosen degrees of freedom making standing unnecessarily difficult?

**Rig D — contact geometry variant, later**

Same controller/rig parameters except feet/contact geometry.

Question:

> Is standing primarily limited by foot-ground contact geometry?

Do not create all variants at once unless the harness makes the differences explicit and automated.

### Comparison rule

A meaningful A/B test changes one principal variable.

Bad comparison:

- Rig A uses ForceBased, large feet and 16 extra iterations;
- Rig B uses AccelerationBased, small feet, new masses and COM feedback.

A better comparison:

- identical everything;
- only motor model differs.

## Controller experiments

Candidate experiments already supported by research:

### C1 — ForceBased vs AccelerationBased

Current G3 explicitly uses Rapier `MotorModel.ForceBased`.

Rapier's `AccelerationBased` model is mass-scaled and is a strong candidate for a heterogeneous articulated body.

High priority.

### C2 — spherical target representation

Compare:

- current moving-frame spherical motor method;
- fixed joint frames with direct native per-axis angular motor targets.

### C3 — world-space torso balance

SIMBICON-style principle:

- joint motors maintain posture;
- a separate world-space balance controller keeps the torso upright;
- correction must be physically realizable and bounded.

### C4 — COM feedback

Use:

- horizontal COM position relative to support;
- COM velocity;

to make small bounded ankle/hip corrections.

### C5 — CoP/contact feedback

Measure contact-force-weighted center of pressure once validated Rapier contact-force data is available.

Start as telemetry.

Only promote it into control logic if evidence shows it improves balance.

### C6 — solver sweep

Test solver budget separately from controller changes.

Goal:

> lowest solver cost that supports a good controller.

Do not define "more iterations" as the controller itself.

## Diagnostic Labs

These Labs may intentionally violate the final gameplay constraints because their purpose is to isolate causes.

They must be clearly labelled **diagnostic only** and cannot count as successful Standing evidence.

### Minimal lower-body Lab

Start with:

- pelvis;
- two upper legs;
- two lower legs;
- two feet.

If this simplified system cannot achieve controlled stance, adding arms/head will only increase ambiguity.

Possible progression:

1. lower body;
2. torso;
3. head;
4. arms.

This helps locate the body subsystem that introduces instability.

### 2D balance Lab

Constrain the experiment to a single balance plane:

- first forward/backward;
- then left/right;
- finally full 3D.

This can make ankle/hip feedback much easier to understand.

### Fixed-feet diagnostic

Temporarily constrain feet to the floor.

Purpose:

- isolate joint/controller instability from contact/slip instability.

This is **not** a valid Standing solution.

### Ideal-contact diagnostic

Use simplified or artificially reliable foot support.

Purpose:

- determine whether the controller works when contact uncertainty is removed.

Again: not valid final Standing evidence.

### Passive dynamics Lab

Disable active control and observe how the rig collapses from controlled initial poses.

Useful for:

- natural stability;
- mass distribution;
- joint limits;
- contact geometry;
- identifying strongly unstable body configurations.

### System-identification Lab

Apply controlled commands to individual joints/bodies and measure response.

Questions:

- how quickly does each joint respond?
- where does it saturate?
- how much damping is needed?
- do nominally similar limbs respond similarly?

This can replace some blind gain tuning with measured controller parameters.

## Telemetry

Every Standing experiment should eventually record enough data to explain the result.

### Primary

- Standing Time;
- first non-foot contact body part;
- failure time.

### Body state

- COM position;
- COM velocity;
- pelvis orientation;
- torso orientation;
- angular velocity;
- floor drift.

### Contacts

- left/right foot contact state;
- contact points;
- normal loads;
- slip velocity;
- support polygon;
- CoP when supported by validated data.

### Controller

- target joint angles;
- actual joint angles;
- joint tracking error;
- requested motor effort;
- saturation;
- balance corrections.

### Simulation

- timestep;
- motor model;
- solver settings;
- body/rig version;
- controller version;
- physics-step CPU cost;
- experiment seed/config ID.

## Failure classification

Do not record only "fell".

Classify the first useful failure cause where possible.

Candidate categories:

- forward fall;
- backward fall;
- left/right side fall;
- foot slip;
- foot unload;
- ankle collapse;
- knee collapse;
- hip collapse;
- torso loss;
- joint-limit conflict;
- self-collision;
- motor saturation;
- solver/constraint instability;
- excessive drift;
- unknown.

The classification can begin coarse and become more precise when telemetry supports it.

## Replay and reproducibility

### Deterministic seeds

If randomness enters any experiment, record a seed.

The same configuration + seed should reproduce the same run closely enough for debugging.

### Telemetry replay

Prefer storing compact numeric traces over video-only evidence.

Useful traces:

- COM;
- body orientations;
- contact loads;
- joint errors;
- motor commands;
- failure event.

A visual replay can later reconstruct or accompany these traces.

### Result records

Each automated run should eventually produce a machine-readable record such as:

```text
experiment_id
rig_id
controller_id
config
seed
standing_time
failure_class
secondary_metrics
physics_cost
```

The exact format should be designed before automation work.

## Automated search approaches

Automation should progress from simple and interpretable to powerful and complex.

### 1. Manual controlled A/B

Best first step.

One variable changes.

Reasoning remains transparent.

### 2. Grid / parameter sweep

Automatically evaluate bounded sets of:

- stiffness;
- damping;
- torque caps;
- balance gains;
- solver settings.

Advantages:

- easy to understand;
- easy to reproduce;
- useful for low-dimensional tuning.

Disadvantage:

- scales poorly with many parameters.

### 3. Random search

Sample bounded parameter ranges.

Often more efficient than a large grid when only some dimensions matter strongly.

### 4. Classical numerical optimization

Potential future options include optimizers designed for noisy/nonlinear parameter spaces.

Only introduce them after the score and deterministic harness are trustworthy.

### 5. CMA-ES / Evolution Strategies

Strong candidate for continuous controller parameters.

Population cycle:

1. generate parameter candidates;
2. simulate each candidate;
3. score;
4. retain/update distribution from better candidates;
5. produce next generation.

Potential targets:

- joint gains;
- balance gains;
- torque caps;
- mass/inertia tuning ranges;
- stance parameters.

This may be a much better first "evolutionary" method than evolving neural networks.

### 6. Genetic Algorithms

Useful when variables include discrete structural choices as well as numeric values.

Could eventually explore controlled changes to:

- joint limits;
- controller structure;
- foot/contact design;
- selected rig parameters.

Strong guardrails are needed so evolution does not exploit invalid cheats.

### 7. Neuroevolution / NEAT

A neural controller receives state such as:

- COM offset;
- COM velocity;
- torso angle;
- joint angles/velocities;
- foot contacts/loads;

and outputs bounded joint/balance commands.

The network itself is evolved.

Interesting, but significantly less interpretable than classical controller tuning.

**Deferred until deterministic classical control has been exhausted or a clear gameplay benefit exists.**

### 8. Reinforcement Learning

Potentially powerful for balance, recovery and locomotion.

Possible future rewards:

- alive/standing time;
- upright posture;
- support quality;
- low drift;
- low energy;
- target movement.

Risks:

- substantially more infrastructure;
- reward hacking;
- difficult debugging;
- training cost;
- sim-to-game integration complexity;
- lower interpretability.

**Not recommended for the current Standing problem.**

### 9. Curriculum learning

If learning methods are eventually used, difficulty can increase gradually.

Example:

1. broad stable stance;
2. normal stance;
3. low disturbance;
4. stronger disturbance;
5. uneven support.

This is a training strategy, not a replacement for the final 60-second Standing benchmark.

## Fitness and scoring

### Initial rule

Keep the first optimization objective as close as possible to the actual goal:

> maximize Standing Time, capped at 60 seconds.

Why:

- hard to game;
- easy to understand;
- directly comparable to manual tests.

### Secondary/tie-breaker metrics

Once multiple candidates reach similar Standing Times, consider:

- lower drift;
- lower torque/energy;
- lower physics cost;
- lower average joint error;
- more centered support.

Do not prematurely create a giant weighted score that hides whether the Goblin actually stands.

### Pareto optimization

Later, candidates can be compared on multiple dimensions instead of collapsing everything into one arbitrary score.

Example Pareto objectives:

- maximize standing time;
- minimize drift;
- minimize motor effort;
- minimize CPU cost.

This can expose trade-offs such as:

> candidate A is very stable but rigid/expensive; candidate B is slightly less stable but much cheaper and more physical.

## Tournament / generation workflow

A future experiment runner could support:

```text
population
   |
parallel/sequential isolated simulations
   |
fitness + failure telemetry
   |
ranking / selection
   |
mutation / optimization
   |
next generation
```

For example:

- 20 candidates;
- retain top 5;
- mutate around them;
- repeat.

The actual population size should come from measured simulation cost, not from a fixed design assumption.

## Headless simulation

This is a high-value future capability.

If the Rapier controller can run without Three.js rendering:

- experiments become faster;
- many variants can run automatically;
- CI/research runs become possible;
- visualization becomes optional rather than mandatory.

The visible Lab remains useful for understanding failures.

The headless runner is for throughput.

## Shadow controllers

Another possible research technique:

- one controller actually drives the physical Goblin;
- alternative controllers calculate what they *would* have commanded from the same observed state;
- their outputs are logged but not applied.

This cannot fully predict their resulting future trajectory, so it is not a substitute for isolated simulation.

It can still be useful for inspecting controller disagreement and catching extreme commands.

## Perturbation Lab — after Standing

Once Standing is solved, use standardized impulses to measure robustness.

Examples:

- front push;
- back push;
- side push;
- different impulse magnitudes/heights.

Same impulse should be replayable.

Possible metrics:

- remains standing;
- recovery time;
- maximum COM excursion;
- non-foot contact;
- number of corrective steps.

This **fully dynamic research** extension is explicitly after the current Standing gate. Separate gameplay push reactions can be prototyped earlier with labelled assists and their own acceptance.

## Future Lab families

Possible future isolated environments:

- Standing;
- Push Recovery;
- Walking;
- Get-up;
- Grabbing;
- Object interaction;
- Impact/reaction;
- Climbing/bracing.

These are backlog ideas, not permission to expand the current scope.

## Research-derived controller ideas

The literature review provides the conceptual foundation:

### SIMBICON

Key lesson:

- pose tracking alone is not balance;
- control torso in world space;
- use COM position and velocity feedback;
- realize correction through physical/internal actuation.

### Stable PD

Key lesson:

- stronger PD gains are not automatically better;
- discrete simulation stability matters;
- native stable/mass-aware motor formulations are worth preferring over brute-force gains.

### Center of Pressure

Key lesson:

- contact load distribution can explain balance better than a binary "feet touching" state.

### Euphoria / shipped-game architectures

Key lesson:

- physics body + pose/muscles + balance/reaction behaviors are separate layers;
- exact Rockstar/NaturalMotion algorithms are proprietary and must not be invented.

### Three.js + Rapier references

Open implementations show useful patterns such as:

- fixed-step simulation;
- anatomical limits;
- inertia-aware torque;
- explicit torque caps;
- extra solver iterations.

But assisted pelvis/foot world springs are diagnostic references, not acceptable proof of unassisted Standing for our goal.

## Guardrails against false success

An optimizer will exploit whatever the score allows.

Therefore a 60-second result is **invalid as unassisted Standing research acceptance** if achieved by:

- teleporting bodies;
- writing transforms as hidden correction;
- kinematic conversion;
- invisible floor/world joints;
- external world-space support spring acting as a crutch;
- disabling relevant collisions;
- freezing DOFs that the tested rig is supposed to possess;
- extreme friction used as glue;
- unbounded force/torque;
- resetting before failure;
- changing the floor/test conditions for one candidate.

Diagnostic experiments may deliberately use some of these mechanisms, but must be labelled and excluded from acceptance.

## Suggested program phases

### Phase 0 — Lab infrastructure

Build reusable isolated Lab harness.

### Phase 1 — Clean Standing baseline

Issue #30.

Rebuild and measure the physical standing foundation from scratch.

### Phase 2 — Controlled rig/controller comparisons

Introduce a small number of deliberate variants.

Keep one-variable A/B discipline.

### Phase 3 — Automated experiment runner

Machine-readable configurations/results, deterministic runs, headless mode where practical.

### Phase 4 — Parameter optimization

Start with:

1. grid sweeps;
2. random search;
3. CMA-ES / evolution strategies if justified.

### Phase 5 — Structural/evolutionary experiments

Only after the harness and score are trusted:

- genetic rig/controller variation;
- Pareto selection.

### Phase 6 — Learned control research

Only if classical/evolutionary control cannot reach the desired game behavior or learned movement itself becomes a product goal:

- neuroevolution;
- reinforcement learning;
- curriculum learning.

## Decisions that should be made before Codex implementation

A higher-level review should decide:

1. exact Lab URL/module architecture;
2. how much code the clean rig may share with current production rig;
3. whether Lab experiments live in the main Vite app or a separate entry;
4. canonical result schema;
5. fixed timestep for the first Lab;
6. exact failure-contact detection rules;
7. which two or three rig variants are worth implementing first;
8. whether headless simulation is part of Issue #30 or a later issue;
9. which telemetry is mandatory in v1;
10. where experiment result artifacts should live;
11. how Lab-proven code graduates into production;
12. which optimization methods belong in the near-term roadmap.

## Dimforge ecosystem decision

For the current Labs program:

- keep Rapier as the runtime and acceptance physics engine;
- do not add other Dimforge libraries now;
- keep Nexus on the future research list for GPU-batched simulation, evolutionary search or RL;
- if Nexus is ever used as a search accelerator, revalidate all finalists in real Rapier because the solvers are not identical;
- do not add Parry separately unless a future Rust-native analysis tool requires it;
- keep Three.js instead of Kiss3d;
- ignore nalgebra/Simba directly in the browser project;
- revisit Salva or Nexus MPM only if fluids/deformable materials become a concrete gameplay feature;
- treat Vortx/Khal as lower-level infrastructure that Nexus should own for us unless a future scoped task proves otherwise.

Detailed evaluation:
- `docs/research/dimforge-ecosystem-evaluation-2026-10-04.md`

## Current recommendation

Do **not** start with neural networks or reinforcement learning.

Build the experimental infrastructure first.

The recommended progression is:

```text
Standing Lab
   ->
deterministic benchmark
   ->
controlled rig/controller A/B tests
   ->
automated parameter sweeps
   ->
CMA-ES / evolutionary optimization if useful
   ->
learned controllers only if there is a demonstrated reason
```

The Labs themselves are the high-value investment. Every later technique becomes easier and safer once the same harness can reproduce, measure and compare physical behavior.

# Goblin Standing Foundation Research

**Status:** active research document  
**Last updated:** 2026-10-07
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

The primary metric is **time until first non-foot ground contact**:

- start timing when the standing simulation begins;
- allow normal foot-floor contact;
- stop at the first floor contact by any other Goblin body part;
- record the exact elapsed time for every run;
- **60.0 seconds or more = full standing success**;
- shorter times are useful comparison data, but are not passing gates.

A standing solution is accepted only when it:

1. reaches 60.0 seconds without any non-foot body part contacting the floor;
2. keeps both feet meaningfully loaded;
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
- [Modern character-control shortlist, 2026-10-07](modern-character-control-2026-10-07.md): learned control, contact-guided planning and recovery references, with explicit transfer and evidence limits.

### Modern control literature update — 2026-10-07

**PRIMARY SOURCE + HYPOTHESIS + DEFERRED.** Newer work supports investigating contact-aware planning, learned joint control and reusable motion priors. PartwiseMPC, the 2022 get-up work, HumanUP, AdaptNet and the 2026 SMP/InstantMimic/LYRIC results are documented in the shortlist. None establishes standing on our Rapier rig or resolves the finite-step measurement blocker. Keep classical internal torso/COM feedback as the near-term hypothesis; a separately scoped MimicKit feasibility audit is a later option, not training authorization. Get-up and locomotion remain deferred, and existing gate stops/acceptance criteria remain unchanged.

Physics Lab workflow:
- `docs/development/labs.md`
- broader experiment program: `docs/research/physics-labs-experiment-program.md` / Issue #31

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

### R1b - Verify native actuation before motor-model A/B

**PROJECT EVIDENCE - Issue #41**: installed 0.21.0's spherical factory returns a
GenericImpulseJoint (type6) without motor methods. The publicly declared spherical
wrapper constructor provides the same-handle view used by the PR29 reference; no
physics masks or targets are changed. See standing-lab/motor-contract.md for the
version-specific adapter, positive/negative tracking and indirect first-step angular
momentum cap/reaction fixtures. Full-rig actual motor effort is unavailable through
supported getters and must remain N/A rather than inferred from contact-contaminated
angular velocity. Complete native ForceBased baseline first; motor-model A/B remains
a separately scoped follow-up. This is actuation evidence, not standing acceptance. The full
neutral motor gate is blocked:100/12/20 fails the existing .05 rad joint-limit bound
at step110/ankleL; the single predeclared cap-only reduction to1 Nm fails at
step140/elbowR (.072396600 rad). Both standing_time values are null. Do not change
the passive numerical bounds or pursue A/B/balance before diagnosing that loaded-chain
constraint error. See motor-contract.md and the diagnostic script for the handoff.

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

### R3 target representation evidence — 2026-10-05 / Issue52

[Controlled spherical-target study](standing-lab/target-study52/README.md): pinned
Rapier0.21.0 rigid-body angular motor coordinates are 2asin of canonical relative
quaternion components, not Euler angles.144 real small-target tracking fixtures
(signs/axes/combined targets, different world/bind frames, q/-q) support the bounded
mapping. Global/pi/multibody control is not certified. Fixed and MovingFrame share
the tested equilibrium but have different axes/cap boxes/error fields and measured
nonzero transient trajectories; they are not generally dynamically interchangeable.
All20 neutral full-rig runs reproduce exactly: cap20=60s timeout, cap1=187-step
hand contact, no stability gain. Passive/v2/v3 regressions have zero deviation.
A strict rotated-body momentum-oracle precision miss remains negative/undiagnosed;
common-frame cap diagnostics pass without changing thresholds. Retain MovingFrame
and ForceBased as references; fixed-native remains a bounded research candidate.
No balance feedback, production integration, full standing or recovery acceptance.

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

### Issue #43 candidate validation (2026-10-04)

Separately hashed motor-solver-candidate-v1 configurations (caps20/1, solver8/32)
keep passive-v1/solver8 unchanged. Five fresh normal plus five separate diagnostic
continuations per case: solver8 repeats110/ankleL and140/elbowR invalids; solver32
both caps reaches60s diagnostics within the unchanged .05/.08 bounds.20 Nm normal
times out60s;1 Nm normal ends at187/hand contact (3.1166666666666667s), subsequent
head impact192 is included only in the diagnostic continuation. Median matched
early-segment world.step cost is about3.3x solver8 on Windows/Ryzen5600X; no dedicated
motor CPU budget or weak-device/browser acceptance established. See
[full candidate decision](standing-lab/motor-solver43.md). Suitable numerical candidate
for a separately authorized next Lab integration; #41 remains stopped, no merge.

### Issue #42 diagnosis (2026-10-04)

The #41 motor-rig blocker is a real limit breach, confirmed by an independent
matrix/tangent angle oracle. A five-body pelvis/torso/left-leg diagnostic reproduces
kneeL failure at step70 under the existing solver8 and neutral ForceBased100/12/20.
No floor, spherical motors off, or diagnostic solver32 removes that breach through180
steps; self-contact off leaves it identical. This supports a loaded coupled-constraint
convergence/compliance explanation; engine-row residuals and the separate1 Nm elbow
impact are not fully resolved. See [cause report and decision proposal](standing-lab/motor-cause-42.md).
Candidate decision is a separately versioned motor-only solver32 experiment, never a
passive-baseline replacement or accepted stand result. No local command/measurement
fix proven; #41 remains stopped pending an explicit decision and new continuation order.

### Issue #44 integration (2026-10-04)

#44 explicitly accepts the #43 Solver32 candidate only in the separately versioned
native ForceBased Motor Lab. Passive v1/Solver8 remains unchanged. Five normal20 Nm
runs reach60s, five1 Nm runs end at step187/both hands; original passive checkpoints
match with deviation0. Clean built browser confirms both normal terminal behaviors,
fresh-world lifecycle and versioned exports. Full-rig actual effort/saturation stays
unavailable. See [integration report](standing-lab/motor-integration-44.md).
60s is solely a time criterion: nonzero drift/tracking and no complete secondary
criteria mean no complete standing acceptance. Native hidden transition, weak-device
and production CPU budgets remain open. Next step is separate Draft-PR review;
model A/B, balance and recovery remain separate future work. No production integration.

When new standing research is performed:

1. record the source or fixture;
2. mark the evidence type;
3. record the result, including negative results;
4. state what it changes about the current standing hypothesis;
5. update the comparison/decision;
6. do not expand scope into get-up or locomotion until standing is accepted.

This file is the durable research memory for the current standing problem.


### Issue #48 controlled motor model comparison (2026-10-04)

Preregistered ForceBased versus AccelerationBased100/12 on frozen Solver32 rig,
physical per-axis caps20/1 validated against installed0.21.0 and pinned source.
Exactly one analytical AB2343.75/281.25 pair matches isolated isotropic scalar
response, not all rig inertias. Five normal runs each: FB20=3600/60s, FB1=187/both
hands; AB100/12=69/73 handL; calibrated AB=252/242 head. All valid/reproducible;
20 separate original-gain post-contact worlds valid through3600, StandingTime=null.
Passive and v2-FB checkpoints unchanged (deviation0). ABcal1's longer time has
mixed support/drift/joint metrics; ABcal20 loses support and drifts farther. Retain
ForceBased, no consistent AB winner or complete standing approval. Matched60-step
Node physics medians ~.329ms FB, .351?.353ms AB100/12, calibrated close with host
variability. Clean Windows built browser matches all six; native hidden/GPU/weak
device/production budgets and actual motor effort remain unavailable/unaccepted.
See [full evidence and decision](standing-lab/model-ab48.md). No balance controller,
default switch, merge or deployment; any further experiment needs explicit scope.

## 2026-10-07 — isolated internal torso torque (#60)

**PROJECT EVIDENCE, BLOCKED VALIDATION:** [Protocol](standing-lab/torso-torque60-protocol.md) and [minimal blocker/decision](standing-lab/torso-torque60/README.md). Five fresh identical first-step sets: anisotropic rotated-principal-frame instantaneous torque-impulse mapping passes, but continuous torque and offset shoulder-constraint responses miss the frozen initial-frame velocity/momentum oracle. That oracle is a linearized initial response, while pinned Rapier integrates32 substeps with evolving orientation and gyroscopic terms; its Float32-only acceptance-resolution argument is insufficient. No engine defect or controller instability established, no tolerance changes, no upright/FullRig-balance experiment or adoption. Diagnose independent finite-step reference/resolution first; keep MovingFrame/ForceBased100/12/Solver32 and original #54 strict-false result. A later FullRig torso A/B still needs secondary standing criteria and pose-motor conflict policy before COM feedback.

## 2026-10-07 — independent finite-step review (#66/#68)

**PROJECT EVIDENCE:** [Stacked review and separate decisions](standing-lab/review68/README.md). Independent matrix/world-angular-momentum and quaternion Newton/Euler references agree within the fixed reporting budget in12 controls/17 torque cases.425 fresh discrete measurements confirm canonical residuals1.05603e-4rad/s and1.25510e-6kg*m²/s and nonmonotone refinement; no universal Float32 floor/engine defect. The historical PRE misses/#54 remain unchanged. Original frame preregistration and tensor-bound wording have explicit errata. Continuous endpoint and contemporaneous POST spin+orbital H are suitable comparison objects, not controller acceptance. Recommend only restricted research merge after fixes/CI; #60 stays stopped until a separate physically justified Gate-B budget/protocol decision. No upright/COM/FullRig experiment.

### Issue #72 measurement requirements — 2026-10-07

[Versioned Torso Gate-B protocol and decision](standing-lab/gate-b72/README.md) separates application accuracy, reference verification, input representation and engine integration/constraint error. Independent capsule/zero-speed mobility and principal-axis sensitivities provide conditional measurement ceilings from the existing .01rad/.02rad/s/6s contract, not thresholds fitted to residual maxima. One preregistered fixed free-versus-connected one-step attribution (five fresh worlds each) associates residuals with connection, but does not isolate ERP/roundoff or establish a domain-wide engine envelope. A corrected torso-specific bias screen exceeds neither the existing physical purpose nor grants positive acceptance; the initially mismatched arm-axis screen is retained as withdrawn.

Decision: Gate B/#60 remains blocked. Physical error allocation, applied-cap representation policy and a valid observable/engine envelope are still missing; protocol fields remain null and cannot pass. Historical False/native#54 evidence unchanged. Draft research only, no small-upright/Standing/COM/FullRig experiment, automatic continuation or physical approval.

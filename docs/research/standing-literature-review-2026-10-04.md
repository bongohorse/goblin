# Standing Literature & Industry Review — 2026-10-04

**Question:** How should a fully dynamic Goblin be controlled so it can stand reliably without hidden supports, teleporting, or turning the ragdoll kinematic?

**Scope:** **unassisted, fully dynamic Standing research only**. Walking, get-up, object interaction and autonomous behavior are deferred **within this research sequence**, not forbidden as separate assisted gameplay prototypes. See [gameplay-first policy](../development/gameplay-first.md).

This note records external research and implementation evidence that directly changes the standing investigation. It complements the canonical summary in `docs/research/active-ragdoll-standing-recovery.md`.

## Executive conclusion

The strongest pattern across character-control research, shipped-game technology, and active-ragdoll implementations is:

> **Pose tracking is not balance control.**

A biped can accurately drive every local joint toward a standing pose and still fall. Robust physical characters typically add a second feedback layer that reasons about the body relative to the world and its support contacts.

For Goblin, the most promising standing architecture is therefore:

```text
reference standing pose
        |
native joint motors ("muscles")
        |
fully dynamic articulated body
        |
COM + COM velocity + foot contacts / pressure
        |
world-space torso / ankle / hip balance feedback
```

The first experiments should remain fully physical and use **internal joint/body torques**, not a hidden world spring holding the pelvis in place.

A second strong finding is Rapier-specific: the current G3 experiments explicitly select `MotorModel.ForceBased`, while Rapier documents `AccelerationBased` as its default motor model and says its stiffness/damping are mass-scaled, making it easier to tune. Goblin has strongly varying body masses and inertias, so this deserves an early isolated A/B test.

## 1. SIMBICON: the clearest controller blueprint

**Evidence:** PRIMARY SOURCE  
**Paper:** KangKang Yin, Kevin Loken, Michiel van de Panne, *SIMBICON: Simple Biped Locomotion Control*, SIGGRAPH 2007.

Sources:
- https://www.microsoft.com/en-us/research/publication/simbicon-simple-biped-locomotion-control/
- https://www.microsoft.com/en-us/research/wp-content/uploads/2007/08/Yin_SIG07.pdf

### What matters for Goblin

SIMBICON starts with ordinary target poses controlled by PD servos. The authors explicitly state that this pose graph has **no notion of balance** and therefore does not produce robust locomotion by itself.

They add two ideas that are directly relevant to our standing problem:

1. **World-space torso control.**  
   Torso orientation is controlled relative to the world, rather than only as a local parent-relative joint target.

2. **Balance feedback using COM position and velocity.**  
   Desired joint targets are modified from feedback based on horizontal COM displacement and COM velocity. The paper specifically notes this structure can be used for stance-ankle feedback in quiet standing.

The paper also takes care that the virtual torso torque is realized through **internal torques**, rather than applying a free external world torque.

### Consequence for Goblin

Our standing controller should not be only:

`local standing pose -> joint motors`

It should contain a separate, measurable world-space balance layer.

**High-priority hypothesis:**

- keep a standing reference pose;
- calculate torso upright error in world space;
- calculate horizontal COM offset and COM velocity relative to loaded feet;
- modify ankle/hip targets or generate physically paired internal torques;
- keep all torque bounded.

This is closer to a proven biped-control architecture than using a pelvis position spring tied to the world.

## 2. Stable PD controllers: why stronger springs can make things worse

**Evidence:** PRIMARY SOURCE  
**Paper:** Jie Tan, Karen Liu, Greg Turk, *Stable Proportional-Derivative Controllers*, IEEE Computer Graphics and Applications, 2011.

Sources:
- https://faculty.cc.gatech.edu/~turk/my_papers/stable_pd.pdf
- https://doi.org/10.1109/MCG.2011.30

### Finding

Ordinary PD control couples tracking accuracy to numerical stability: high gains improve pose tracking but can destabilize a discrete simulation unless the timestep becomes very small.

Stable PD (SPD) changes the formulation so control is based on a prediction of the next state. The paper demonstrates stable high-gain tracking at substantially larger timesteps than conventional PD.

### Consequence for Goblin

We should not interpret "the ragdoll is too floppy" as evidence that stiffness simply needs to be raised.

Goblin already shows a similar warning sign:

- stronger constraint solving changes standing dramatically;
- forcing invalid poses does not work;
- high controller effort can fight contacts instead of solving balance.

We are not going to implement the paper's full articulated SPD solver inside Rapier at this stage. Instead, this paper motivates testing Rapier's own more stable/native motor models before writing custom high-gain torque controllers.

## 3. Rapier motor model: AccelerationBased deserves an immediate A/B test

**Evidence:** PRIMARY SOURCE + PROJECT-SPECIFIC CODE AUDIT

Sources:
- https://rapier.rs/docs/user_guides/javascript/joints/
- https://github.com/dimforge/rapier/blob/master/bindings/typescript/src.ts/dynamics/impulse_joint.ts
- https://github.com/dimforge/rapier/blob/master/bindings/typescript/CHANGELOG.md

Rapier provides:

- `MotorModel.AccelerationBased`
- `MotorModel.ForceBased`

Rapier documents `AccelerationBased` as the default. Its stiffness and damping are scaled by the rigid-body masses, which Rapier says makes it easier to tune. `ForceBased` applies absolute forces/torques, so response depends more directly on body mass.

Current G3 experimental code explicitly selects:

`MotorModel.ForceBased`

for both revolute and spherical joint motors.

### Why this matters

Goblin is a heterogeneous articulated system: head, torso, pelvis, hands, arms, legs and feet have very different masses and moments of inertia.

A single set of force-based gains therefore does not imply a consistent angular response across the body.

This does **not** prove that `ForceBased` caused the standing failure. It does make the following experiment unusually well justified:

### Experiment M1

Compare:

- current `ForceBased` motor baseline;
- `AccelerationBased` motors;

with the same rig, standing pose, timestep, collision configuration and solver budget.

Record:

- 60 s survival;
- drift;
- COM trajectory;
- torso angular error;
- joint tracking errors;
- foot loads/slip;
- torque saturation;
- physics-step cost.

If necessary, use a small bounded gain sweep for each model rather than assuming identical numerical gains are equivalent.

**Priority: very high.**

## 4. Direct spherical motor targets are available

**Evidence:** PRIMARY SOURCE / UPSTREAM SOURCE AUDIT

Current Rapier TypeScript source exposes, per spherical angular axis:

- `configureMotorModel(axis, model)`
- `configureMotorPosition(axis, targetPos, stiffness, damping)`
- `configureMotorVelocity(...)`
- `configureMotor(...)`
- `setMotorMaxForce(axis, maxForce)`

Source:
https://github.com/dimforge/rapier/blob/master/bindings/typescript/src.ts/dynamics/impulse_joint.ts

Current G3 instead changes `frameX1` over time and drives motor coordinates toward zero. Existing Goblin diagnostics prove that this can converge in an unloaded fixture, so it is not automatically wrong.

However, direct per-axis motor targets are the clearer native abstraction for a standing "muscle" controller.

### Experiment M2

A/B:

- current frame-reorientation approach;
- fixed joint frames + direct angular motor targets.

Do this only in the standing fixture, without get-up code.

**Reason:** remove one custom control transformation before tuning a complete balance system.

## 5. Constraint convergence is a separate problem from balance control

**Evidence:** PRIMARY SOURCE + PROJECT EVIDENCE

Rapier impulse joints are solved iteratively. Insufficient convergence produces constraint error. Rapier exposes solver iteration controls because accuracy and CPU cost trade off.

Sources:
- https://rapier.rs/docs/user_guides/javascript/joint_constraints
- https://rapier.rs/docs/user_guides/javascript/integration_parameters/

Goblin's existing standing evidence is unusually strong:

- more solver work greatly reduces drift;
- +16 additional iterations reached the prior stationary criterion;
- +12 was close but still above the previous drift threshold.

### Consequence

Do not tune controller gains and solver iterations at the same time.

We need to distinguish:

- **control failure:** commands do not create a stable balance attractor;
- **solver failure:** good commands exist, but constraints are not converging accurately enough.

### Important Rapier JS caveat: joint warm-starting

Current general Rapier documentation describes `warmstart_joints` and says it noticeably improves convergence for stiff impulse-joint assemblies.

However, the current public TypeScript `IntegrationParameters` wrapper inspected on 2026-10-04 does **not** expose a `warmstartJoints` property, even though the general documentation describes it.

Source:
https://github.com/dimforge/rapier/blob/master/bindings/typescript/src.ts/dynamics/integration_parameters.ts

Therefore joint warm-starting should **not** be treated as an immediately available JavaScript knob. Verify the installed 0.21.0 package before any attempt to use a raw/internal API. Do not build standing around an undocumented bridge.

This downgrades warm-starting from "high-priority experiment" to "API verification / optional".

## 6. Center of pressure: COM alone is not enough

**Evidence:** PRIMARY SOURCE  
**Paper:** Camilla Pedersen, Kenny Erleben, Jon Sporring, *Ballet balance strategies*, 2006.

Sources:
- https://doi.org/10.1016/j.simpat.2006.09.009
- https://researchprofiles.ku.dk/en/publications/ballet-balance-strategies-2/

### Finding

The paper compares balance based only on center of mass with a strategy based on center of pressure (CoP) and argues that controlling pressure/contact distribution is useful for simulated balance.

The model defines:

- support polygon from foot-ground contact points;
- COM from body-part masses and positions;
- CoP from contact locations weighted by normal forces.

It also notes that COM velocity matters.

### Consequence for Goblin

Our standing diagnostics should compute not only:

- COM position;
- support polygon;

but also a simple **contact-force-weighted center of pressure** from validated foot contact manifolds.

That gives us a better answer to:

> Is the Goblin actively shifting support under its body, or is it merely still inside the broad geometric footprint?

### Experiment B1

Log in both horizontal axes:

- COM;
- COM velocity;
- CoP;
- support-polygon edges;
- left/right foot normal load;
- torso orientation.

Do this before inventing more complex balance heuristics.

## 7. Virtual Model Control: useful concept, dangerous shortcut

**Evidence:** PRIMARY SOURCE  
**Paper:** Jerry Pratt et al., *Virtual Model Control: An Intuitive Approach for Bipedal Locomotion*, 2001.

Source:
https://doi.org/10.1177/02783640122067309

Virtual Model Control represents balance goals using virtual springs/dampers and maps those desired effects into joint torques.

This is conceptually useful because it separates:

- "what effect do we want on the body?"
- from
- "which physical joints must produce it?"

### Goblin rule

For **scientific unassisted Standing acceptance**, a virtual model is acceptable **only if its output is realized through physical internal torques/contact reactions**. An assisted gameplay prototype has different, explicitly labelled acceptance rules.

A literal world-space spring that pulls the pelvis to an invisible target can make a demo stand, but it violates our current success definition if that spring acts as hidden support.

Use world/pelvis springs only as **diagnostic conditions for this unassisted experiment**, not as unreported evidence of fully physical Standing. They may be considered as **openly declared, bounded gameplay assists** under separate collision, interruption and performance QA.

## 8. What shipped games actually tell us

### Euphoria / GTA / Red Dead / Max Payne

**Evidence:** INDUSTRY PRIMARY/SECONDARY SOURCES

Rockstar explicitly describes Euphoria as a **behavior system**, separate from RAGE physics. Rockstar says Max Payne 3 built on behaviors used in GTA IV and Red Dead Redemption.

Source:
https://www.rockstargames.com/newswire/article/ak14o88381o725/asked-answered-max-payne-3-la-noire-red-dead-and-more.html

NaturalMotion's public material describes procedural motion synthesis using a physical body plus motor/behavior control. Publicly exposed GTA NaturalMotion message APIs include concepts such as:

- active pose;
- body relaxation;
- balance configuration;
- bracing for impact;
- catching falls.

Useful public API reference:
https://github.com/scripthookvdotnet/scripthookvdotnet/blob/main/source/scripting_v2/GTA.NaturalMotion/Euphoria.cs

### Important limitation

The exact GTA/RDR standing and balance algorithms are proprietary.

We should **not** pretend we know their internal PD gains, solver setup or foot controller.

The useful lesson is architectural:

> physics body + pose/muscle control + separate behaviors such as dynamic balance and bracing.

That matches the controller decomposition suggested by the academic literature.

### Red Dead-specific design lesson

Public interviews indicate Red Dead intentionally tuned behavior differently from GTA: some reactions "ride" the momentum and fall rather than always fighting to stay upright.

This matters later for game feel, but not yet for standing acceptance.

### Black & White

The Black & White postmortem is valuable for autonomous creature AI and learning, but it does **not** provide evidence for a powered-ragdoll standing controller. Its creature work relied heavily on AI and animation blending.

Source:
https://www.gamedeveloper.com/design/postmortem-lionhead-studios-i-black-white-i-

Therefore Black & White is inspirational for the future Goblin mind, not a current standing implementation reference.

## 9. Games built around permanently physical characters

### Gang Beasts

A Gang Beasts developer describes their custom character system as a **constant ragdoll controlled with forces**, effectively a physics puppet.

Source:
https://discussions.unity.com/t/official-physics-improvements/619788/24

This validates our overall direction: a game character can remain physically simulated continuously rather than switching to physics only on death.

It does not provide enough technical detail to copy a standing algorithm.

### Human: Fall Flat

The developer has publicly said that early versions used PID + IK research, but the final approach evolved into a custom force-response system intended to resemble muscles. They also cite the Overgrowth procedural-animation work as influential.

Sources:
- https://nobrakesgames.itch.io/human/comments
- https://steamcommunity.com/app/477160/discussions/0/358417008729560708/

Two useful lessons:

1. fully physical characters are practical in shipped games;
2. expect iterative controller design instead of one magic PID formula.

### Grow Home

Ubisoft describes BUD as physics-based and procedurally animated, adapting to arbitrary environment geometry without conventional predefined movement animation.

Source:
https://news.ubisoft.com/en-us/article/7fDmgKCCwWJQtyoVoOvvGM/get-ready-to-grow-home

Again: proof of the design direction, not a direct standing recipe.

### EA/Frostbite driven ragdolls

EA presented driven ragdolls as a production technique for characters that follow intended animation while still reacting physically, with specific attention to animation following, bad-pose prevention, performance and feedback.

Source:
https://www.gdcvault.com/play/1025210/Physics-Driven-Ragdolls-and-Animation

This supports treating pose following and physical reaction as first-class systems that require their own validation.

## 10. Open-source implementation comparisons

These are implementation references, not authoritative proofs.

### ashlev/ActiveRagdoll

Repository:
https://github.com/ashleve/ActiveRagdoll

The implementation uses a master/target skeleton and physical slave ragdoll:

- rigid-body COM is pulled toward master COM using PD force;
- joints track master rotations;
- force and torque are capped;
- angular joint limits are enabled;
- strength can be modulated.

Lesson:

A common active-ragdoll architecture separates **root/COM position following** from **joint rotation following**.

For Goblin, we should copy the separation, not necessarily the external root-position force.

### Stick & Steel — especially useful stack comparison

Repository:
https://github.com/Rabneba/stick-steel

This is a browser Three.js + `@dimforge/rapier3d-compat` active-ragdoll project, currently using Rapier 0.19.

Its physics source contains several useful implementation ideas:

- fixed 120 Hz simulation;
- extra solver iterations;
- anatomical angular limits;
- quaternion-error angular control;
- torque scaled by the body's full principal inertia tensor;
- explicit torque caps.

Source:
https://github.com/Rabneba/stick-steel/blob/main/lib/rig/physics.ts

However, its standing controller also applies explicit physical spring forces that hold the pelvis and supported feet near stance targets, including vertical gravity compensation.

Its own README describes the system as **assisted physical recovery**.

Therefore:

**Useful reference for control math and diagnostics; not acceptable proof of an unassisted Goblin standing solution.**

An interesting connection is that its inertia-aware torque calculation pursues a similar goal to Rapier's `AccelerationBased` motor: making rotational response less dependent on the body's raw inertia/mass.

## 11. Rapier PID controller: useful, but not the first experiment

Rapier includes `PidController` in the JS bindings and added it as a building block for dynamic character control.

Sources:
- https://github.com/dimforge/rapier/blob/master/bindings/typescript/CHANGELOG.md
- https://github.com/dimforge/rapier/blob/master/bindings/typescript/src.ts/control/pid_controller.ts

It can apply angular and linear corrections to dynamic bodies.

However, the upstream TypeScript source inspected on 2026-10-04 contains a suspicious implementation detail:

- `setKi(...)` calls the raw `set_kp(...)`;
- `setKd(...)` also calls the raw `set_kp(...)`.

Until verified against the exact installed 0.21.0 package/runtime, post-construction PID gain setters should be treated as suspect.

More importantly, a pelvis position PID can easily become an invisible world-space support if used carelessly.

Decision:

**Do not use root PID as the first standing fix.**

Keep it as a later controlled experiment, preferably angular-only first, after joint motor and balance-feedback tests.

## 12. Proposed Goblin standing controller hypothesis

The most defensible next architecture is deliberately small.

### Layer A — reference posture

One neutral standing pose.

No gait states. No get-up states.

### Layer B — muscles

Native Rapier joint motors.

First compare:

1. existing `ForceBased`;
2. `AccelerationBased`.

Then compare current spherical frame-target technique with direct per-axis spherical targets.

All motors stay torque-limited.

### Layer C — world-space torso balance

Compute upright torso error relative to world up and torso angular velocity.

Generate a desired corrective torque.

Production candidate should realize this with **physical internal torque distribution** through torso/pelvis/hip chain, inspired by SIMBICON, rather than adding an unpaired free world torque.

### Layer D — ankle/hip balance feedback

Compute:

- horizontal COM displacement relative to support;
- COM velocity;
- CoP/contact load state.

Use a small bounded feedback term to modify standing ankle/hip targets.

Conceptually:

```text
target_angle = neutral_angle
             + Kp_balance * horizontal_COM_error
             + Kd_balance * horizontal_COM_velocity
```

This is a simplified game-oriented interpretation of the feedback structure in SIMBICON, not a claim of reproducing the complete paper.

### Layer E — solver budget

After the controller is defined, sweep solver budget separately and choose the lowest setting that maintains the acceptance criteria.

## 13. Recommended experiment order

### S0 — baseline freeze

Reproduce the current standing benchmark with no get-up logic.

### S1 — motor model

`ForceBased` vs `AccelerationBased`.

No other change.

### S2 — spherical target representation

Current moving-frame technique vs native direct angular motor targets.

No balance feedback yet.

### S3 — world-space torso balance

Add a bounded torso-upright controller realized with paired/internal torque logic.

Do **not** add pelvis position support.

### S4 — COM feedback into ankle/hip targets

Use horizontal COM position + velocity in sagittal and coronal axes.

### S5 — contact-pressure measurement

Add CoP and foot-load telemetry. Use it first for diagnosis; only then decide whether CoP should be part of feedback.

### S6 — solver sweep

Repeat with minimal additional solver budgets and compare CPU cost.

### S7 — structural checks only if still necessary

Only if S1–S6 cannot make the existing rig stand:

- hip angular limits;
- mass/inertia distribution;
- foot collider/contact geometry;
- timestep comparison (e.g. 60 vs 120 Hz fixture).

Do not change all of these together.

## 14. What not to do next in this Standing research workstream

Do not (within the frozen/fully dynamic Standing experiment):

- resume get-up development;
- add walking/stepping;
- implement reinforcement learning;
- add a hidden pelvis-to-world spring as the **unassisted Standing research** answer;
- simply increase friction;
- simply increase torque;
- simply maximize solver iterations;
- rewrite the rig to multibody joints;
- copy Euphoria claims as though its proprietary algorithm were public.

## 15. Current ranked hypotheses

| Rank | Hypothesis | Why it is promising | Risk |
| --- | --- | --- | --- |
| 1 | AccelerationBased joint motors improve consistency | Rapier explicitly mass-scales them; current controller forces ForceBased | may still need retuned gains |
| 2 | Separate world-space torso balance is missing | directly supported by SIMBICON; pose tracking alone is not balance | torque distribution must remain physically valid |
| 3 | COM position + velocity feedback into ankles/hips creates a stable attractor | classic biped balance result; directly applicable to quiet stance | needs careful gain tuning |
| 4 | Solver convergence is masking otherwise usable control | already strongly supported by Goblin +16 evidence | CPU cost / can hide controller defects |
| 5 | CoP/contact-force feedback improves diagnosis/control | biomechanics paper + Rapier contact manifolds | more measurement complexity |
| 6 | Direct spherical motor targets simplify loaded control | native API is clearer than changing frames | coordinate conventions need verification |
| 7 | Hip limits reduce wasted DOF | current hips unrestricted | structural change; should come after controller tests |
| 8 | Root/pelvis PID helps | native Rapier feature, common active-ragdoll pattern | can become hidden support; wrapper caveat |

## Decision from this research pass

The next standing work should **not** start with pelvis PID or another get-up algorithm.

The smallest scientifically and engine-grounded path is:

> **A/B the Rapier motor model first, then add a SIMBICON-style world-space balance layer using COM position/velocity and physically realizable internal torques.**

That path directly addresses both things our existing evidence points to:

1. inconsistent/stiff articulated control;
2. lack of a clean global balance feedback loop.

Only after these controller variables are understood should we decide whether the rig geometry itself needs structural changes.

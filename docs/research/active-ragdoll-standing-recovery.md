# Active Ragdoll Standing & Recovery Research

**Status:** living research document  
**Last updated:** 2026-10-04  
**Scope:** G3 standing, balance, push recovery, ground-contact transitions and physical get-up  
**Repository:** `bongohorse/goblin`  
**Current engine baseline:** Three.js 0.186.1, `@dimforge/rapier3d-compat` 0.21.0  
**Related work:** Issue #15, Draft PR #29

This document is the shared research record for Goblin standing/recovery work. It exists so later agents/chats do not restart the same investigation, mistake a hypothesis for a fact, or repeat a failed controller path.

## Research rules

Use these labels consistently:

- **PROJECT EVIDENCE** — reproduced in this repository with current Goblin code/fixtures.
- **PRIMARY SOURCE** — supported by Rapier documentation/source or a research paper.
- **EXTERNAL PATTERN** — used successfully by another project, but not yet proven for Goblin.
- **HYPOTHESIS** — plausible explanation or design direction that still requires a Goblin experiment.
- **DEFERRED** — technically possible, but intentionally not the next path.
- **REJECTED FOR NOW** — investigated and not justified by current evidence.

Before implementation, verify APIs against the installed `@dimforge/rapier3d-compat` version. Upstream/current Rapier documentation may contain APIs or behavior newer than the installed JS package.

Do not turn an external pattern into production code without a bounded fixture and explicit acceptance criteria. Negative results belong in this document too.

## Current Goblin evidence

The latest G3 investigation is Draft PR #29 at head `57eb17c23884c6b8d94dd679b88447c2fc164f81`.

Reference:
- https://github.com/bongohorse/goblin/pull/29
- https://github.com/bongohorse/goblin/blob/57eb17c23884c6b8d94dd679b88447c2fc164f81/docs/development/g3-feasibility-review.md

### Rig facts

**PROJECT EVIDENCE**

Current G1 rig:

- 15 dynamic rigid bodies.
- 14 impulse joints.
- Spine and neck are revolute joints with limits.
- Elbows, knees, wrists and ankles are revolute joints with limits.
- Hips and shoulders are spherical joints and currently have no anatomical angular limits.
- Adjacent connected bodies have their mutual contacts disabled; other self-collisions remain enabled.
- Hands use ball colliders with radius 0.115 m and friction 0.7.
- Feet use cuboid colliders with half-extents 0.13 × 0.10 × 0.22 m and friction 1.0.
- Body linear damping is 0.35 and angular damping is 1.3.
- Goblin masses are authored per body part instead of relying on default density.

Current rig source:
https://github.com/bongohorse/goblin/blob/57eb17c23884c6b8d94dd679b88447c2fc164f81/src/goblin-rig.js

### Standing/solver evidence

**PROJECT EVIDENCE**

Earlier G3 balance fixtures showed:

- Passive ragdoll falls quickly.
- Joint motors alone did not produce a durable stationary stance.
- Extra solver iterations changed the result materially.
- The +16-iteration fixture reached the existing 60 s standing/stationary criterion in the isolated experiment.
- +12 iterations could remain standing for 60 s but exceeded the stationary drift criterion.
- This is evidence that constraint convergence matters; it is not evidence that +16 should be adopted in production.

Latest G3 work keeps +16 as a fixture-only candidate. It is not a production decision.

### Get-up evidence

**PROJECT EVIDENCE**

Current result is still **0 successful physical get-up cycles**.

The latest bounded sole-roll mechanism:

- moves physically through native joint motors;
- uses real Rapier contacts;
- rejects collision-invalid whole-body poses;
- makes visible progress;
- still loses foot load before the head becomes unloaded;
- fails after about 1.8 s in the final repeated back-fall test;
- produces zero head-free dwell.

Previous fixed-support/four-support attempts also failed. The latest review showed an important causal distinction:

1. Some older target poses were joint-reachable but self-collision-invalid.
2. Correcting those invalid poses is necessary but not sufficient.
3. The new collision-aware path still cannot keep both foot support and unload the head.
4. Therefore the remaining problem is not simply "more torque", "more friction", or "better IK". Contact configuration and whole-body path have to change together.

### Friction evidence

**PROJECT EVIDENCE**

Changing all tested friction coefficients to 2 did not make the old bridge succeed and did not make the latest sole-roll path succeed. Therefore:

- friction can affect the behavior;
- current experiments do **not** prove friction irrelevant;
- friction alone is **not** a demonstrated solution.

Legacy tangent-impulse getters were not validated as reliable solved-friction evidence in the current setup. Use measured slip and validated normal contact loads until a better friction diagnostic is proven.

### Self-collision evidence

**PROJECT EVIDENCE**

A previously selected deep-flexion target produced roughly 18–20 mm torso/thigh overlap. Native motors did not converge under real self-collision, even after gravity/floor isolation. A sensors-only diagnostic converged.

Conclusion: a joint-reachable pose is not necessarily a physically reachable pose. Whole-body collision feasibility must be checked during planning.

## Rapier findings

### 1. Native joint motors are PD controllers

**PRIMARY SOURCE — high confidence**

Rapier documents joint motors as proportional-derivative controllers with target position, target velocity, stiffness and damping. Spherical joints expose per-axis motor control for AngX/AngY/AngZ, including force/torque caps.

Sources:
- https://rapier.rs/docs/user_guides/javascript/joints/
- https://rapier.rs/javascript3d/classes/SphericalImpulseJoint.html

Implication for Goblin:

- Prefer native motor targets as the primitive for "muscle" control.
- Keep explicit torque caps.
- Separate desired pose from balance logic.
- The current experimental spherical path changes `frameX1` and then drives motor targets toward zero. That technique has been validated for unloaded pose convergence in the existing fixture, but direct native angular targets deserve an isolated comparison because Rapier exposes them explicitly.

**HYPOTHESIS:** a cleaner "reference pose -> per-axis native PD motor" layer will be easier to reason about than continuing to encode pose targets by mutating joint frames during recovery.

### 2. Rapier provides a PID controller for dynamic rigid bodies

**PRIMARY SOURCE — high confidence**

Rapier provides a PID controller intended to steer a **dynamic** rigid body toward a target without teleporting it.

Source:
- https://rapier.rs/docs/user_guides/javascript/pid_controller/

Rapier explicitly warns against repeatedly setting body poses directly when physical interaction matters and presents PID-controlled velocity change as the alternative.

Implication for Goblin:

A pelvis/root PID is worth testing as a **balance/reference controller**, while the limb joints remain physical and motor-driven.

It must first be tested as a fixture. We do not yet know whether its behavior under Goblin contacts, joint reactions and player interaction gives the kind of physical response we want.

**HYPOTHESIS:** two controller layers may be simpler and more robust:

1. root/pelvis balance target;
2. limb/joint pose targets.

This matches common active-ragdoll architecture better than asking one get-up planner to simultaneously solve root balance, pose, support relocation and contact stability.

### 3. Solver iterations are a legitimate stability lever

**PRIMARY SOURCE — high confidence**

Rapier's current integration-parameter documentation states:

- default solver iterations: 4;
- higher values improve accuracy/stability at performance cost;
- 8–12 is described as a reasonable range for demanding scenes such as stiff joint assemblies;
- rigid bodies can request additional solver iterations.

Source:
- https://rapier.rs/docs/user_guides/javascript/integration_parameters/

This aligns with Goblin's existing fixture evidence that solver budget materially affects standing.

Decision:

- Keep solver count as an explicit experimental variable.
- Do not hide a weak controller by simply maximizing iterations.
- Measure standing quality and CPU cost together.

### 4. Joint warm-starting deserves a direct test

**PRIMARY SOURCE — high confidence, installed-version API must be verified**

Current Rapier documentation exposes `warmstart_joints`, defaulting to false, and says enabling it noticeably improves convergence of stiff impulse-joint assemblies.

Source:
- https://rapier.rs/docs/user_guides/javascript/integration_parameters/

This is directly relevant to a 15-body/14-joint active ragdoll.

**NEXT RESEARCH QUESTION:** Does `@dimforge/rapier3d-compat 0.21.0` expose this setting in the installed JS API, and how does it affect Goblin standing at 0/2/4/8/12 additional solver iterations?

Do not assume the current upstream documentation exactly matches 0.21.0 until installed declarations/source are checked.

### 5. Contact geometry matters as much as contact existence

**PRIMARY SOURCE — high confidence**

Rapier contact pairs/manifolds expose real geometric contacts, normals and solver contacts. A broad-phase/contact-pair hit alone is not enough to prove an active supporting contact.

Source:
- https://rapier.rs/docs/user_guides/javascript/advanced_collision_detection/

Implication for Goblin:

Standing/recovery should reason about the actual support geometry:

- which foot/hand points are loaded;
- whether a foot is on sole, heel, toe or edge;
- contact normal;
- contact point motion/slip;
- resulting support polygon.

This is more useful than a binary "foot touches ground" flag.

### 6. Hand collider shape is a real research variable

**PRIMARY SOURCE + HYPOTHESIS**

Rapier friction follows Coulomb friction. Coefficients >=1 are allowed. The default combine rule is Average.

Source:
- https://rapier.rs/docs/user_guides/javascript/collider_friction/

For the current rig:

- hand friction 0.7;
- arena/floor friction is currently 0.9 in production;
- with Average combination, nominal hand-floor friction is 0.8;
- foot friction 1.0 against floor 0.9 gives nominal 0.95.

But the latest friction-2 test shows that simply raising coefficients does not solve G3.

The more important question may be **contact shape**. Current hands are spheres. A sphere is convenient for interaction, but a palm support in a get-up maneuver naturally benefits from a stable area and orientation.

**HYPOTHESIS:** a small palm-like box/rounded-box collider may create a more useful support manifold than the current ball hand, even without extreme friction.

Required A/B fixture:

- current sphere hand;
- palm-like collider with comparable mass/visual ownership;
- same controller and initial pose;
- compare normal load, slip, contact points, head unloading and failure reason.

Do not change the production rig until this is proven.

### 7. Hip and shoulder freedom may be unnecessarily expensive to control

**PRIMARY SOURCE + PROJECT EVIDENCE + OPEN API QUESTION**

A Rapier spherical joint allows three rotational DOF. Goblin shoulders and hips currently use spherical joints without authored angular limits.

Sources:
- https://rapier.rs/docs/user_guides/javascript/joints/
- https://rapier.rs/docs/user_guides/templates/joints/

Current Rapier documentation describes limits on free angular axes, including multi-axis joints. However, the exact JS surface available in the installed 0.21.0 package must be checked before designing a production solution.

**HYPOTHESIS:** anatomically bounded hip/shoulder swing/twist could reduce the controller's stabilization burden and prevent physically useless configurations.

This must be tested independently. Do not combine it immediately with a new get-up algorithm, because that would destroy causal clarity.

### 8. Multibody joints are not the default next move

**PRIMARY SOURCE — mixed benefit**

Rapier distinguishes impulse joints and multibody joints. Multibody constraints can offer strong structural properties, but the current JavaScript `MultibodyJoint` API surface is much thinner than `SphericalImpulseJoint`; the TypeDoc surface does not expose the same motor-control methods used by active ragdoll joints.

Sources:
- https://rapier.rs/docs/user_guides/javascript/joint_constraints
- https://rapier.rs/javascript3d/classes/MultibodyJoint.html
- https://rapier.rs/javascript3d/classes/SphericalImpulseJoint.html

Also, joint warm-starting applies to impulse joints, not multibody joints, according to current integration-parameter documentation.

Decision:

**DEFERRED** as the production architecture.

A tiny impulse-vs-multibody stability experiment may still be informative, but rewriting the Goblin rig around multibody joints is not justified while motor/control requirements remain central.

## External active-ragdoll patterns

These are not Rapier-specific proof. They are architecture references.

### Target/master rig + physical/slave rig

**EXTERNAL PATTERN**

Multiple active-ragdoll projects use:

- a target/master pose hierarchy;
- a physical ragdoll hierarchy;
- PD-controlled position/rotation following;
- force/torque caps;
- collision-aware weakening/recovery.

Examples:
- https://github.com/EggyStudio/Unity.Humanoid.ActiveRagdoll
- https://github.com/sergioabreu-g/active-ragdolls

Why it matters:

Our "target rig" does not need to be a visible animation rig. It can be a mathematical/reference skeleton defining desired standing, crouch, brace and recovery poses.

This suggests a cleaner separation:

```text
reference pose / desired motion
            |
       joint PD targets
            |
      physical ragdoll
            |
 contacts + COM + velocity
            |
 balance / step decision
```

### Separate balance and foot-placement modules

**EXTERNAL PATTERN**

One contemporary active-ragdoll project separates hips/balance, stepping and IK foot targets and uses ground raycasts for placement.

Example:
- https://github.com/mourlamjacob-ai/Active-Ragdoll

This is useful as an architectural comparison, not authoritative physics guidance.

**HYPOTHESIS:** Goblin should also separate:

- pose tracking;
- standing balance;
- disturbance detection;
- step/contact relocation;
- get-up sequencing.

The current G3 experiments combine several of these responsibilities inside a recovery planner, which increases complexity and makes failures difficult to isolate.

## Balance and push-recovery research

### Ankle, hip and stepping strategies

**PRIMARY SOURCE**

Humanoid balance literature commonly separates recovery into:

1. ankle strategy for smaller disturbances;
2. hip/angular-momentum strategy for larger disturbances;
3. stepping when the existing base of support is no longer sufficient.

Sources:
- https://arxiv.org/abs/1710.10598
- https://arxiv.org/abs/1612.08034

This maps cleanly to Goblin:

- small lean: ankle/hip joint targets;
- larger push: pelvis/torso correction;
- predicted failure: move a foot.

Important: a controller should not keep increasing torque when a step is physically required.

### Capture Point

**PRIMARY SOURCE**

Capture Point research addresses when and where a biped must step after a disturbance in order to recover.

Source:
- https://doi.org/10.1109/ICHR.2006.321385
- https://xplorestaging.ieee.org/document/4115602

For Goblin we do not need a research-grade humanoid MPC implementation. The useful idea is simpler:

- current COM alone is insufficient;
- COM velocity matters;
- predict where balance is heading;
- decide to step before the body has already fallen.

A first game-oriented approximation can be evaluated:

```text
predicted_com = com + com_velocity * prediction_time
```

Then compare predicted COM against the support region.

This is a **HYPOTHESIS/approximation**, not the formal Capture Point equation and must not be mislabeled as one.

### SIMBICON

**PRIMARY SOURCE**

SIMBICON is a classic demonstration that simple state-machine control, feedback and physically simulated joint control can produce robust biped movement and transitions without solving one giant global optimization problem.

Source:
- https://www.microsoft.com/en-us/research/publication/simbicon-simple-biped-locomotion-control/

Takeaway for Goblin:

A small state machine with well-defined phase goals and feedback may be preferable to a large continuous planner.

## Get-up architecture hypothesis

The current evidence argues against immediately writing another monolithic get-up trajectory.

A more testable structure is:

```text
RAGDOLL
  |
CLASSIFY (back / belly / side)
  |
BRACE / FIND SUPPORT
  |
CONTACT HANDOFF
  |
CROUCH OR FOUR-SUPPORT
  |
ONE FOOT PLANT
  |
WEIGHT TRANSFER
  |
SECOND FOOT PLANT
  |
CROUCH
  |
STAND
```

Each phase should define:

- target/reference pose;
- allowed/required contact set;
- support/load criteria;
- COM/support criterion;
- velocity criterion;
- maximum force/torque;
- timeout/failure reason;
- transition criteria.

A phase may move a support contact. It should not demand that every hand/foot stay fixed while simultaneously asking for a pose that the contact geometry cannot support.

**HYPOTHESIS:** the missing primitive in current G3 is not another fixed bridge. It is a controlled **contact handoff/reposition** that intentionally changes the support layout while preserving enough load to remain recoverable.

This matches the final decision in the latest PR #29 feasibility review.

## Deep reinforcement learning

**PRIMARY SOURCE, DEFERRED**

DeepMimic demonstrates robust physics-based character skills learned from motion examples, including recovery under perturbations.

Source:
- https://arxiv.org/abs/1804.02717

This proves that learning-based control is viable in principle, but it would add training infrastructure, motion/reference data, policy runtime and a much larger validation surface.

Decision:

**DEFERRED.** Do not use RL to solve the current G3 blocker unless simpler controller architecture has been exhausted and the project explicitly accepts the added research/tooling scope.

## Approach comparison

| Approach | What it solves | Main benefit | Main risk | Current disposition |
| --- | --- | --- | --- | --- |
| Native per-joint PD motors | pose/muscle behavior | Rapier-native, force-capped, testable | tuning and axis conventions | **High-priority foundation** |
| Pelvis/root PID | global target following/balance | separates root balance from limb pose | may feel over-controlled; interaction behavior unknown | **Research spike** |
| More solver iterations | constraint convergence | already improves Goblin standing fixture | CPU cost; can hide weak control | **Measure, do not blindly adopt** |
| Joint warm-starting | stiff impulse-joint convergence | specifically documented for joint assemblies | installed 0.21 API unverified | **High-priority verification** |
| Contact manifolds/support geometry | actual support state | makes feedback physically meaningful | more diagnostics/controller complexity | **High priority** |
| Palm-like hand collider | stable hand support | targets observed hand-support weakness | production rig change | **A/B fixture only first** |
| Hip/shoulder limits | reduce uncontrolled DOF | less stabilization burden | exact JS API/anatomy tuning | **A/B fixture only first** |
| Capture-point-inspired stepping | strong push recovery | decides when support must move | formal model simplification | **After standing foundation** |
| State-machine recovery | decomposes get-up | debuggable and phase-specific | needs good reference poses | **Preferred architecture direction** |
| Multibody-joint rewrite | structural constraint stability | potentially strong joint enforcement | weaker JS motor surface / rewrite cost | **Deferred** |
| Higher friction only | reduce sliding | easy to test | latest tests already fail | **Rejected as standalone fix** |
| Higher torque only | stronger pose tracking | easy to test | can fight impossible contact geometry | **Rejected as standalone fix** |
| Deep RL / DeepMimic | learned robust behavior | high capability ceiling | major infrastructure/training scope | **Deferred** |

## Proposed research sequence

This is a research order, not authorization to implement all items at once.

### R1 — Verify installed Rapier control surface

Goal: remove documentation/version uncertainty.

Check `node_modules/@dimforge/rapier3d-compat` 0.21.0 declarations/source for:

- spherical motor position/velocity APIs;
- per-axis max motor force;
- integration parameter names;
- joint warm-starting;
- multi-axis joint limits;
- available PID controller APIs;
- contact manifold/solver-contact APIs.

Deliverable: a small compatibility table with "documented upstream / present in installed 0.21 / usable for Goblin".

### R2 — Standing foundation fixture

Do **not** attempt get-up.

Compare one variable at a time:

- existing native motor path;
- direct per-axis spherical motor targets;
- optional root/pelvis PID;
- solver sweep;
- joint warm-starting;
- optional hip/shoulder limits.

Keep the same rig, start pose and acceptance measurements wherever possible.

Measure:

- 60 s survival;
- drift;
- COM trajectory;
- head/torso height;
- joint error;
- max torque;
- solver cost;
- failure time/reason.

### R3 — Support/contact fixture

Do **not** attempt full get-up.

Compare:

- ball hand vs palm-like collider;
- baseline friction vs bounded alternatives;
- actual contact manifolds;
- sole/heel/toe/edge state;
- slip velocity/distance;
- support polygon and load distribution.

The question is: can the Goblin create and hold useful physical support configurations?

### R4 — Push recovery fixture

Only after stable standing.

Test:

- small perturbation recoverable without step;
- medium perturbation with ankle/hip correction;
- larger perturbation requiring one controlled step;
- predicted COM/support logic versus simple current-COM logic.

### R5 — Get-up phase research

Only after R1–R4 establish reliable primitives.

Start with one fall orientation and one intermediate. Do not expand to back + belly + full stand until the first intermediate succeeds repeatedly.

Candidate first problem:

**from a true fallen back pose, perform one collision-valid contact handoff and reach a quiet head-free support state without recovery reset.**

Only then extend the state graph.

## Current decisions

1. Stay on Rapier for now.
2. Keep `ImpulseJoint` as the production baseline while researching; do not rewrite to multibody yet.
3. Do not increase torque or friction as the standalone solution.
4. Do not weaken success guards to make G3 pass.
5. Do not teleport/set body transforms as a hidden get-up mechanism.
6. Keep support bodies dynamic.
7. Separate "recovery/reset for playability" from "successful physical get-up".
8. Treat +16 solver iterations as fixture evidence, not a production choice.
9. Research standing/balance foundations before another full get-up implementation.
10. Prefer isolated causal experiments over stacking several changes at once.

## Open questions

- Does installed Rapier 0.21.0 expose joint warm-starting exactly as current upstream docs describe?
- Can spherical hip/shoulder angular limits be authored cleanly with the installed JS binding, or would we need a different joint descriptor/layout?
- Does direct per-axis spherical motor targeting outperform the current frame-reorientation technique under loaded contacts?
- Can a pelvis PID improve balance while preserving the physical "ragdoll" feel and reaction to tools/hits?
- How much solver budget is actually necessary after controller and joint-limit improvements?
- Does a palm-like collider materially improve four-support head unloading compared with the current spherical hand?
- Which contact data is reliable enough to estimate support state and friction utilization in Rapier JS 0.21?
- What simple predicted-COM/capture heuristic gives useful stepping decisions without importing a robotics-scale controller?
- What is the minimum useful recovery state graph for back and belly falls?
- Can the expensive current pose planner be replaced by cheap predefined reference poses plus local collision/contact validation?

## Source register

### Rapier primary sources

- Rigid bodies: https://rapier.rs/docs/user_guides/javascript/rigid_bodies
- Colliders: https://rapier.rs/docs/user_guides/javascript/colliders
- Collider friction: https://rapier.rs/docs/user_guides/javascript/collider_friction/
- Joints: https://rapier.rs/docs/user_guides/javascript/joints/
- Joint constraints: https://rapier.rs/docs/user_guides/javascript/joint_constraints
- Integration parameters: https://rapier.rs/docs/user_guides/javascript/integration_parameters/
- PID controller: https://rapier.rs/docs/user_guides/javascript/pid_controller/
- Advanced collision detection: https://rapier.rs/docs/user_guides/javascript/advanced_collision_detection/
- SphericalImpulseJoint API: https://rapier.rs/javascript3d/classes/SphericalImpulseJoint.html
- MultibodyJoint API: https://rapier.rs/javascript3d/classes/MultibodyJoint.html
- JointData API: https://rapier.rs/javascript3d/classes/JointData.html

### Physics/robotics primary sources

- SIMBICON: https://www.microsoft.com/en-us/research/publication/simbicon-simple-biped-locomotion-control/
- Capture Point: https://doi.org/10.1109/ICHR.2006.321385
- Push Recovery / Capture Point feedback: https://arxiv.org/abs/1710.10598
- MPC + Capture Point: https://arxiv.org/abs/1612.08034
- DeepMimic: https://arxiv.org/abs/1804.02717

### External implementation references

- EggyStudio active ragdoll: https://github.com/EggyStudio/Unity.Humanoid.ActiveRagdoll
- Sergio Abreu active ragdolls: https://github.com/sergioabreu-g/active-ragdolls
- Mourlam Jacob active ragdoll: https://github.com/mourlamjacob-ai/Active-Ragdoll

## Update protocol

When new research is performed:

1. add the source to the register;
2. mark the finding with the correct evidence label;
3. state what it changes for Goblin;
4. record contradictory evidence instead of deleting it;
5. update the approach comparison/disposition;
6. add or close open questions;
7. link any reproducible Goblin fixture/issue/PR evidence.

This file is the durable research memory. Implementation-specific acceptance evidence remains in the relevant issue/PR and development reports.

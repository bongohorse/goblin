# Gameplay-first development policy

**Status:** current game-product development rule (2026-10-08). Applies to new gameplay proposals and agent decisions. The scientific Standing Lab contracts and historical results remain unchanged.

## Product goal

Beat your Goblin is a responsive, entertaining browser game, **not** a requirement to simulate a fully physical or self-learning humanoid. The first playable loop from [Masterplan #11](https://github.com/bongohorse/goblin/issues/11) is: **upright Goblin → player grabs/pushes → Goblin sways/falls → reacts → gets up**. Build the smallest representative, interruptible, repeatable playable slice before generalising to walk, run, jump, crawl, climb, parkour or autonomous decisions.

Prefer the **least complicated reliable implementation** that yields good player feedback and fits the target device. Consider authored animation, procedural poses, IK, controlled root motion, bounded balance assists, collision-aware transitions, a simpler character controller, true dynamic Rapier reactions and ordinary state-machine/utility AI. Reinforcement learning and full active-ragdoll control are **options**, not mandatory production architecture. Never require server GPUs or online learning for gameplay.

## Two distinct success claims

| Lane | May use | What success means |
| --- | --- | --- |
| **Scientific physics research** (e.g. #30/#31/#60/#87) | Only the actuators, supports, colliders and techniques explicitly permitted by its frozen protocol | Versioned physical evidence meeting *all* scoped acceptance criteria. A 60-second non-foot-contact-free run alone is not full acceptance if support, drift, force or performance criteria fail. No hidden anchors, transform corrections, kinematic substitutions, or tuned test loopholes. |
| **Gameplay / proof-of-fun prototype** | Clearly identified animation, IK, bounded world or pose assistance, kinematic states, authored transitions, and physical interactions | Player-observable, reliable, interruptible behavior, plausible contacts, acceptable frame times and repeatable user testing. This is **not** evidence of unassisted Standing. |

**Label the mode and any gameplay assistance** in debugging, PR descriptions, measurements and reports. A gameplay pass must never be reported as a scientific Standing pass. Do not change archived run data, numerical research thresholds, issue budgets, experiment stops or research branch scope to accommodate a game prototype.

## Current implementation versus permitted future solutions

The options above are permission to evaluate a scoped future solution, not evidence that it already exists. The arena builds a procedural 15-body/14-joint dynamic rig in `src/goblin-rig.js` and `src/main.js`; no standing, locomotion or recovery controller is integrated. `src/runtime.js` manages timing, rounds and fall scoring, not movement states. The [rig/asset contract](goblin-rig-contract.md) reserves future bones/clips; an imported skeletal/clip pipeline, IK and animation/physics handoffs are not implemented.

The Standing Lab builds a separate world from `docs/research/standing-lab/baseline-config.json` and may use `NativePoseHold`. Shared body IDs/counts do not prove transfer: arm bind poses/anchors differ from the arena, and motor experiments have their own solver/controller configuration. Any transfer requires explicit compatibility checks for the scoped solution.

Current `ContactGrab.begin()` and collider picking in `src/grab.js` accept dynamic bodies only. A kinematic anchor drives a bounded spring connection to the selected dynamic body; this does not implement grabbing an animation-owned or kinematic character. Future handoffs must define how grab selection/connection, velocity, joints, collisions, interruption and reset remain consistent. Existing dynamic reset/cancel handling is not proof of hybrid transitions. No new prototype, research run or release is authorized by this policy; the governing issue/user scope still applies.

## Implementation boundaries

- **One owner per transform per state.** Document who owns animation bones, root/body poses, rigid bodies, velocities, colliders and joint motors during idle/upright, grab/drag, impact, ragdoll fall, get-up and return to locomotion. Three.js must not silently overwrite a Rapier-owned dynamic body; use an explicit tested handoff for assisted/kinematic states.
- **Preserve player influence.** Hits, grabbing and obstruction must cause understandable interruption/deflection. Avoid a visually animated character that ignores forces, ghost collision, phasing through props, abrupt velocity loss or hard resets disguised as recovery. A game assist can be deliberate but not unbounded or unexplained.
- **Isolate unknowns first.** Investigate unproven low-level physics behavior in a small dedicated Lab. Prototype assisted or animated *gameplay behavior* in a small separate controlled scene when the strict physical Standing gate is not met. Avoid debugging unresolved mechanics only inside a busy arena. Use the same relevant rig/body IDs and existing physics code when feasible; do not accidentally build a second engine.
- **Feature order is not a physics theorem.** Standing is our first research topic and upright gameplay is our first playable state. Fully dynamic Standing acceptance is **not an unconditional prerequisite** for gameplay get-up, walking, running or jumping prototypes. Each still needs its own collision, transition, interruption and game QA checks.
- **Performance is a release constraint.** Use Masterplan #11's initial 60 FPS desktop/suitable mobile and 30 FPS weaker-profile goals as targets to verify, not accomplishments. Measure actual frame-time distribution, CPU physics, render cost, memory, worst-case interactions and native browser/visibility behavior on agreed target devices. Keep a fallback or simplify an expensive feature.
- **Bounded iteration.** Define one small user-visible outcome, a failure case, a deterministic regression where possible and a human playtest prompt; decide keep/simplify/stop based on measured value. Do not construct a universal learned-controller framework before proving the first playful interaction loop.

## Research and release governance

Read [Physics Labs](labs.md) for scientific work and [outcome-driven workflow](../agents/development-workflow.md) for checks. Current research tasks keep their exact independent instructions; this document does not start, alter, merge or stop #87 or any other frozen study. See [#88](https://github.com/bongohorse/goblin/issues/88) for the review-first visual Lab and product-architecture evaluation; the review is not approval to implement that Lab's proposed features. Propose ticket/contract updates explicitly before altering existing gated research.

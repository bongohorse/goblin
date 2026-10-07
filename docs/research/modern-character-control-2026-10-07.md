# Modern physics-based character control: Goblin research shortlist

**Reviewed:** 2026-10-07. **Scope:** literature and tooling evaluation only.
**Evidence:** PRIMARY SOURCE for reported external results; HYPOTHESIS for Goblin applicability; DEFERRED for learned control, get-up, locomotion and object interaction.

## Decision

Modern work provides credible alternatives to a complete muscle simulation, particularly learned policies that command joint targets. It does not establish successful standing, recovery or locomotion for Goblin's 15-body Rapier rig. Keep Rapier as runtime and acceptance engine, bounded internal actuation, the existing Standing Lab benchmark and current gate stops.

Prioritize contact-aware control and evaluation ideas now. Consider MimicKit as the first compact training-framework investigation only under a separately scoped issue, after measurement/actuation gates permit it. Compare against an interpretable classical controller before paying for a larger training pipeline. This note does not activate training or change the experiment program.

## Source review and applicability

The notes below distinguish published/project claims from our engineering judgment. Project pages and abstracts were reviewed unless a full-paper review is explicitly stated. Code links establish availability, not a tested installation, working export or compatible license for every asset. No external implementation was executed.

| Work | Source-supported finding | Goblin implication / limit |
|---|---|---|
| [Flexible Muscle-Based Locomotion for Bipedal Creatures (2013)](https://www.goatstream.com/research/papers/SA2013/) | Full paper reviewed: 3D muscles, optimized routing/control, contact-dependent leg phases and COM feedback; varied fictional bipeds. | Useful morphology and feedback reference; no demonstrated floor get-up or standalone quiet-stance solution. A muscle subsystem would add substantial scope. |
| [DReCon (2019), Ubisoft La Forge](https://www.ubisoft.com/en-us/studio/laforge/news/VjEIwquaIyEZZSw5RZI0V/drecon-datadriven-responsive-control-of-physicsbased-characters) | Combines Motion Matching with RL corrections to joint actuation; targets responsiveness and low runtime cost for games. | Game-oriented architectural reference. Animation supplies goals; physics/controller must still achieve balance. No proven Rapier/browser port. |
| [AMP (2021)](https://xbpeng.github.io/projects/AMP/) | Motion clips train an adversarial prior that supplies style rewards for RL. | Candidate when animation style matters; needs motion data and training, not merely clip playback. |
| [Synthesizing Get-Up Motions (2022)](https://profs.etsmtl.ca/sandrews/publication/getup_sca2022/) | RL synthesizes prone/supine get-up motions using authored feature curves and a mocap-derived pose embedding; includes rough/inclined terrain. | Direct game-animation recovery reference. Feature curves could guide later contact/height milestones; no current Goblin recovery acceptance. |
| [AdaptNet (2023)](https://motion-lab.github.io/AdaptNet/) | Adapts existing learned policies to styles, tasks, morphology and environment through latent/policy modifications. | Relevant to chibi proportions and later behavior variants; requires a useful base policy first. Not universal transfer to arbitrary rigs. |
| [Too Stiff, Too Strong, Too Smart (2023)](https://profs.etsmtl.ca/sandrews/publication/toostiff_sca2023/) | Evaluates policy stiffness, strength and unnatural precision beyond visual motion quality. | High-priority evaluation reference: survival and attractive animation cannot substitute for bounded effort, compliance and realistic reactions. |
| [PartwiseMPC (2024)](https://profs.etsmtl.ca/sandrews/publication/partwisempc_sca2024/) | Online planning combines body-part and whole-body MPC; motions specified through ordered contact keyframes with flexible timing. | Important alternative to RL-only research. A later recovery plan could specify hands/feet support transitions, but online planning cost needs measurement. |
| [MaskedMimic (2024)](https://research.nvidia.com/labs/par/project/maskedmimic.html) | Unified physics control from partially specified motion descriptions, including keyframes, text and scene information. | Later broad action repertoire; excessive scope for the first quiet-standing controller. |
| [PDP (2024)](https://tml.stanford.edu/PDP.github.io/) | Combines RL and behavior cloning for diffusion policies; includes perturbation recovery and universal tracking. | Later diverse reactions; recovery from perturbations must not be equated with proven floor get-up. |
| [SuperPADL (2024)](https://research.nvidia.com/labs/toronto-ai/super_padl/) | Scales language-directed physics control through progressive supervised distillation. | Later multi-skill interface, not a fix for the current actuation oracle. |
| [HumanUP (RSS 2025)](https://humanoid-getup.github.io/) | Two-stage RL discovers get-up motions then refines them under deployment constraints; real G1 tests include prone/supine and varied surfaces. | Strong recovery-curriculum reference from robotics. Accurate collision/contact modeling matters; robot-specific results do not certify Goblin. |
| [MimicKit (2025)](https://github.com/xbpeng/MimicKit), [paper](https://arxiv.org/abs/2510.13794) | Modular open motion-imitation/RL framework including DeepMimic, AMP and other methods. | First framework candidate for a bounded feasibility audit. Lightweight framework does not imply inexpensive training or a drop-in browser controller. |
| [ProtoMotions, current repository](https://github.com/NVlabs/ProtoMotions) | GPU-accelerated humanoid training framework with multiple simulator backends and deployment tooling. | More extensive alternative; verify a pinned revision's requirements, licenses and export path. Simulator coverage is not evidence of Rapier support. |
| [SMP (SIGGRAPH 2026)](https://yxmu.foo/smp-page/) | Reuses frozen motion-diffusion models as task-independent reward priors; demonstrates styles, locomotion and object tasks. | Promising later reusable style prior. The prior is a training reward model, not itself a ready-to-run motor policy. |
| [InstantMimic (September 2026)](https://scripter36.github.io/projects/instantmimic/), [preprint](https://arxiv.org/abs/2609.09821) | Authors report seconds-scale skill training through an entirely GPU-native pipeline; project labels SIGGRAPH Asia 2026 conditionally accepted. | Watchlist for training throughput. Hardware, initialization and task conditions require full audit; no seconds-scale claim for our RTX 3070 Ti or Rapier. |
| [LYRIC (September 2026 preprint)](https://neu-vi.github.io/LYRIC/), [paper](https://arxiv.org/abs/2609.19688) | Language/object goals drive contact-rich whole-body interaction through a planner and closed-loop action generator. | Later carrying/pushing interaction reference. Project page's Code label was not an actionable code link at review; deployment maturity unverified. |

Additional discovery: [Walk This Way (SCA 2025)](https://nickioan.github.io/) is listed by its author, with [publisher paper](https://doi.org/10.1145/3747865). Publisher full text was blocked during retrieval. Keep it as a follow-up lead for imitation-free locomotion; this review does not claim a verified implementation or detailed method audit.

## What can transfer without adopting an entire framework?

**HYPOTHESIS — engineering synthesis, not a demonstrated Goblin result.**

1. Separate goal generation from physical execution: a pose, keyframe, footstep or generated trajectory expresses intent; the controller must handle contacts and disturbances.
2. Use support contacts and COM state as explicit control/diagnostic inputs. A pose-tracking score alone can reward an unstable character.
3. For later get-up, describe contact transitions and body-height milestones rather than forcing a single collision-invalid pose sequence. Keep belly/back/side initial states separate and include transitions into accepted standing.
4. Keep skill selection above bounded low-level joint control. Walking, bracing and get-up need different contact strategies and tested transitions, not one large unstructured gain change.
5. Evaluate reactions and compliance as well as task completion. The Goblin must still yield to sufficiently strong interactions rather than becoming an effectively rigid statue.

The 2013 implementation used ODE 0.8.2, a 0.0003-second integration step and friction coefficient 10; reported optimization took 2–12 hours. These values are not recommendations for Goblin. [Full paper, Sections 5–6](https://www.goatstream.com/research/papers/SA2013/SA2013.pdf).

## Training-to-Rapier feasibility checklist

Before selecting a learned approach, a scoped audit must settle:

- **Rig:** masses/inertia, collision shapes, joint DOFs/limits, anchors and self-collision; retargeted poses must remain collision-valid for the large head and short limbs.
- **Observations:** local/world frames, quaternion conventions, velocities, normalization, history, contacts and reset initialization must match training and runtime.
- **Actions:** joint targets versus torques, units, caps, control frequency, physics timestep, latency and saturation must match the accepted actuation contract.
- **Transfer:** train directly with a matching Rapier environment or explicitly measure cross-engine mismatch. Domain randomization may help but is not proof of transfer.
- **Inference:** establish model export, supported operators and a bounded browser execution path; measure inference plus physics at target refresh rates on native Windows and weaker devices. No ONNX/browser support is assumed for any candidate.
- **Resources:** pin framework/version, training GPU/VRAM requirements, budget and reproducible seeds. A CUDA training framework is not a Three.js/WebGPU runtime feature.
- **Assets/legal:** separately verify code, pretrained weights, mocap and retargeted-data licenses; availability of a repository does not cover all inputs.
- **Acceptance:** evaluate unseen seeds and disturbances in actual Rapier; reject hidden supports, transform writes, collision removal, excessive friction or unbounded actuation. Report actual effort as unavailable where unsupported getters cannot measure it.

## Bounded proposed experiment order

This is a proposal for future issue scoping, not authorization to execute it.

1. Resolve the existing finite-step measurement/actuation decision. Literature does not fix the PRE oracle or supply a justified replacement tolerance.
2. Keep the current reference rig/controller and passive baseline frozen. Add interpretable internal torso/COM feedback only when the governing gate permits it.
3. Establish repeatable 60-second quiet stance with support, drift, constraint and CPU criteria. Preserve first non-foot contact as the Standing Time definition.
4. If learned control is justified, audit MimicKit versus a small same-engine policy environment. Start with one standing task and fixed rig, not a general language-controlled character.
5. Compare learned and classical candidates on identical held-out Lab cases. Disturbance acceptance is a separately scoped follow-up to quiet stance.
6. Only after standing acceptance, scope a Get-up Lab using the 2022 contact/style and HumanUP curriculum references; then scope walking and skill transitions.

For recovery, first non-foot contact cannot be its success metric because hands/knees may legitimately support get-up. Define later success as entering the already accepted standing state for a predeclared duration, with bounded effort and contact validity. Do not change the current Standing benchmark to accommodate recovery.

## Evidence boundaries and current project dependency

On 2026-10-07, main was inspected at `af2c78adf33071b460e2f84361128e36298025a1`. [Draft PR #67](https://github.com/bongohorse/goblin/pull/67), head `d591bfc3ff36fa55348d6c19ce7d89baf9626814`, reports a viable independent continuous reference but remaining discrete Rapier residuals; #60 remains stopped. This is existing project-reported evidence, not a fresh reproduction by this literature task. No engine defect is inferred.

No training, benchmark, browser performance measurement or runtime compatibility test was performed here. No controller, dependency, rig, solver, tolerance or production default changes. Recheck changing repository requirements and publication/code status at implementation time.

Related: [canonical standing research](active-ragdoll-standing-recovery.md), [previous literature review](standing-literature-review-2026-10-04.md), [experiment program](physics-labs-experiment-program.md), [Lab workflow](../development/labs.md).

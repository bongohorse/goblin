# G3 limited investigation and review

2026-10-03; fixed base `f353a51807a9d36380f266c49d78ae8c82eb2781`.
Applied repo skills: Rapier router/joints/stability/reset-performance, gameplay,
diagnosing-bugs, code-review, QA-release and PR. AGENTS, master #11, Issue #15 and
G1/G2 contracts read. No engine/version change or production physics change.

## Spec

**P1 â€” G3 is incomplete, not merge-ready.** `src/posture-state.js` is isolated;
there is no production posture controller, state UI, get-up or visible recovery.
Unit tests prove transition semantics only. The 60-second browser standing,
small shove/leg pull classification, 20 normal fall/get-up cycles, held/hit/blocked
get-up, wedged/unsupported/exit recovery and active browser performance remain open.

**P1 â€” Physical get-up probe fails.** `tests/getup-experiment.mjs`, recorded in
`g3-getup-experiment.json`: four real 6.2 Ns head-impulse falls settle in confirmed
back/belly orientation with 7/11 solver contacts. Both signs of the folded hip
trajectory fail to stand over 16 seconds of attempted motion. Maximum head heights
are 0.841 / 0.664 m (back) and 0.967 / 1.221 m (belly), versus 1.80 m standing
guard; all end lying. Zero successful normal cycles; no reset/teleport substitutes.

Decision after this bounded investigation: retain the reproducible fixture and
state groundwork in a Draft PR, without activating the failed controller. The
next necessary engineering step is contact-aware hand/foot placement and weight
transfer, followed by the same physical back/belly tests. A scalar upright PD
and timed hip/knee fold are insufficient. This is evidence about these controllers,
not a claim that Rapier cannot implement get-up. No engine overhaul or force hike.

## Engineering

Full added-file diff reviewed against base and #15. Two real transition findings
fixed with targeted regression tests: weak-sway entry restarted the strong-fall
dwell timer; posture transitions restarted the independent arena-exit timer.
Six new contract tests cover hysteresis, continuous rest/contact, both pose guards,
hold/hit/block, pause/end/reset/disposal and independent exit timing. The isolated
module allocates no physics/render resources and applies no physical transforms.

Experiments free every world in `finally`; all profiles retain 15 bodies / 14
joints. The implicit floor collider is not a rigid body. Muscle torque is bounded
and its internal residual is zero. Main, picking, grip, assets and configuration
are unchanged. Production JS/CSS filenames remain the G2 baseline.

## Measurements and conditions

`g3-balance-experiment.json`: ten deterministic 3,600-step / 60 simulated-second
profiles, Node 24.21.0, npm 11.19.0, Rapier 0.21.0, no renderer/props/UI/GPU.
Motor-only and ankle-feedback variants fall after 1.58/1.78 s. Supported internal
balance stays upright but drifts 2.947 m; doubled foot friction has no useful effect.
With 2/12/16 additional iterations drift falls to 1.465/0.331/0.234 m and maximum
anchor gap to 6.43/1.24/1.04 mm. At 16 iterations head remains above 2.277 m,
torso upY above 0.99967, maximum balance torque 2.241 Nm. This passes the fixture's
declared 0.30 m stance-drift screen, not the full browser/gameplay acceptance.

Measured mean controller+world step: ~0.200 ms for the 16-iteration candidate,
~0.065 ms for supported balance at default iterations. These are one sequential
Node fixture run including contact queries, not controlled benchmark medians.
Sleeping passive profiles, JIT/order and omitted arena/graphics prevent claims
of equivalent production CPU/GPU cost. A higher iteration budget needs browser
profiling before adoption; no rAF equivalence is used as cost evidence.

## Production browser regression

Windows Edge 154.0.4258.53 via Windows MCP, local production assets served under
`http://127.0.0.1:4174/goblin/`, desktop 1280Ã—720. Existing G2 core/cleanup checks:
all 15 parts + prop picked; seven off-centre 4-second holds end at 0.50â€“6.19 cm
anchor error; slow release 0.511 m/s without throw vs fast 4.657 m/s with throw;
three cameras and their fixed drag planes pass. Twenty grab/reset cycles keep
26 bodies/14 joints, clear force/connection and restore solver settings.
Pointercancel, capture loss, blur, pause, tool/camera/resize/UI cancellation,
second pointer, coalesced samples, no action restart, immediate picking and
paused reset all pass. Zero relevant console errors on the correctly served build.

Explicit **touch emulation**, not Android: portrait 360Ã—744 / landscape 744Ã—360,
mobile context, touch CDP events, DPR 3 input (game caps renderer DPR). Picking,
throw (3.031/5.579 m/s), cancellation without throw and non-overlapping UI/canvas
layout pass; no errors. This exercises G2 because G3 is not integrated.
An initial Vite-preview `/goblin/` prefix setup returned HTML for JS; replaced by
the production-prefix test server, then reran successfully. This was QA server
configuration, not a changed asset path or an application regression.

`npm test`: 30/30 passed, including the final added exit-timer test. `npm run build`:
passes; pre-existing large-bundle warning. CI will be linked at the pushed head.
No live deployment, real Android/iOS, blocked get-up, OS visibility, GPU cost or
20 successful physical get-up cycles claimed. Issue #15 and G3 remain open.

# G3 four-support / side-support investigation

Continuation from `d396d69`, narrowly scoped to the contact-supported get-up blocker.
The game entry, G1 rig, G2 interaction code, masses, colliders, hinge stops and
self-collision policy remain unchanged. **No completed back or belly get-up;
no durable head-free four-support intermediate; no foot unloading/placement.**
G3 and #15 remain open; #29 remains Draft.

## Reproduction and necessary geometry

Node 24.21.0 / npm 11.19.0, installed Rapier 0.21.0 / Three 0.186.1,
fixed dt 1/60 s, original dynamic `fallenCase` fixtures. Falls are produced by
a 6.2 Ns head impulse after the original settling interval, then simulated
passively; no body transform/velocity is written to create the lying poses.

`support-path.js` predicts pelvis, torso and head together, then evaluates
**all four chains for that same central pose**, including root yaw/roll.
Arms retain 4 cm before their 0.79 m full reach; legs retain 4 cm before
0.80 m. Folded limits, ankle X +/-0.40, spine +/-0.30, neck +/-0.45,
foot orientation residual and central floor clearance also constrain the
candidate. Degenerate leg directions/planes and non-finite poses are rejected.
Goal-to-goal movement is sampled at <=5 mm translation and <=0.02 rad
central-angle increments. This is a necessary sampled kinematic check,
**not** an exact continuous workspace, self-collision, friction or wrench proof.
Each native motor is still capped and changes its goal at <=2 rad/s.

The initial pelvis target is 2 mm above its measured position to accommodate
the settled chain's small joint residual at the knee stop. This is a motor
movement goal, never a body position write. The 1e-5 m/rad numerical stop
tolerance does not grant an additional usable joint/reach range.

The bounded search in [reach-envelope.json](g3-four-support-evidence/reach-envelope.json)
finds 8,352 necessary-valid back poses, including a head clearance of 0.739 m,
with arms 0.736/0.746 m and legs 0.335/0.335 m. It finds zero belly poses
in the **explicitly recorded positive-pitch grid**, with measured hand/foot
positions and foot orientations held as goals. This is not a proof that
the geometry cannot stand up through some other physical path. In particular,
moving/rolling a foot on its real contact and releasing a support changes this
workspace. The back-specific path cannot be entered from the belly fixture.

Reproduce:
`node tests/support-path-probe.mjs <output.json>`,
`node tests/four-support-experiment.mjs <output.json>`.
Exit zero means measurements completed, not that get-up succeeded.

## Four-support trial: geometric target is not load-bearing motion

`FourSupportRise` captures actual dynamic hand centres and foot poses/ankle
anchors. These remain motion goals; no world constraint is created. Both feet
must carry >10% weight and both hands >2%, with COM margin >2 cm before
advancing. Actual normal contact impulse/dt, COM velocity, root tracking and
hand slip provide feedback. Bounded Cartesian/pitch tracking bias and a
foot-load correction are accepted only with a common-path recheck. Rejected
correction retains the **entire previous accepted pose** and progress, rather
than independently clamping limbs or accidentally reverting the neck target.

Head-free requires head normal load <5% weight, head centre >0.53 m,
each foot >15%, four supports together >80%, COM speed <0.12 m/s,
each body speed <0.25 m/s and angular speed <0.70 rad/s, continuously 1 s.
Only then may the second central-pose segment advance. No foot-lift command
exists in this candidate: controlled unloading is deferred because its
required intermediate never occurs.

Final back run aborts at **0.5667 s, hand-support-slip**: hands have drifted
5.24/6.74 cm for >0.20 s; head carries 17.98 N in the feedback step,
feet 11.69/12.75 N and hands 25.03/23.32 N. COM speed is just 0.00889 m/s
and margin +0.02972 m, yet root tracking error is 0.141 m / 0.164 rad.
The accepted target has head clearance +0.262 m but the real head remains
on the floor. Its ankle goals are already -0.39926/-0.39978 rad; further
load/tracking corrections are rejected by the existing leg/ankle constraints.
The 3.33% path progress is not a reached physical phase.
Both hands are dynamic and demonstrably slip under insufficient support.

Feedback is sampled **before** the following world step; trace observation
and screenshot status are **after** it. The abort step disables motors and
restores solver values before that step, so its post-step loads differ
(head 25.14 N, total feet 16.63 N). Do not mix these samples into one equilibrium.
[Node trace](g3-four-support-evidence/rapier-trace.json) and
[Edge measurements](g3-four-support-evidence/windows-edge.json) preserve both.

Earlier structural comparisons separated neck motion, coordinated central
motion, and removed the free upright/reaction couple. The latter tipped the
edge-supported feet instead of supplying a reliable four-support stance.
Whole-pose anti-windup and native-joint-only actuation still do not hold the
measured hand goals. The final slip guard ends this approach at its measured
failure; no longer run or higher force is claimed as a solution.

## Alternative physical route: bounded lateral roll

`SideSupportProbe` is a separate **diagnostic route**, not a complete get-up
controller. It releases shoulder/hip motors so the support configuration can
change, holds measured hinge angles, and applies a <=24 Nm longitudinal
roll couple with the exact opposite torque distributed over actually loaded
hand/foot bodies. This uses the existing experimental torque ceiling, not a
world anchor or unbalanced lift. Support <20% weight for >0.20 s aborts;
a 3 s deadline ends the trial. No Cartesian central-pose path is commanded
or claimed validated for this alternative. Actual contact changes decide
whether its observed side/head-free dwell occurs.

| Reproduced fall | Final pre-stop state | Outcome |
| --- | --- | --- |
| back | torso forward (0.605, 0.404, 0.686); head 24.90 N; upper leg 32.76 N; hands/feet total 23.05 N | real lateral motion, but head/thigh-supported collapse; no side/head-free dwell |
| belly | torso forward (0.734, -0.492, 0.468); head 0 N in this impulse sample; upper leg 27.70 N; hands/feet total 62.13 N | loses the original four-support configuration; no quiet side dwell or foot-supported stand |

Both stop at 3.0167 simulated s (floating-point deadline crossed on step 181).
A zero head impulse alone is not success. The back still loads the head;
the belly lacks the side-orientation guard and relies on thigh support.
No stand, recovery reset or accepted cycle is counted.

**Next justified technical decision:** do not extend the same fixed-foot
bridge or simply add roll torque. Investigate a contact-preserving foot roll
from its actual edge to its sole, or an explicit lateral hand/elbow/knee
placement and weight transfer with a wrench/normal-load feasibility check.
The failed trials show that a reachable central pose and COM polygon do not
supply this missing load-bearing mechanism. They do not justify changing the
G1 geometry, joint limits or engine.

## Windows Edge visual sequence, resources and cost

Windows Edge MCP 154 / Windows 10 user agent, 1280x900, DPR 1; separately
compiled Vite **production fixture entry**, served locally under /goblin/
on 4174. Normal game production entry does not import these controllers.
Screenshots advance a live Rapier world in time order, not replayed transforms:

- Back four-support: [0](g3-four-support-evidence/back-four-0steps.png),
  [0.25 s](g3-four-support-evidence/back-four-15steps.png),
  [0.50 s](g3-four-support-evidence/back-four-30steps.png),
  [abort](g3-four-support-evidence/back-four-34steps.png).
- Back lateral: [0](g3-four-support-evidence/back-side-0steps.png),
  [0.5 s](g3-four-support-evidence/back-side-30steps.png),
  [1 s](g3-four-support-evidence/back-side-60steps.png),
  [2 s](g3-four-support-evidence/back-side-120steps.png),
  [stop](g3-four-support-evidence/back-side-181steps.png).
- Belly lateral: [0](g3-four-support-evidence/belly-side-0steps.png),
  [0.5 s](g3-four-support-evidence/belly-side-30steps.png),
  [1 s](g3-four-support-evidence/belly-side-60steps.png),
  [2 s](g3-four-support-evidence/belly-side-120steps.png),
  [stop](g3-four-support-evidence/belly-side-181steps.png).

Visual inspection agrees with contact data: tipped feet, sliding hands and
a head still at the floor in back; lateral collapse, not an upright rise.
Twenty newly created diagnostic fixtures retain 15 bodies, 14 joints,
20 renderer geometries / 1 texture and restore additional iterations to 0.
This is a count/lifecycle proxy, **not 20 successful get-up cycles** or a heap
measurement. Original frames and nonzero baseline restoration are also tested:
3 -> controller 19 -> restored 3 -> G2 grab 7 -> restored 3.

All active candidates keep +16 as the prior **fixture-only** budget; it is
neither newly increased nor recommended for production. Edge CPU call samples:

| Active prefix | samples | world.step mean / p95 ms | controller+diagnostics mean / p95 ms |
| --- | --- | --- | --- |
| back four-support | 34 | 0.294 / 0.500 | 0.221 / 0.400 |
| back lateral | 181 | 0.280 / 0.400 | 0.045 / 0.100 |
| belly lateral | 181 | 0.265 / 0.400 | 0.052 / 0.100 |

Sequential single runs, different durations/motions, no warmup or confidence
intervals, timer resolution about 0.1 ms; includes contact diagnostics and
common-path checks. Final stop sample runs at restored solver settings.
These values describe calls in this fixture, not rendering/GPU cost or proof
of equivalent performance against G1 projectile/rAF measurements.

Fixture reload and asset requests return 200, no relevant console error/warning.
A review caught and fixed a stale mode selector in programmatic side trials;
screenshots were recaptured with the correct label. A transient QA HTML encoding
build failure was corrected; final fixture build is valid UTF-8 and green.

## Spec

- **P1, remaining:** `src/four-support-rise.js`, load/tracking/slip feedback:
  no sustained head-free support, no controlled foot unload, no back or belly
  quiet stand. The new guard reports real failure rather than promoting it.
- **P1, remaining:** `src/side-support-probe.js`: lateral torque alone does not
  establish a load-bearing placement phase; diagnostic timeout is not get-up.
- Production integration and full G3 acceptance deliberately remain out of
  this single-task scope. All G3 criteria stay open; 0 successful cycles.

## Engineering

Review against fixed base `f353a51807a9d36380f266c49d78ae8c82eb2781`, with this
gate's actual delta against `d396d69`. No changes to normal game, input, grab,
rig creation or assets. No body-transform writes, new world joints, unbounded
physics allocations or global solver edits. Existing +16 ownership is restored.

Corrected during review: whole-pose fallback/progress consistency and neck
goal retention; degenerate leg-plane rejection; foot orientation residual
check and yaw/roll floor clearance; accurate QA mode label and UTF-8.
Six additional regression tests exercise native slip/roll behavior,
rotated common geometry, limits/reserve, no motor work on rejected belly
entry, pause and G2 handoff. **42/42 tests pass; normal and fixture builds pass.**
Normal JS remains `index-CxG9iot5.js`, SHA256
`157b6966aece167a9ed76792f0df37b709b0d8ed70fcc88086e77d2b1a656b04`.
The normal build retains the known bundle-size warning.

G0/G1/G2 behavioral tests pass. The complete unchanged G2 browser suite from
d396d69 was not repeated: its source paths and exact production bundle are
unchanged. This is not a new browser approval for G2 or Android.
Final commit and exact-head CI are recorded in #15 / #29.


# Frozen legacy Standing reference — #33

Main `d4da312c1aa0418e30c6cfa7a3924e0ae2ac7deb` uses G2 production; PR #29 remains
open Draft at `57eb17c23884c6b8d94dd679b88447c2fc164f81`. Read PR body, complete
discussion and pinned evidence before contract. Production and PR #29 are not modified.

Sources at that SHA: src/goblin-rig.js, src/posture-state.js, tests/getup-fixture.js,
docs/development/g3-balance-experiment.json, g3-feasibility-review.md and its evidence.
Four canonical research documents at main are background, not new experimental evidence.

15 bodies / 14 joints; 9.06 kg. Pelvis/torso/limbs capsules, head and hands balls, feet
boxes. Exact static parameter table is captured in standing-lab/legacy-rig.json.
Uniform collider.setMass inertia, no additional body mass. Damping linear .35, angular
1.3; friction feet 1, others .7, floor .9; restitution .03. Adjacent self contacts off
through joint, nonadjacent on. Spherical hips/shoulders have no anatomical limits;
spine ±.3, neck ±.45, elbow [-2.35,.05], wrist ±.35, knee [-.05,2.3], ankle ±.4 rad.
dt 1/60 s; production extra solver iterations 0. Experimental fixtures +16 separately.
Legacy in-place reset changes body states; new Lab reset instead creates a new World.

Historical evidence, not reproduced for this Auftrag: balance experiment passive falls
at 1.15 s (old posture heuristic), motors at 1.583333 s; paired support balance at +16
extra iterations reports 60 s and .234469 m max drift, whereas +12 drift .331175 m exceeds
old .3 m criterion. This is not acceptance under first actual non-foot contact definition.
Get-up fixture ForceBased gains 100/12, 20 Nm cap; supported balance cap 24 Nm with equal
opposite reactions on supports. PR #29 latest five Windows Edge trials abort at 1.8 s,
zero head-free dwell. Deep-flexion target overlaps torso/thigh 18–20 mm; unrestricted
gain/friction increases do not establish feasibility. Planner+diagnostics ~9.83–10.57
ms/step; world.step ~.251–.294 ms in that fixture, not a Lab performance prediction.

Historical load calibration: 1 kg gives 9.81 N from normal impulse/dt, both orders;
tangent impulse getters return zero despite known 2 N friction. New Lab must revalidate
normal data and must not treat missing tangential measurement as zero force.

No new legacy run or legacy browser/GPU acceptance claimed. New canonical passive rig
retains shape/mass/filter/material/hinge limits, explicitly changes relaxed arm pose;
see standing-lab/contracts.md for transfer rationale and gate checks. Controller and
solver candidates do not transfer. Comparison is qualitative, not a matched motor A/B.

# Gate D — five-run baseline / #36

Command: `npm run lab:baseline`, Node **v24.21.0**, Windows x64 10.0.26300, host PC.
Code provenance and dirty/content build ID are embedded; evidence generated from Gate C
HEAD plus the documented driver/compare additions (before this evidence commit).
Files baseline/run-1.json through run-5.json embed full canonical config and compact
checkpoints; baseline/comparison.json includes predeclared tolerances and all deviations.

| Run | Steps | Standing time (s) | First actual non-foot body | Termination |
| --- | ---: | ---: | --- | --- |
| 1 | 70 | 1.1666666666666667 | handL | non_foot_contact |
| 2 | 70 | 1.1666666666666667 | handL | non_foot_contact |
| 3 | 70 | 1.1666666666666667 | handL | non_foot_contact |
| 4 | 70 | 1.1666666666666667 | handL | non_foot_contact |
| 5 | 70 | 1.1666666666666667 | handL | non_foot_contact |

Five new Worlds/EventQueues, identical config/build/host, distinct UUIDs. All checkpoints
0,1,10,30,60,70 reached; no unreached checkpoints. Position, rotation, linear/angular
velocity, contact points and loads: **maximum difference zero** in this same-host/build
test. Time/step/categories/body lists identical. q and −q equivalence regression-tested;
deliberate position corruption, missing checkpoint and wrong failure body rejected.
No tolerance changed. No cross-host promise; passive fall is the baseline, no 60-s claim.

Fresh reset after terminal releases old World/events/maps and clears contact/timing/
checkpoints, returns step 0, and reproduces the same entire physical result. Earlier
20-cycle reset regression remains green. Foot allowance, start contact, non-foot latch,
simultaneous contact/endstep precedence, calibration timeout and invalid export covered
with real Rapier and focused terminal-rule tests. Read gate-c.md for measurement limits.

Production build in Windows headless Edge **154.0.4258.53**: 70 UI single steps with one
rAF between each, render enabled vs disabled, all physical checkpoints exactly identical.
Downloaded JSON matches snapshot result. Tests/build on same Node runtime: **37/37 pass**,
`npm run build` passes, chunk warning only. Review Spec/Engineering: no reproducibility
blocker. Next Gate E covers fuller built-browser QA, production smoke and current-head CI.

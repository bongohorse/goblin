# Gate C — calibrated measurement / #35

Public installed Rapier 0.21.0 APIs only, no raw bridges. Four measured manifold points
on a resting 1 kg box give summed normal load 9.810000593438714 N (floor created first)
and 9.81000081695612 N (floor created second), vs analytical 9.81 N; calibration bound
.02 N. Normal points upward in both orders; body-local collider points transformed to
world, surface y within .006 m; impulse/dt units checked. Positive .01 m speculative
gap creates a real manifold but is correctly excluded as physical contact. Step-0 exact
touch query detects contact without stepping; load unmeasured/null. Only post-step actual
points contribute load (predictive support deliberately excluded). Tangential data and
CoP omitted, never reported as zero. This remains the narrowly documented contact rule.

Offset-centre analytical fixture: masses 2 and 1 kg, COM x=2/3, y=4/3 m; translated body
velocity is already COM velocity in Rapier: aggregate (2/3,1,0) m/s. Review #39
corrected the former double-counted angular offset term and erroneous (2/3,5/3,0)
test oracle; public velocityAtPoint and free-step displacement independently verify it. A common
(3,0,4) m translation gives 5 m horizontal COM drift; displaced neck anchor gives .02 m
constraint error. Independent quaternion/torque fixture verifies hinge angle and limits.
Canonical failure body lexical; simultaneous list deduplicated and sorted; endstep contact
priority tested with measured fixture contacts. Zero-gravity calibration (not a second
Standing rig or accepted standing result) checks all 3600 steps and exact 60-s timeout.
Start penetration reports invalid_start/0; removed body invalid_simulation/null standing.
Passive motors/tracking/saturation N/A, invalid telemetry null with explicit cause.

Result validation combines strict Draft-07 schemas with config/time/taxonomy/termination
consistency checks. Config SHA-256 from key-sorted JSON, UUID per fresh run. Full config,
git/build/dirty, package/upstream, platform and fixed solver budget exported. Immutable
capture precedes asynchronous hashing, so reset/export races cannot mix runs. Physics
timing brackets world.step only; observation timing excludes rendering; anomaly checks,
event draining, snapshot copying, schema validation and export are additional unreported
overhead, so these two figures must not be interpreted as total-frame CPU cost.

Validation: 11/11 focused Lab tests; full npm-test equivalent 35/35 under Node v24.21.0,
build passes. Windows x64 headless Edge 154.0.4258.53 production build: pause/resume/step,
fresh reset, first handL floor contact at step 70 = 1.1666666666666667 s, stopped exactly
once; downloaded JSON matches in-memory result, reload and /goblin/ paths pass, zero
console errors. representative-browser-result.json is that dirty Gate-C development
build (git provenance deliberately points at Gate B, not a later evidence commit).
No GPU-performance or live acceptance. Review Spec/Engineering: no open measurement
blocker; next Gate D uses unchanged frozen config and predeclared tolerances.

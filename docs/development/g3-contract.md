# G3 groundwork — NOT an accepted gameplay implementation

Base: `f353a51807a9d36380f266c49d78ae8c82eb2781` (G2 merged main). Issue #15, master #11.

`PostureState` is an isolated transition contract. It is deliberately **not imported
by main.js**. Gameplay remains the accepted G2 build until the physical controller
passes its gates. Unit samples are not proof of balance, contacts or get-up.

## States and sensor boundary

The future controller supplies fixed-step seconds, round phase/pause, torso local
up's world Y component, head height in metres, aggregate speed/angular speed,
real supporting contacts, ground contact, grip/hit, supported pose, obstruction,
arena exit and physical readiness to rise. Physics remains Rapier-owned.

| State | Exit / guard |
| --- | --- |
| preparing | ready/active enters standing; preparing resets all history |
| standing | 0.10 s continuous weak disturbance → swaying; 0.18 s strong tilt, low head or support loss → falling |
| swaying | supported upright quiet stance for 0.60 s → standing; strong disturbance → falling |
| falling | ground contact + horizontal torso + low linear/angular speed for 0.80 s → lying; supported quiet upright recovery for 0.60 s → standing |
| lying | back/belly + verified physical readiness, no grip/hit/block → rising |
| rising | grip/hit → falling; block → lying; quiet supported upright stance for 0.60 s → standing |
| recovery | explicit reason; no automatic success transition or hidden body reset |

Thresholds: weak tilt upY < 0.985 / speed > 0.18 m/s; strong tilt upY < 0.65
or head < 1.30 m. Standing exit guard upY > 0.94, head > 1.80 m, speed < 0.12.
Lying requires upY < 0.45, speed < 0.25 m/s, angular speed < 0.70 rad/s and contact.
Back/belly must be measured from orientation, not assigned by a timer.

Pause and ended rounds freeze time and transitions. Reset clears deadlines/reasons;
disposed instances ignore updates. The independent arena-exit deadline survives
posture transitions. Holding suppresses both get-up and recovery reset scheduling.

Recovery requests: unheld arena exit after 0.50 s, unsupported resting pose after
3 s, blocked lying path after 4 s, unsuccessful rising after 8 s. A future UI must
display the reason/countdown before any recovery reset; that execution is **not
implemented** here. Recovery must not count among normal get-up cycles.

## Experimental physical boundary

Run `node tests/posture-experiment.mjs` and `node tests/getup-experiment.mjs`.
Optional first argument writes JSON results. These explicit investigations are
outside `npm test` and outside the production bundle; a zero script exit means
the measurements ran, **not** that G3 passed.

Both use locked Rapier 0.21.0, existing G1 masses, colliders, 14 joints/limits,
gravity and 1/60 s stepping. Bodies stay dynamic. No transform writes, velocity
overrides, world-anchored joints, gravity compensation or reset after a fall.
Standing motors: force-based PD 100 Nm/rad / 12 Nm·s/rad, capped 12 Nm per axis.
Balance applies at most 24 Nm internally between pelvis and actual supported feet,
with exactly opposite reaction torque. Get-up probes allow hands as supports,
cap joint axes at 20 Nm, and ramp hip/knee targets back to the bind pose over
6/8 seconds. They fail; this is not the final motion design.

Rapier 0.21's spherical descriptor returns a Generic wrapper. The investigation
uses the exported SphericalImpulseJoint facade over the existing handle; it creates
no extra joint. This compatibility workaround is confined to the experiment.
No G1 anatomical-limit promise changes. No G2 spring/throw/input changes.

Sixteen additional solver iterations are an experimental candidate, **not a
new production budget**. Future integration must restore prior values before
G2 grab begins and on disable/reset/teardown, and measure browser CPU cost.

## Contact-assisted candidate (continuation of PR #29)

`ContactGetup` and `observeGetup` remain **experimental and unintegrated**. Neither
is imported by `main.js`. `tests/getup-fixture.js` reproduces the original 0–14 s
standing/head-impulse/fall protocol with Rapier, without assigning a fallen pose.
Its budget normalization at 14 s changes no pose/velocity. Each independent trial
is a new fixture, not a successful gameplay cycle or recovery.

Observation uses world COM and mass-weighted velocity, upward floor contact
impulse / fixed-step seconds, loaded contact points (>0.5 N), convex XZ support
hulls and signed COM margins. A point/line has no support area (`-Infinity`, JSON
`null`). A geometric hull is necessary, not sufficient for load-bearing support.
Axis twist diagnostics are wrapped to ±pi; they are not Euler angles or shoulder
anatomical limits. Arm/head and arm/torso self-contact loads are diagnostic queries.

The stricter success observation requires upY >0.94, head >1.80 m, COM speed
<0.12 m/s, every body speed <0.25 m/s and angular speed <0.70 rad/s, foot normal
load >70% of weight, foot COM margin >−0.02 m, continuously for 0.60 s.
**No candidate trial reaches this state.** The additional motion quietness checks
avoid cancellation of moving limbs in an aggregate COM measurement.

| Candidate phase | Physical guard / action | Evidence |
| --- | --- | --- |
| plant | reach-limited spatial shoulder/elbow and planar hip/knee goals; actual lower-leg pitch drives limited ankles | reaches loaded hand/foot contacts |
| transfer / await-support | combined support >0.02 m, feet >15% + hands >10% of weight, COM speed <0.25 for 0.20 s; before lifting, remaining support has positive area/margin, >60% weight and head <5% weight for 0.20 s | back stalls, then aborts |
| lift / move / land | actual eight-corner foot clearance >0.02 m; foot within 0.06 m of COM-relative goal; actual foot load >20% weight for 0.20 s | belly comparison reaches lift but aborts on support loss; no completed placement |
| extend | foot load >65%, positive foot margin and upY >0.65 | not reached; motion is a candidate, not a verified transition |
| stand | quiet foot-supported observation for 0.60 s | not reached |

Joint goal changes are capped at 2 rad/s. Existing G1 geometry/masses/14 joints,
hinge stops and nonadjacent self contacts remain intact. Force-based angular PD
100/12 has **20 Nm maximum per spherical axis** (resultant can reach 20√3 Nm),
12 Nm for default non-placement joints. Spherical targets use a relative quaternion
in the native joint frame and zero angular motor targets; assigning three independent
quaternion twists was experimentally inaccurate. These are joint-frame writes,
not body transform writes. Internal upright/reaction torque is capped at 24 Nm
and is deferred until both foot placements complete. No fixed-world connection,
external lift force, body velocity write, teleport or recovery reset is used.

After loaded plant, observed hand world positions are retained as goals across torso
motion; these are motor IK goals, not world-anchored constraints. The final native
regression checks real hands within 5 cm at 2 s while the torso moves.

A 0.04 m bounded virtual hand-extension bias is used while the head carries load
in transfer; it asks bounded motors to press on the floor, never writes a hand below
it. It establishes only transient remaining support (0.05 s in the back snapshot),
then exceeds the shared arm/leg workspace; it does not reach sustained foot support. Placement outside maximum
reach +0.02 m for 0.50 s aborts. Each foot placement times out after 4 s; a whole
attempt after 12 s. Support loss for >0.10 s aborts. Hold, hit and declared blockage
stop the candidate; these flags are not yet connected to gameplay collision/input.
There is no implemented clearance query for blocked rising or visible recovery.

Exclusive controller ownership is required: stop posture **before** `ContactGrab.begin`,
reset, rig removal, round switch or world teardown. Stop disables every owned motor,
clears controller torque, restores original joint frames and per-body solver values;
repeat stop is harmless. Pause disables actuation/restores budget without advancing
phase time; resume reinstates the captured candidate budget. Do not construct/resume
this controller over an active G2 grab. Twenty explicit ordered handoffs test original
3 → candidate 19 → restored 3 → articulated G2 7 → restored 3. This tests the ownership
contract, not a completed game integration.

Sixteen additional iterations remain a fixture candidate. They improved the older
standing fixture (0.234 m/60 simulated s drift), but **neither 0 nor 16 solves this
get-up**. Windows Edge CPU call measurements show a substantial active solver cost;
there is no basis for adopting +16 in production now. See `g3-review.md`.

Reproduce: `node tests/contact-getup-experiment.mjs <output.json>`; exit zero only
means measurements completed. `npm test` includes failure/cleanup regressions,
not G3 acceptance. Build `tests/getup-browser.html` as a separate Vite production
entry (input that file, `emptyOutDir:false`) to inspect live Rapier fixtures with
stepwise views. This QA page is absent from the normal production entry/build.
Ordered Windows-Edge screenshots and call timings: `g3-evidence/`; sampled physical
trace: `g3-contact-experiment.json`.

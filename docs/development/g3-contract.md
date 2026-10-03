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

# Review against main d4da312 — #32 / #33–#37

## Spec

All five bounded gates covered; independent entry/core, SI/taxonomy/lifecycle contracts,
validated passive rig, calibrated actual contacts/normal loads, immutable schema export,
five same-host fresh-world runs and browser evidence. No motors, balance, get-up, rig
campaign, optimization or production integration. Corrective 4→8 solver choice was made
once in Gate B for constraint validity, documented before baseline freeze; repeatability
tolerances untouched. Passive first handL contact at step 70 is failure data, not standing.
Legacy PR #29 and production files untouched. Examples labelled synthetic; final measured
results include dirty/content provenance and distinguish evidence commit from code SHA.

No open in-scope functional finding. Limits: no 60-s standing solution; unrestricted
spherical shoulders/hips; contacts have dt/narrow-phase resolution; predictive contacts
excluded, not a measurement of all solver support; tangential data/CoP omitted; timing
statistics exclude other validation/export overhead and GPU. Native hidden-tab transition
not observed under available automation; visibility event handler + clock and actual tab
switch with paused state checked. Android hardware, cross-host reproducibility, sustained
GPU/heap profiling and live Pages deployment not claimed.

## Engineering

Reviewed complete diff and transitive core imports; config schema has runtime semantic
checks, frozen clones and stable IDs independent of meshes/handles. Initial exact shape
queries, shape-derived inertia, all dynamic bodies and adjacent-only contact suppression
validated. One World.step path, bounded clock; checkpoints/result do not mutate physics.
World/EventQueue freed as whole, maps cleared and retained references rejected; resource
counts stable for 20 resets. Render objects reused across reset and explicitly disposed
on destroy, one animation loop/listener installation. Pages relative paths verified in
production artifact, desktop/touch landscape controls accessible, no console/network
errors. Tests retain production G1/G2 regression coverage; no workflow changes.

Findings fixed during gates: stale documented Rapier contact defaults corrected via actual
getters; insufficient four-iteration convergence corrected with single eight-iteration
test while retaining bounds; async result/reset race prevented by synchronous capture;
terminal Resume now stays paused. QA server root-index resolution bug fixed before final
run; this was harness-only. No surviving P1/P2 engineering finding. CI for final head is
reported externally in #32/PR, avoiding a self-referential evidence commit.

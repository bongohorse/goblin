# Issue #41 blocked handoff

Base: 06b520628502593d034485ee21fb8428daa6781b. Branch:
feat/standing-native-motor-baseline. Gate A contract a3ca1cf, Gate B native helper and
real fixtures 05b79a2. Code/evidence heads are recorded in Issue #41 after commit.

## Spec

**P1, complete native baseline acceptance, unresolved:** the reference neutral full-rig
hold100/12/20 terminates invalid at step110, constraint_error:ankleL. The single
predeclared cap-only safety correction20 ->1 Nm also terminates invalid, step140,
constraint_error:elbowR (limit violation .072396600 rad vs unchanged .05 bound).
Both have standing_time=null. Observed counter times1.833333/2.333333 s are not accepted
standing times. Identical invalid runs would not pass the existing repeatability gate.

Steps A/B are implemented and tested: supported native calls/declared constructor
adapter, moving-frame convention, positive/negative tracking, asymmetric hinge limits,
combined/rotated spherical targets, measured cap and unequal-inertia counterreaction.
The spherical factory mismatch is bounded by the explicit same-handle public constructor
view and its descriptor/count/freedom fixtures; no raw motor calls or physics-mask change.

Gate C remains incomplete: no accepted neutral motor baseline, selectable motor UI,
v2 runtime result reader/export, five accepted motor runs or two-mode browser QA. The
trial runtime integration was removed; only diagnostic helpers/fixtures/script and
research evidence remain. Do not merge this work as a complete Issue #41 feature.
Passive controller_id:none/schema-v1 are never used to export active diagnostic runs.
Motor schema-v2 in motor-contract.md is a plan, not implemented acceptance evidence.

## Engineering

Joint-limit diagnostic is independently verified by the isolated hinge tests. Native
motors obey fixture caps and opposite angular momentum; that does not prove loaded
14-joint solver convergence. Full-rig contacts/limits prevent attributing body deltaOmega
to actual motor effort; full-rig effort/saturation remain unavailable, no invented Nm.
The remaining cause of loaded-chain limit error is not established. Do not claim that
all native motors or every possible bounded gain configuration are impossible.

Passive rig/startpose/config/schema-v1/dt/solver8/materials/masses/inertias/limits/contact
rules/tolerances and production/PR29/package files have zero diff against base. Fresh
passive run reproduces70 Steps /1.1666666666666667 s /handL and original checkpoints.
42 Node tests pass; production build passes with existing large shared Rapier warning.
Build success is not a Gate C pass. No new UI/browser/Live/GPU/Android evidence claimed.
The existing native hidden-tab QA limit is unchanged.

## Reproduce and resume gate

Use Node24.21.0 and npm ci. Run `npm test`, `npm run build`, then
`node scripts/standing-motor-diagnostic.js`; optional GOBLIN_MOTOR_DIAGNOSTIC_OUTPUT
writes the JSON report outside the checkout. Diagnostic exits2 intentionally when the
motor runs are invalid. Two exact documented cases, no generic sweep or alternative
world.step implementation. Every diagnostic calls the existing simulation step and
frees its world; passive checkpoint comparison uses the original review baseline.

Resume with a specifically bounded loaded-chain diagnosis that separates constraint
measurement, contact load and native motor convergence. Keep the passive configuration
and its safety/repeatability thresholds fixed. No more unbounded cap/gain variations,
model-A/B, solver changes, target-system switch or balance feedback to conceal this
failure. Any necessary scope change needs its own explicit decision. After resolving
the primitive, finish Gate C/versioning/five runs and clean browser/CI/Draft evidence.
Until then Issue #41 remains open with this blocker, no finished Draft PR or deployment.

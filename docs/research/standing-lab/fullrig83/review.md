# Issue83 planning self-review

2026-10-08. Same assistant, explicitly self-review; no independent human approval.
Fixed base2abd3db7a339666a6ca0fc1d5618712cd4d6f09c, documentation only.

## Spec

No open finding in the planning scope. Actual dynamic15-body topology, masses,
local frames/hinge limits, existing ForceBased target ownership and contact
measurement sources read and source-pinned. One torso/pelvis internal pair
selected. Roll limitation retained rather than assuming a spherical spine.
New gains/cap use explicit shape-inertia/low-bandwidth/input design scales;
no SmallTilt gain/cap transfer or effectiveness guarantee. One-step free32 and
6s fb32 questions separated, four fixed starts/90 exact IDs/five fresh repeats,
true API fault controls, no post-terminal/global-blocker continuation.

Plan findings fixed before publication:

- **P2, protocol matrix/decision:** requiring motor-free6s standing would
  conflate a command control with a pose-supported test and often block the
  actual combined-controller question. Free32 is exactly one-step diagnostic,
  fb32 retains actual360-step behavioral observation; no one-step extrapolation.
- **P2, protocol negative controls:** a two-body DeltaH discriminator cannot
  transfer to gravity/contact/damping/native-motor FullRig. Faults are actual
  wrong-sign/missing-pelvis public inputs detected by PRE/readbacks, physical
  outcomes descriptive. No invented physical momentum pass bound.
- **P3, execution-handoff preflight:** npm test contains world-creating
  regressions. Pure preflight/measurement budget and any later explicitly
  authorized regression allocations must be separate; Issue83 runs none.

All limits are preregistered experimental requirements with geometry/mechanical/
quiet-stance rationale, not fitted engine envelopes. Native effort/saturation,
work attribution/CoP remain N/A; actual normal foot loads remain measurable.
Time criterion is six seconds only; no #30/31 acceptance is silently narrowed.

## Engineering

No implementation/runtime/CI/Pages/vendor/dependency/baseline changes. The
new experiment cannot be projected into old exact-v1/v2/v3 validation identities;
new research schema/namespace and init-before-audit adapter contract specified.
Persistent torque accumulators/reset/wakeup/one-step lifecycle and strict caps
are explicit; On/Off share all15-body wake policy. Native motor axis caps and
unknown solver effort are separated from measured direct vector commands.
Strict reader must recompute every sampled peak, support window, prefix stop,
terminal/case/repeat and source identity, with meaningful coherent corruption
cases; no tests added for pure prose.

Validation: plannedIDs uniqueness/order/repeat counts/world+step budgets checked,
pure capsule numbers/geometric clearance and specified formula constants
recalculated, relative documentation links/source pins/new manifest coverage
checked, git diff whitespace and docs-only scope checked. Existing149 manifest
entries and91 SmallTilt source pins checked without any world. Build/browser/
new physics tests N/A for prose/static plan data; no build-relevant file changed.
Actual PR CI result is reported on GitHub, not inferred here.

Decision **ready_for_scoped_execution**, solely as preparation. No claim this
small input will overcome20Nm native motors, a spine roll lock or gravity.
Any no-gain/safety/measurement failure remains a first-blocker handoff with no
automatic tuning. Future execution ticket blocked until reviewed plan and
explicit new execution authorization. Draft only; no merge/deployment or world.

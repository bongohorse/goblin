# Standing Lab foundation v1 — Gate A / #33

Scope: #32, one passive rig; no motor, balance, recovery or production integration.
Sources checked: main `d4da312c1aa0418e30c6cfa7a3924e0ae2ac7deb`, PR #29
`57eb17c23884c6b8d94dd679b88447c2fc164f81`; all four research documents,
labs.md, issue #30/#31 and their comments (none). See ../standing-legacy-baseline.md.
Lock and installed package: Rapier JS 0.21.0, Three.js 0.186.1. Read-only upstream
`b716d375efc0201003f0cd9ef7168eee0b62c177` (js-v0.21.0 / Rust 0.36.0).
Installed `dist/*.d.ts` is authority; pinned TypeScript changelog checked.

## Four contracts

1. SI: metres, kilograms, seconds, radians; Y up, +Z forward, character-left +X.
   Right-handed coordinates; quaternion `{x,y,z,w}`, active local-to-world rotation.
   Body positions and COM are world-space. Shapes/anchors/axes are body-local.
   Contact points are world-space; reported normal points from floor into body.
   Normal impulse is nonnegative N·s; upward normal load is impulse/dt times normal.y, N.
2. Body IDs in baseline-config.json retain legacy spelling, bijectively.
   `footL` and `footR` alone have class `foot`; all others `non_foot`.
   Collider IDs are `collider:<body_id>` plus `floor`; joint IDs retain legacy IDs.
   Mesh names/handles never classify contacts. Sorted body IDs select canonical failure.
3. Only `simulation.step()` calls world.step. dt = 1/60 s, limit = 3600 steps = 60 s.
   This matches the runtime target and existing 0.21 fixtures, not render cadence.
   Rapier defaults explicitly frozen: 4 solver iterations, 1 internal PGS, 1 CCD substep,
   lengthUnit 1, allowed linear error .005 m, prediction .02 m (installed runtime
   getters checked in Gate A: .004999999888 / .019999999553; docs default .001 is stale). Extra body iterations 0.
   Auto-run uses a separate lab clock with at most 3 ticks/frame, discards excess time;
   pause/resume/reset/visibility change clear accumulator and previous timestamp.
   Single-step invokes precisely the same path once. Time = counter × configured dt.
4. Validate and deep-freeze config → new World and EventQueue → rig → step-0 observation
   → run → deep-frozen result → dispose. Reset frees old World and EventQueue, clears
   every handle map and trace/timing/counter, creates a new run ID and entirely new world.
   UI stores IDs, rebinds to current snapshot; renderer objects can be reused. Destroy
   removes listeners/loop and explicitly disposes owned Three.js resources.

## Rig and transfer decisions

The full table in baseline-config.json is the sole v1 physical specification, including
shape dimensions, masses, initial transforms, joint anchors, axes and limits. 15 dynamic
bodies / 14 joints / one standalone static floor collider, no fixed dynamic proxy.
Total mass 9.06 kg. Large head and compact limbs preserve the Goblin proportions.
Uniform shape-derived inertia; collider.setMass only, no additional body mass/density
override. Positive masses/inertias, COM at symmetric shape centre, inertia formulas
checked against Rapier (sphere 2mr²/5, box m(h_j²+h_k²)/3; capsule checked with pinned
Parry formula). Damping .35/s and 1.3/s preserve bounded passive fixture behaviour;
not selected to obtain standing. Restitution .03, floor friction .9, feet 1, others .7,
default Average combine rule. No contact skin, no sensors, no collision group exclusions.
Adjacent partners only: joint.setContactsEnabled(false), all other self contacts enabled.
Foot bottoms start .02 m above floor; there is no timer grace period.

Deliberate correction: legacy arms are rotated ±.55 rad about Z, but the single revolute
local +X axis is supplied for both partners. At wrist the orientations agree, at elbow
they agree, but spherical shoulders have no hinge axis; retaining the rotated arms is
actually axis-consistent. Nevertheless arms are put in a straight, identity-rotation
relaxed pose at ±.40 m, with shoulder/elbow/wrist at y=1.64/1.28/.96 and segment centres
y=1.46/1.12/.85. This is an explicitly different starting pose to make all hinge angle
zeros transparent and avoid asymmetric joint-frame assumptions in later diagnostics.
No claim that the legacy arm pose is defective. Masses/shapes/limits unchanged.
Historical motor and standing results therefore cannot be numerically compared directly.
Hip and shoulder spherical DOFs remain unrestricted (3 rotational DOFs), a documented
anatomical limitation; all other joints have one rotational DOF around local +X and
explicit legacy limits. No unsupported spherical limit bridge. Hinge angle uses actual
joint frameX1/frameX2 relative twist, quaternion sign independent, in radians.

Gate B validates anchor congruence (<1e-6 m), axis alignment (<1e-6), initial hinge limits,
mass/inertia and actual shape queries: no forbidden nonadjacent penetration >1e-6 m.
Analytical mass/inertia tolerance 1e-5 relative/absolute. Passive run anchor gap bounded
by .08 m, limit violation .05 rad; exceeding either terminates invalid (not standing).
Lost body, nonfinite state, |position| >20 m, speed >50 m/s, angular speed >200 rad/s,
or non-unit quaternion error >1e-4 likewise invalid. These are anomaly bounds, not
standing acceptance thresholds. No sweeps or new rig variants.

## Module boundary

`labs/standing/index.html` is a second Vite input; relative base supports `/goblin/labs/standing/`.
`src/labs/standing/` imports only Rapier, local independent math/config/schema modules
and static JSON. Browser adapter alone imports Three.js/DOM. No import of src/runtime.js,
goblin-rig.js, main.js, gameplay, recovery or get-up; recursive import regression required.
Config copied as reviewed static data; no runtime production rig dependency.

## Measurement and availability

Supported APIs: World.contactPair(manifold, flipped), contactDist, contactImpulse,
localContactPoint1/2, normal, Collider.contactCollider; body.mass/worldCom/linvel/angvel,
principalInertia, joint anchor/frame getters. No raw bridge required.
Actual post-step contact = manifold point with contactDist <= 0; strictly positive
predictive separation is excluded even if impulses exist. Load sums only those points,
so predicted support is not counted as actual support. Use flipped to select body-local
point and floor→body normal correctly. No reliance on solver contact index matching.
At step 0 narrow phase has not run: public exact shape query contactCollider(floor,0)
with distance <=0 proves existing contact without advancing state. Start load is null
with status `unmeasured`, never invented zero; after a step absence means measured 0 N.
Calibration in Gate C must prove signs, units and ordering with a known 1-kg body and
offset COM. Tangential impulses are excluded: PR #29 demonstrated unreliable zero
getters under friction. No CoP until load calibration; CoP optional and omitted in v1.
Post-step manifold geometry belongs to the last narrow phase (dt resolution), not an
invented substep timestamp. Floor-body contact, not collision event alone, ends run.

Check all bodies before start and after every step. Existing non-foot contact => invalid
start at time 0, failure_step 0 and all matching IDs. First non-foot post-step contact
is a valid passive failure; save all sorted IDs once, canonical first, stop immediately.
Contact at step 3600 wins over timeout. Timeout means only “60 seconds without non-foot
contact”, no full standing/production success claim. Physical fall cause remains unknown.

COM = sum(mass * worldCom) / sum(mass). Velocity = sum(mass * linvel) / sum(mass):
Rapier's `linvel()` is already the mass-centre velocity. The offset-COM fixture checks
it against `velocityAtPoint(worldCom())` and actual COM displacement over a free step.
The former omega-cross-offset term was an implementation/calibration defect corrected
in #39; the intended world-space COM-velocity field and symmetric baseline are unchanged.
Drift = horizontal
XZ distance of COM from step 0. Pelvis/torso quaternion is world orientation. Passive
joint data = anchor gap, hinge twist/limit violation and hinge-axis misalignment; spherical
limit/twist null with N/A. Motor tracking/saturation explicitly N/A. Physics timing brackets
only world.step; observation timed separately; count/min/mean/p95/max in ms, no rendering.

## Schema and provenance

Draft-07 schemas version 1, reject extra fields. Config is fully embedded in each result;
IDs use SHA-256 of recursively key-sorted canonical config JSON (`config:sha256:<hex>`),
experiment ID `passive-v1:<same hex>`; rig ID `goblin-passive-v1`. UUID per run, index 1..5.
Any meaning change requires new schema_version; config mutations create a different ID.
Result fields and telemetry units are specified in schema descriptions; null = unavailable
or inapplicable as stated, never implicit success. Failure/timeout/invalid examples are
synthetic contract examples labelled as such. `standing_time` on invalid numerical state
is null; `observed_time` preserves counter time. A paused partial export has termination
`incomplete` and standing_time null. Build provenance includes git SHA, dirty flag,
build_id and runtime/platform strings. Commit SHA refers to code that ran, not later
evidence commits. No silent unknown provenance in final evidence.
The build digest includes path-delimited contents of src/, labs/, public/, tests/,
scripts/, index.html, vite.config.js, package.json/lock and three Lab config/schema JSON
files. Evidence/docs are excluded. Vite and Node use the same helper.
`validateResult` rejects missing/inconsistent measurements and checkpoint taxonomy;
`validateResultProvenance` additionally recomputes the embedded config SHA-256. Neither
claims a third-party signature or proves arbitrary supplied git/platform metadata.

## Predeclared five-run tolerances

Same host, Node/package/build/config; new world each run. Termination/reason and all first
contact IDs exactly equal; step tolerance 0, time tolerance 1e-12 s. Checkpoint states at
0,1,10,30,60,terminal; unreached checkpoints explicit. Position 1e-6 m, angular distance
1e-6 rad (`q` and `-q` equivalent), linear velocity 1e-6 m/s, angular velocity 1e-6 rad/s;
contact IDs/counts exact, points 1e-6 m, loads 1e-5 N. Compare normalized quaternions.
UUID, timestamps and CPU timing excluded. No cross-host determinism promise. Violations
remain open; do not widen tolerances after running. Browser render-on/off comparisons
use the same step sequence, separately from Node same-host gate.

## Gate A review

Spec: contracts/config/schemas/examples cover #33; no physics implementation. Engineering:
static config independent, sources pinned, public required measurements available, load
calibration remains a Gate C requirement. Browser N/A for documentation. Schema and
anchor/mass consistency checked before commit. Subsequent gates must record runtime
getter validation and any spec correction before experiments, never retrospectively tune.

## Gate B corrective solver decision — before canonical freeze

The Gate A four-iteration proposal fails the unchanged .05 rad constraint bound at step
30 (ankleL .06217 rad); a 900-step diagnostic continuation (not a standing result) shows
peak .19133 rad wristR at step 83, anchor gap .020405 m. No mass/inertia/anchor/axis or
initial penetration defect found; isolated torque/hinge fixtures respect stops. Hypotheses:
bad initial constraints (rejected by audits), angle getter error (rejected by independent
quaternion fixture), insufficient convergence under coupled impacts (supported).
One bounded corrective test, 8 solver iterations, reduces 900-step peak violation to
.024166 rad and anchor gap .009360 m. No sweep and no controller/standing optimization.
Adopt **8 solver iterations, 1 PGS, 0 additional iterations**, all other parameters unchanged.
Config and schema revised explicitly before canonical five runs. Repeatability tolerances
and .05 rad/.08 m safety bounds are unchanged. The baseline is frozen after Gate B;
the historical four-iteration probe is not accepted baseline evidence.

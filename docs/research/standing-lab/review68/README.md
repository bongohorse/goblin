# Issue #68 — stacked reference review, 2026-10-07

Agent self-review using the code-review, research and diagnosing-bugs skills. Independent mathematical crosscheck means a separately implemented formulation, not independent human approval. Original review targets: #65/909d0ae against fixed main af2c78adf33071b460e2f84361128e36298025a1; #67/d591bfc against exact909d0ae. Actual remote heads/base matched. Fixed #65 head e4d6d0a includes reader fixes and documentary errata; #67 is rebased onto it. Final hashes and final-head CI are recorded on #68 and both PRs. No production source, baseline, dependency, vendor, workflow or browser configuration changes.

## Spec

- **PR65 P2, resolved:** torso-torque60-protocol.md first-step case paragraph specifies roll-0.4, whereas torso-torque60-fixtures.js firstStep/verifyFirstSteps execute roll-0.08. The raw quaternion confirms the latter. This is a real preregistration discrepancy. README erratum explicitly limits the evidence to the executed fixture; no historical protocol/data/flags rewritten and no replacement experiment. The blocker handoff remains useful, but it does not certify the unexecuted-0.4 case.
- **PR65 P2, resolved:** oracle.js rotationBound and original protocol/README describe a physical resolution/integration bound. The formula only bounds the spin tensor change, plus the old marker; it omits orbital lever-arm changes and uses measured POST data. Our paired reproduction gives a nonzero omitted orbital correction up to1.8467764703681896e-9kg*m²/s. README now states the limited diagnostic meaning. Neither it nor a POST residual below it proves a general finite-step or engine bound. Historical bound fields/False results remain exactly unchanged.
- **PR65 P1 physics acceptance blocker, retained:** original8 impulse positives/16 torque misses/negative and original#54 strict-false probe are still exactly reproduced; controller tracking and complete Gate C remain unperformed. Positive detection flags for expected negatives are not physical paired passes.
- **PR67:** no remaining reference-equation/spec blocker in this bounded one-step scope. Initial inputs are checked against the original fixture; reference normalization and double anchor alignment are explicit, not endpoint fitting. Twelve analytical/conservation/constraint controls and17 torque references reproduced. Initial quantization sensitivity is separate from unknown engine accumulation/ERP effects. The1e-10 reference budget is conditional fixture reporting uncertainty, not a theorem or engine threshold. Roundoff-plateau differences do not establish an observed RK4 slope.

## Engineering

- **PR65 P2, fixed** in reader.js validateFirstSteps: accumulator_error and anchor_initial_error were trusted scalar fields. A1Nm accumulator corruption and zeroed anchor metric passed the reader before the fix. Recompute both from their raw inputs and validate requested direction/cap. Regression tests reject these alterations after the fix; unchanged historical reports still validate. Inverse-tensor scalar is not an independently stored matrix proof; actual public tensor comparison is freshly reproduced by verifyFirstSteps.
- **PR67 P2, fixed** in reader.js readDiagnosis: invalid run_id and POST quaternion scaled by2 were accepted. Normalized reference math hid invalid raw orientation. Validate raw field sets, positive masses/inertias, unit quaternion norms within Float32 observation tolerance, UUID shape and complete provenance fields. Move protocol/original-file hash checks into the exported reader, so imports and CLI share these checks. Corruption tests also reject both hash alterations. A metadata reader is not a signature or proof that an arbitrary host state sequence is authentic.
- Worlds are fresh per case/refinement/repetition and disposed in finally. Each public step resets and adds paired constant WORLD torque in Nm, without a dt factor, then clears; actual float32 dt times m equals the same T exactly. No solver/gain/rig adjustment. Mass recomputation occurs before observation. Zero-mass pilot and nonunit-initial-velocity pilot remain preserved/excluded. Browser N/A: changed behavior is CLI/WASM evidence validation, no runtime/input/rendering change.

## Independent equation review and crosscheck

For active body-to-world R, principal frame P and diagonal D, Iworld=R*P*D*P^T*R^T. World Euler equation is I*alpha=tau-omega cross(I*omega)+r cross f. Quaternion derivative .5*(omega,0)*q multiplies on the left for world omega. Centripetal anchor acceleration is omega cross(omega cross r). With force lambda on body1 and -lambda on body2, equality of anchor accelerations yields K*lambda=-b, K=(1/m1+1/m2)Id-S(r1)I1^-1S(r1)-S(r2)I2^-1S(r2). The negative signs make K positive definite for positive masses/inertias. Spin torques and COM orbital forces sum to (x1+r1-x2-r2) cross lambda, zero at a common anchor. Constraint power is lambda dot(anchorVelocity1-anchorVelocity2), zero for consistent velocities. Thus total Hdot=sum(tau) and Edot=sum(tau dot omega); individual spin changes alone need not equal tau*T.

[Own crosscheck script](../../../../scripts/review-torso-reference68.mjs) implements Rdot=S(omega)R and Ldot=tau+r cross f, with world L as the state and omega=Iworld^-1L. It has no reviewed reference-math imports, no quaternion stepping, no normalization/projection during integration, and uses Cramer's rule instead of the reviewed pivoted3x3 elimination. Newton/Euler gyro appears when differentiating omega=I^-1L, not as copied alpha code. Classical RK4 stages use independent matrix/tensor operations. Initial positions and moving-fixture velocities are taken from the documented PRE/analytic seed, never Rapier endpoints. PRE-derived mass/tensor inputs were verified against the physical configuration first.

Own Rodrigues analytical solutions test the isotropic and principal-axis controls. All12 controls and17 torque cases are checked at16/32/64/128/256 resolutions, with independent H/P/energy-work/orthogonality and connected position/speed/acceleration constraints. Maximum angular endpoint difference from the reviewed quaternion reference6.76538e-15rad/s, rotation-matrix difference2.15090e-15, H residual1.77375e-16kg*m²/s, energy-work residual4.11997e-17J. These are finite-fixture crosschecks; they do not prove a global order or universal bound. Raw result: independent-reference.json.

## Fresh measurement and provenance review

Original CLI expected exit2/status blocked. first_steps, all five repetitions and historical_native_probe exactly match the original physical JSON payloads. New diagnosis successfully reproduces all425 observations (17×5 refinements×5 fresh worlds) and the complete validation/reference/repetition payloads of d591bfc. Reader/hash/source corruption checks and manifest hashes pass. Old PR65 protocol/raw files and PR67 diagnosis/protocol remain unchanged; fresh review measurements live under this new directory and identify their own clean code heads/build digests. Reader-only changes alter build digests but not measured physics; the complete relevant evidence is rerun at the corrected clean harness. Historic evidence heads remain valid historical identifiers, not silently replaced by new heads.

Installed Rapier0.21.0 sourcemap and matching pinned b716d375 local sources were read. All9 source-evidence file hashes match; pin remains unchanged. Public world.step forwards once through PhysicsPipeline/raw Rust binding to staged solver. For this no-contact/no-CCD/extra0 fixture, group num_substeps=num_solver_iterations+extra=32 and temporal dt=T/32; worker applies increments/gyro, updates constraints, runs internalPGS1 and integrates positions each stage. This supports32 temporal stages only on this actual path. It is not32 public steps, CCD divisions or a cross-version API guarantee. Installed declarations and mass/torque lifecycle match the harness.

Paired angular/H maxima at m=1/2/4/8/16:

|m|angular rad/s|physical H kg*m²/s|
|---:|---:|---:|
|1|1.0560269743758851e-4|1.2551022966893554e-6|
|2|6.40079e-5|7.57478e-7|
|4|3.76917e-5|4.09066e-7|
|8|2.92519e-5|2.23148e-7|
|16|4.6670109189171775e-5|1.422756964336696e-7|

Canonical values confirmed, not corrected. Nonmonotone velocity confirmed. No universal Float32 floor or Rapier defect inferred. All missing-countertorque measurements fail paired-H (>100×marker), while matching an unpaired external-torque reference is expected. Wrong-frame control is an independently integrated reference-torque perturbation, not a deliberately wrong Rapier command run; its >=.0125604rad/s separation tests reference frame sensitivity only. Input representation sensitivity <=3.18293e-7rad/s is distinct from engine residuals and initial anchor ERP sensitivity. PRE pseudo-H freezes tensor/COM; POST H uses simultaneous q/omega/x/v with spin+orbital terms. No old flag or marker is reclassified.

Existing regression-only full rig results remain passive70/handL, FB20=3600/timeout, FB1=187/both hands, all checkpoint/velocity/contact differences0. Targetstudy22 hashes/20 readers unchanged. Local complete tests/build and final-head CI are linked on #68; known build chunk warning only. No new FullRig balance run.

## Two separate decisions

**Restricted research merge recommendation: suitable after these fixes and final CI, in stack order65 then67.** The preserved blocker report and independently crosschecked reference are useful research artifacts with low runtime blast radius. Rollback removes/reverts the CLI/test/docs stack. This is a recommendation only; both PRs stay Draft, no merge performed, no independent human approval claimed.

**Physics/Gate-B approval: not granted.** Continuous endpoint and contemporaneous physical POST-H are suitable future comparison objects, with instantaneous impulse controls retained separately. Their suitability does not set an engine acceptance budget, validate the PD controller or release#60. Do not fit a new threshold to the observed residuals, select m8 for looking best, or relabel old16False/#54.

Next smallest separate task: preregister a physically justified Gate-B error requirement and protocol for the original bounded two-body primitive, explicitly choosing frames and separating endpoint tracking accuracy, paired POST-H, reference/input uncertainty and unresolved ERP/discrete effects. Derive permissible errors from the intended physical measurement/use, not maxima in this report; retain canonical timestep and frozen solver/gains/rig. If that derivation requires attribution of residuals, stop at a narrow fixed-case integration/rounding/initial-anchor diagnosis before acceptance. New gate measurements and any later upright work require an explicit separate decision. FullRig work additionally requires secondary standing criteria and pose-motor conflict policy.

## Reproduce

Node24.21.0, locked dependencies. Use a clean checkout and output outside it:

    node scripts/torso-torque60.js <outside>/original
    node scripts/finite-step66-diagnosis.js <outside>/diagnosis
    node scripts/finite-step66-reader.js <outside>/diagnosis/diagnosis.json
    node scripts/review-torso-reference68.mjs <outside>/diagnosis/diagnosis.json <outside>/independent-reference.json
    node scripts/torso-torque60-regression.js <outside>/regressions.json
    npm test
    npm run build

First command must exit2; other review commands must pass. sha256.json covers review artifacts, including the fresh raw reports and separate reproduction/hash/source summaries. No merge, deployment, engine upgrade, upright/COM/FullRig experiment or#60 resume. Stop after this review.

# Issue84 observer repair and fresh bounded matrix — measurement v2

Read/ported main working rules at fb8c1e7f2e96cdcf60967f6d7f6aef6051786b76 (AGENTS.md and docs/agents/development-workflow.md). This replaces the contact measurement only, not the frozen #83 controller/rig/solver/starts/limits. Historical exports, schemas and source pins remain byte-identical.

## Measurement contract

Version: current-geometry-interval-support-v2. Current touching is the deepest support point of the actual observed ball/capsule/cuboid against the fixed floor top plane, computed from normalized current collider quaternion, current position and public observed dimensions. Strict gap <=0; no new tolerance in the contact predicate. The whole shape must be inside the large floor footprint; edge ambiguity throws a technical observer-domain error. This is a scoped top-surface observer, not a general arbitrary-shape collision detector.

The native contactCollider(floor,0) witness is copied separately as query_geometry. It is not the shape's deepest corner and can have a positive distance even at prediction 0 (real yaw-foot diagnostic: +0.00104405 m while analytical geometry is separated). Query witness distances/points are descriptive, not the touching predicate. Query numerical consistency is checked independently within the existing 1e-6 geometric redundancy tolerance; that tolerance does not change contact acceptance.

contactDist and solverContactDist are cached candidate distances; neither is POST touching. Copy local anchors, reconstruct current world anchors and their normal gap, and record solver candidates separately. solverContactPoint is a current midpoint per installed/pinned binding; no invented index correspondence between solver candidates and point impulses. Floor/manifold order and flipped normals are handled in collider coordinates, including local collider offsets.

contactImpulse belongs to the last completed step. Sum all normal impulses, including predictive/cached points regardless of current touching. Vertical interval mean load is sum(J_n*n_y)/actual public timestep. POST geometry and preceding-interval load may disagree without an error. Initial impulse/load is unmeasured/null. Geometry rows, candidate rows and legacy-shaped current contacts are distinct fields. Self-contact manifolds remain descriptive cached narrow-phase data, excluded from the support/standing predicate. Native motor effort, motor work, friction work and CoP remain unavailable.

Sources: installed @dimforge/rapier3d-compat 0.21.0 geometry/narrow_phase.d.ts, geometry/collider.d.ts; pinned b716d375efc0201003f0cd9ef7168eee0b62c177: bindings/typescript/src/geometry/narrow_phase.rs (contact_dist, contact_impulse, solver_contact_point); src/dynamics/solver/contact_constraint/contact_with_coulomb_friction.rs (reconstruct cached anchors during solve). Exact package and source-file hashes are in the preregistration source map. See prior continuation/blocker-sources.json for the original cached-contact witness diagnosis.

## Completed observer validation (before matrix)

12 allocation attempts / 4445 public step attempts, including every failed control, adapter check and browser Preview fallback. Budget 12/10000. No additional diagnostic physics. Complete ledger and all available partial states in diagnostics/.

Air: 4 real steps, no contact/impulse. Drop/rest/release and reversed insertion/local offset: 244 real steps each; independent box-plane support geometry, native Query witness checks, vertical momentum balance within 1e-4 Ns, rest mean within .02 N of 9.81 N, current separation with cached candidates after release. Earlier attempts exposed the representative-witness/deepest-corner difference and a diagnostic catch-scope bug; both fixed here, all attempts retained.

Fresh passive =69 steps/1.15s/handL, ForceBased20=3600/60s/timeout, ForceBased1=186/3.1s/handL+handR. Same physical configs as historical 70/3600/187 references; new measurement version, not relabelled old results. Cross-version comparison explicitly fails measurement identity.

One yaw-Off FullRig adapter diagnostic: 5 completed steps, then reader's incorrect Query-positive rejection; saved state validates after removing that assumption without another world. Stored old world51 POST36 now has current touching and 45.178379/43.687485 N interval loads despite cached positive distances. Pure regressions reject false touching, omitted interval load and corrupted reconstructed gap; positive impulse does not imply current touching.

Chrome Portable 156 (Windows executable in local configuration), isolated chrome-devtools profile, foreground viewport1249x1221/DPR1, ANGLE RTX3070Ti D3D11. Passive 69-step UI/export equals Node with zero recorded deviation; no console warning/error. Initial /goblin/ prefixed Preview URL fell back to the preparing game: one additional world, zero steps, counted. Correct local Preview URL /labs/standing/. No Hidden/Resume/performance claim. Launch arguments include automation background-throttling exceptions; native-hidden acceptance not attempted.

## Single new study

One exclusive new output directory; 90 frozen ordered fresh cases, <=90 allocation attempts and <=14450 public step attempts. Old 61-world partial study is neither continued nor merged into this matrix. Publish clean harness/config/schema/source identity before the first allocation. Direct controller gains, torque cap, equal/opposite reaction, dt, solver, rig, motor pose config, starts and every numeric behavior limit remain exact #83 values.

Local valid negative/state/contact/support terminals stop only that world and independent cases continue. Common command/setup/nonfinite/unsafe/measurement/repeatability defects latch globally. free32 proves only one-step command actuation. fb32 compares the frozen bounded six-second question; a failed terminal, insufficient common prefix or absent RMS benefit is reported honestly. No tuning handoff or general standing approval from a negative/inconclusive result.

Each immutable PRE, actual command/readback, one public step, POST and clear is durable. Raw phase stream uses concatenated lossless gzip members to fit repository file limits; assembled world parts remain JSON. SHA-256 hashes name exact compressed transport bytes. The independent stored-only reader validates every state, candidate/geometry/load redundancy, original command law, caps, reaction, guards, repeat prefixes, local terminals, raw/assembled identity and ledger counts. Original records retain their old reader/schema branch. Historical smalltilt79 source checking uses an added exact Git-byte snapshot validated against its original immutable build/source ledgers, not today's changed runtime files; shallow CI remains verifiable.

A clean source pin follows this protocol; no matrix allocation has occurred yet. Stop after checked result or fundamental technical blocker. Exactly one next functional lever will be recommended after the bounded comparison. No COM/ankle/hip/recovery/controller extensions, gameplay integration, merge or deployment.

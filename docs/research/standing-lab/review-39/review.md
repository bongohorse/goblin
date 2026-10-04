# PR #38 / Issue #39 review

Reviewed base: `d4da312c1aa0418e30c6cfa7a3924e0ae2ac7deb`.
Initial PR head, fetched and confirmed: `c19a3b832c446eae28fde8ba478e6a941b98b80b`.
Corrected, clean tested code head: `1c86764570c08c341e1cafdfef2f4eecccd35077`.
The subsequent evidence-only head is recorded in Issue #39 / PR #38; compare it with
the code head using `git diff 1c86764 HEAD --name-only`. Only standing-lab documentation,
JSON evidence and the rendered PNG are allowed in that diff. No executable/build/test
changes occur after the code head. Local behaviour evidence belongs to the code head;
final-head CI is reported separately on GitHub.

This is a renewed self-review: the reviewer also implemented the original PR. No
independent second reviewer is claimed. Issue bodies/comments #30-#37, the code-review
skill, repository instructions, Lab rules and canonical research were checked against
the fixed diff. No merge, deployment or motor/standing optimisation was performed.

## Spec

- **P2, config.js:validateResult / compare.js:compareResults, fixed.** Removing telemetry
  and all checkpoints from a real completed run was accepted and two copies passed the
  repeatability gate. Semantic validation now requires the available telemetry, scheduled
  and terminal checkpoints, exact body/joint taxonomy, consistent unreached list and
  physical contact data. Invalid/incomplete exports retain their distinct semantics and
  never pass repeatability. Negative tests failed before the fix and pass afterwards.
- **P2, config.js:validateConfig, fixed.** Renaming handR and its joint endpoints to an
  unknown ID still passed under goblin-passive-v1. Body/collider IDs/classes and named
  joint topology now match the frozen rig reference. Pose/gravity calibration fixtures
  remain possible. Manipulating embedded config or both hash IDs is rejected by the
  asynchronous validateResultProvenance used for imported browser/download evidence.
  Synchronous comparisons validate completeness/config equality, not cryptographic
  authenticity. Config hashes cannot authenticate arbitrary externally supplied git or
  platform strings; no such signature claim is made.
- No remaining demonstrated Foundation-scope spec blocker. The core imports only its
  own modules, JSON contracts, Ajv and installed Rapier; no production gameplay/recovery/
  get-up dependency. One world.step path, integer-counter time, bounded clock catch-up,
  immutable synchronous export capture before async hashing and terminal latching verified.
  Reset replaces World/EventQueue/maps/UUID; old maps emptied and old world freed.

## Engineering

- **P2, measurement.js:centreOfMass and offset calibration, fixed.** Rapier 0.21.0 linvel
  is COM velocity. Adding omega cross (COM-origin) double-counted rotation. One offset
  body gave public linvel/velocityAtPoint(worldCom)=(1,0,0) but measured (1,1,0).
  Measurement now mass-weights linvel. The two-body oracle changes from erroneous
  (2/3,5/3,0) to (2/3,1,0). Public velocityAtPoint at both COM/origin and actual free-step
  COM displacement independently check it. The original test encoded the same defect.
  Contracts/Gate C corrected; intended COM-velocity units/meaning remain unchanged.
- **P2, vite.config.js / baseline provenance, fixed.** The old digest omitted HTML,
  Vite configuration and validation harness. A shared path-delimited hash now covers
  src, labs, public, tests, scripts, root HTML, Vite, package/lock and three config/schema
  JSON files. Evidence/docs excluded. The old report's digest 650441f4... matches the
  retained prior checkout's covered files, but does not prove all dirty browser inputs
  equalled c19. It is archived as historical evidence, superseded by a clean build/run.
  Browser report now names command, direct Playwright method/version, executable,
  headless flag, OS/browser/Node and both harness/build provenance.
- No production source or dependency change. Multientry builds and relative /goblin/
  asset paths tested, normal game start/head click/reset passed. Existing shared Rapier
  chunk-size warning is unchanged; no bundle optimisation added to this review.

## Physics checks and freeze

Installed public Rapier 0.21.0 APIs are authoritative; pinned source b716d375 corroborates
velocity-at-point relative to world_com. Real fixtures check 15 dynamic bodies, 16
colliders including floor, 14 joints, 9.06 kg total mass, positive analytic inertia
eigenvalues, symmetric world COM, actual anchors/axes/stops and nonadjacent self contacts.
Passive arm pose is established in Gate A, before runs; initial audits reject forbidden
penetration and constraint conflicts. Git A-to-B config diff changes only solver 4 to 8.
The historical four-iteration proposal was independently reproduced for diagnosis only:
step 30, constraint_error:ankleL, limit violation .062171946 rad > unchanged .05 bound.
Eight was adopted in Gate B before Gate D freeze; no parameter/tolerance changes here.

Contact checks include exact step-0 touching/penetration, real positive-distance speculative
manifold excluded, both internal collider orders, simultaneous measured nonfeet sorted,
feet allowed and final-step contact priority over timeout. Resting 1 kg load calibration
returns 9.8100005934 / 9.8100008170 N vs 9.81, within predeclared .02 N. Initial loads
remain unmeasured/null. Zero-gravity fixture reaches exactly 3600/60 s; lost-body fixture
returns invalid/null standing time. Drift, passive twist/stops/anchor gaps checked.
Physics-step CPU timing and observation timing are separate, excluded from repeatability.

38 Node tests passed with Node 24.21.0, including full existing G1/G2 regressions and actual
passive checkpoint equality at 30/60/144 Hz and irregular frame intervals. Five fresh
canonical runs from clean code head each terminate non_foot_contact at step 70, handL,
1.1666666666666667 s. Position/rotation/velocities/contact deviations all zero; TOLERANCES
unchanged from Gate A. Config and experiment hashes unchanged by this review.
Full new raw results: baseline/run-1.json through run-5.json and comparison.json here.
Original Gate D files remain historical evidence, not relabelled as this reproduction.

## Browser evidence and limits

Commands from the clean isolated checkout: npm test, npm run build, npm run lab:baseline,
npm run lab:browser. Windows npm was invoked via the exact Node 24.21.0 executable and
npm CLI; GOBLIN_STANDING_EVIDENCE_DIR pointed outside the checkout and
GOBLIN_HEADED_BROWSER=1. Reports/screenshots were copied into Git only after all checks.
Build and harness clean provenance match:
`1c86764570c08c341e1cafdfef2f4eecccd35077:d79c39f9e0fe7190c79884078ade663928ed8915d3aee9bcbc2c6e6aa8465445`.
checks.json records SHA-256 of actual dist files. Source/build/test inputs do not change
in the later evidence-only commit; no second browser run is claimed for that commit.

Direct Playwright 1.63.0, headed Edge 154.0.4258.53 at
`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`, Windows 10.0.26300 x64.
Ephemeral owned HTTP server serves actual dist at /goblin/; existing processes, port5174,
MCP/global configuration and user changes untouched. Direct/reload/assets, pause/resume,
single-step, resize, 20 resets, export, render-on/off, Node/browser new-result equality,
touch 744x360 landscape, production game smoke and destroy all pass. Screenshot
../passive-fall.png was generated by that browser and visually inspected: full subject
and floor visible, terminal readout readable. No user-observed window is claimed.
Console errors/warnings and HTTP failures empty. Counts stay 15/16/14 physics,
7 owned listeners/16 geometries/1 texture/1 shader program; destroy removes canvas/global
and retained control rejects snapshot. These checks do not prove full heap/GPU leak freedom.

Native hidden transition remains **unverified**: automation's actual tab switch reports
document.hidden=false even headed. Paused switch and synthetic handler tests are separately
reported and do not replace a real transition. Clock pause/stall tests establish bounded
simulation catch-up, not native browser power policy. This known environment limit is
not a demonstrated Foundation blocker. No live deployment, Android hardware or GPU
performance certification; no claim that the passive 1.1667-second fall is active standing.

## Recommendation

Ready for a subsequent merge decision for the scoped passive Foundation, conditional on
successful CI for the final evidence head (link/status in Issue #39 and PR #38). No
remaining demonstrated Foundation blocker; native hidden-tab and hardware/performance
limits remain explicit. All issues stay open and PR remains Draft. Motor/control work
requires its separately scoped experiments; this review stops without merge/deployment.

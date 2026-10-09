# SmallTilt historical source identity and current feedback boundary

## Three failures in PR #93

CI [37804505601](https://github.com/bongohorse/goblin/actions/runs/37804505601), head b3440544520a8792694b177c3637b26906343115, failed before certifying the stored records:

| Test | Comparison | Original SHA-256 | Current SHA-256 |
| --- | --- | --- | --- |
| smalltilt79-stored: archived 75 worlds / 18330 steps | build-inputs.json → labs/standing/index.html | 52d258aa4a09e6680bde5ae90d6404a72ad9fdc621fe8829ac6015685c122243 | 2e2cb916c2c73d988f84528181858c8852f8d684d833799976c65d96eb34cec3 |
| smalltilt81: original and fresh repeat | source-pins.json → src/labs/standing/browser.js | ce84d5cf4ca7b95a3202960b3b19e91226009549c92c5438a3bc126183c0cdb0 | ede6195dc04069348d15998c3bcf79db313ab206255f4144c6d8d932adf7bfa1 |
| smalltilt81: exact stopped prefix after reaction blocker | same browser source pin | ce84d5cf4ca7b95a3202960b3b19e91226009549c92c5438a3bc126183c0cdb0 | ede6195dc04069348d15998c3bcf79db313ab206255f4144c6d8d932adf7bfa1 |

CSS also changed: original 5888fb193622006d7a91d577e7f60a44b0194f3b7c6aa636eb8fd1de9f335ba8, current c19e56177505a375f914066269c7be981da49ff321dc714e6a74232bcf250b03. Earlier assertions prevented reaching this comparison. These are byte hashes, not evidence of a changed trajectory.

Historical pins bind original/repeated evidence to recorded harness/build inputs. They do not assert that today's UI is the historical UI. The existing selector retained historical package/lock/reader bytes; other inputs still resolved to current files.

## Reviewed change and limits

Self-review of the complete feedback diff from main aac456eab83bc3e5b6c20d4a039da3cd153e51cf to the above PR head:

- HTML adds observation/identity controls and collapses the existing readout. It retains the same module entry, experiment values and existing control IDs. CSS affects presentation, viewport composition and potentially rendering cost; it does not alter fixed-step parameters.
- browser.js retains initRapier(), StandingSimulation construction, mode configuration, step/frame/clock path, solver, world and mesh transforms. The added Rapier import resolves the same installed module and only reads version() after existing initialization; no second init/world is added.
- Marker deliberately calls existing pause()/clock.reset(), then reads a snapshot. This changes human interaction timing, **not** an assertion of identical browser trajectories. Reset/mode changes clear only feedback state after the existing new-world/reset path.
- feedback.js reads identity/config/snapshot/result, clones captured data and validates it. It does not write the simulation/world. report() starts result() synchronously before awaiting its hash; existing result() captures data without changing the run. Additional work can affect wall-clock/render timing; no performance equivalence is claimed.
- The shared download helper changes anchor attachment and resource cleanup, and suppresses downloads after destroy. Research JSON still comes directly from sim.result() with the same serialization. Destroy also clears feedback and download timers; original world/renderer disposal and listener removal remain.

Moving more feedback into a separate module cannot preserve the old entry HTML or required marker/reset/teardown wiring byte-for-byte. The pure helper is already separate. Freezing originals without guarding today's browser would hide future physics injection into UI; that alternative is rejected.

## Two independent guarantees

1. **Historical integrity:** three additional files under [frozen-inputs](../research/standing-lab/smalltilt79/frozen-inputs/) are exact blobs from original harness 7534e4e473b0371d4e54da553dd59b6ef4abbf6e, verified against the existing build ledger before copying. Original source-pins, build ledger/hash, original package/reader snapshots, raw archive/reproduction, config, protocol, schemas and numerical criteria remain unchanged. Both historical readers still enforce original assertions. No baseline regeneration or historical study rerun.
2. **Current source boundary:** [assertCurrentCompatibility](../../scripts/smalltilt79-historical-inputs.mjs) checks all unchanged current build-ledger inputs, plus exact, separately reviewed hashes of the three feedback presentation files **and new imported helper**, in [smalltilt79-feedback-compatibility.json](../../scripts/smalltilt79-feedback-compatibility.json). These new current-review pins do not replace historical expected hashes. Current Rapier declaration and lock entry must also equal the historical package's engine identity. Historical UI reads invoke this gate, so audit scripts themselves fail closed as well as CI.

The existing three historical package/lock/reader selections remain explicit exceptions to whole-file current equality; development tooling and the already adapted audit reader are not certified as historical bytes. This patch does not introduce a broader compatibility claim for them. The Rapier guard closes the relevant engine blind spot in package snapshot selection. npm ci/CI installs the locked engine; this does not verify an arbitrarily modified local node_modules tree.

Accepted compatibility means only this **exact statically reviewed feedback integration**, unchanged pinned core sources and engine identity. It is not SmallTilt support for today's browser, full-rig/Standing/controller approval, replay, browser timing equivalence or certified engine precision. Any further UI/helper edit, including a harmless note change, fails until a separately scoped review supplies evidence for that exact change. No extension/glob-based UI exclusion and no automatic current hash refresh.

## Validation

[Focused tests](../../tests/smalltilt79-compatibility.test.js) accept reviewed feedback while retaining original UI hashes, reject browser reinitialization/extra steps/helper world stepping/HTML/CSS edits, reject simulation/config/clock/measurement/motor/runner source edits, reject independent historical UI corruption, and reject current Rapier dependency/lock changes. Existing archive and chronological stopped-prefix/corruption assertions remain in force. Mutations use injected reads without changing repository files or creating research worlds.

The correction changes Node-only source verification and stores inert historical copies. Runtime feedback/browser files are unchanged from the already checked PR head, so no new browser campaign is required. Normal npm regression tests and production build remain required; successful CI must be attached to the final PR head. A green build is not gameplay/Standing acceptance.

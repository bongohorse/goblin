# Issue84 — scoped FullRig execution

2026-10-08. Accepted plan: PR85 head adb784c17b8bf03a027c2300f57ee6d17456500c, tree ff953adc8670bc4ba154c759db48bf5401c72bc7. Implementation is stacked on that exact unmerged head; base main/physical-source revision2abd3db7a339666a6ca0fc1d5618712cd4d6f09c. Updated Issue84 explicitly activates Gates A/B/C without further user Go. [Frozen protocol](../fullrig83/protocol.md) and [ordered90 IDs](../fullrig83/plan.json) remain byte-identical.

## Gate A — zero study allocations

Research-only CLI adapter/controller, strict independent matrix/data reader, config/result/partial-failure schemas. Historical simulation, motors, exact v1/v2/v3 validators, rig, dependencies, CI and UI unchanged. NativePoseHold alone owns all14 unchanged ForceBased100/12/20Nm neutral targets. Initial whole-rig rotation precedes audit and motor binding. Exactly torso +tau/pelvis -tau; all other direct commands zero. No transform writes after construction. All15 wake/clear policies shared by Off/On.

Pure checks: [preflight.json](preflight.json), [synthetic stored corruption checks](stored-checks.json). They create0 worlds/steps and are NOT engine observations. Project25 base-source pins, eight upstream LF Git-byte pins, three installed0.21.0 API pins, all149 historical strict manifest entries and all six PR85 entries verified. Windows upstream checkout CRLF is recorded separately; canonical Git contents match the pins. Existing analytical mass/inertia setup tolerance1e-5 from contracts.md/standing-rig.test.js is retained; sampled behavior thresholds/gains/matrix are unchanged.

Unchanged existing regression suite explicitly authorized separately by Issue84: final93/93 pass,506 test-world first uses counted with transparent delegating prototype hooks in an external helper; no added test fixture worlds. Two failed preloader attempts produced0 worlds (Windows URL and read-only default export); one tool-timeout run had506 confirmed world uses but no retained test-completion verdict; the final durable-log run completed in38.66903s. These are regression executions, not study/pilot/warmup/reproduction allocations. Both counter helpers are outside the tracked harness and are never imported by the study. Production build passed; usual existing large-chunk advisory only. Browser N/A: isolated CLI, no rendered/input/UI change.

## Single-run transport and stops

After clean source/head/tree and all pins are published on GitHub, run only once:

~~~text
node scripts/fullrig84-runner.mjs --execute NEW_DIRECTORY EXTERNAL_PUBLISHED_PREREGISTRATION.json
~~~

Exclusive directory creation forbids reuse/rerun. Durable allocation ledger is written BEFORE every allocation attempt; public-step attempt ledger before each call, completion separately. No extra worlds, pilots, warmups, tuning, missing cases or rollback-retry. At most90 study attempts/14450 public calls, or exact first blocked prefix. Registered real API faults have explicit PRE positive-validator fail_command classification; they alone receive one diagnostic step. Every other defect stops globally. Repeats checked at available prefixes; Off first non-foot contact can be a valid counterfactual, never a license for continuation.

Raw NDJSON retains initial/PRE/actual command readbacks/POST/clear/failure states. POST torque is still the applied persistent input before the separate clear. Actual public manifold normal/dist/local points/impulses are kept separately; independent normalized matrix math reconstructs contacts/load/world points and detects omitted terminal contacts. Finite snapshots contain all15 states/masses/principal frames/inertia/public inverse tensor, actual collider/floor/material/default settings, all14 joint frames/limits, actual motor tracking, self/floor contacts and timings. Partial setup/command/crash records have a separate failure schema and never pass behavior.

Each world's result is a bounded world-NNN.json part; archive.json is split-world-json-v1 transport with hashed part references and complete frozen config, not the semantic result object. Reader assembles the new research result schema only in memory and streams phase records; no giant all-world JSON string. Every sibling byte is covered by sha256.json. Run stored-only analysis:

~~~text
node scripts/fullrig84-analysis.mjs ARCHIVE_DIRECTORY EXTERNAL_PUBLISHED_PREREGISTRATION.json
~~~

Reader verifies external pin, strict schemas, every phase, exact IDs/step chronology/source identity, guards, all eligible negative/pair/repeat/support/drift criteria and first-stop prefix. Full PRE/POST H (spin+orbital), kinetic/gravity energy and direct PRE power/rectangle work are descriptive. Native effort/saturation/work, friction work, CoP and physical fall cause remain unavailable; source hashes do not attest an arbitrary supplied physical trace. No conserved-H/engine precision invention.

## Decision and scope

Execution result pending until the single registered run. Complete declared matrix plus every criterion alone permits bounded_fullrig_candidate_supported; otherwise exact first blocker/pending prefix and no_tuning_handoff. Free32 is one-step actuation evidence; fb32 is at most6s, not60s/full Standing. Spine relative roll/yaw remain constrained, tiny cap may be masked by20Nm native motors. No general controller, FullRig release, merge/deployment, COM/Hip/Ankle/recovery/gameplay work or engine-precision certification. #60/#30/#31 stay open; stop after Draft/evidence/decision.

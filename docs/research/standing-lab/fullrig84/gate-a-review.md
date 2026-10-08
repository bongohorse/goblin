# Issue84 Gate-A self-review

2026-10-08; same assistant, no independent human approval. Fixed accepted planhead adb784c17b8bf03a027c2300f57ee6d17456500c over physical base2abd3db7a339666a6ca0fc1d5618712cd4d6f09c. Zero study worlds/steps.

## Spec

No material frozen-plan finding. User explicitly activated the bounded run and unchanged existing regressions; no new Go required. Exactly90 ordered IDs/14450-call cap,15-body dynamic baseline, local+X constrained spine, whole-rig four fixed starts, paired Off/On, original conservative PD/cap, all14 native neutral targets remain unchanged. free32 creates no NativePoseHold. fb32 binds actual local joint frames after common initial rotation; controls never replace pose targets. Root config is separate/versioned, fully embedded and hash identified.

Review fixes before preregistration (implementation fixes only):

- P2, reader prefix checks: repeats/matched negatives checked at each available prefix; no last-world-only gate, no averaged-away failed repeat.
- P2, POST accumulator checks: persistent userTorque is retained at POST; clear occurs afterward and is separately read back. PRE/other-body/force zeros and exact encoded reaction are enforced.
- P2, contacts: raw public manifolds retained apart from transformed contact summaries; independent reconstruction catches omitted contacts and coherent clean-terminal markers.
- P2, failed allocation/setup: attempt counted before constructor, partial getters secured before dispose; failure records never imply a pass.
- P3, archival bounds/provenance: bounded per-world JSON parts, streamed raw phases, exclusive output latch, exact clean published source/config/build identity.

Pure geometry/inertia/q-sign/yaw/negative-axis/null/damping/cap/ID checks and18 synthetic corruption/prefix cases pass. Unchanged93 regression tests pass separately; production build passes. Study setup is intentionally not piloted: public actual initial audit/getters and immediate guards will be tested in each listed attempt after preregistration.

## Engineering

No historical/production source, dependency, workflow or vendored changes. Only new research CLI/schema/docs files. Installed Rapier0.21.0 declared APIs inspected; pinned local force/mass/damping/joint/motor/manifold sources read. Borrowed existing initial rig audit protects mass/COM/positive inertia, anchor/axis/limit congruence and nonadjacent shape penetration. Reader additionally validates original1e-5 analytical inertia-eigenvalue tolerance and positive definite public inverse tensor, actual collider dimensions/defaults/floor, neutral target ownership/tracking and immutable settings. Motor constructor adapter is unchanged and uses the same existing spherical handles. Both couples added before one step, no intermediate simulation/transform repair; World/EventQueue freed on every path.

Guards use raw quaternion/matrix/anchor geometry and every segment/step; simultaneous contacts retained on invalid states and standing time then null. Actual foot normal load is impulse/observed dt times upward normal; predictive positive distances excluded. Initial load null. Contact at horizon wins; pair/no-harm/30-step minimum and 60-step support windows are frozen. CPU samples exclude native-effort speculation; no browser/GPU/production CPU acceptance.

No open implementation finding after pure/stored/build checks. This permits only publishing the clean harness/preregistration and the one bounded run. Engine behavior/physical benefit remain UNKNOWN; no new engine-error envelope or standing approval. First actual plan/setup/command/negative/state/repeat/behavior blocker must stop without implementation/parameter rescue or research rerun.

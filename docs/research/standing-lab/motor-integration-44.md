# Motor Solver32 integration — Issue #44

Issue #44 explicitly resumes #41 Gate C after the bounded #42 diagnosis and #43
candidate decision. Passive v1/Solver8 is preserved; Solver32 is selectable only in
the separately versioned motor Lab. No arena/controller/balance integration,
dependency update, merge or deployment. Draft PR: https://github.com/bongohorse/goblin/pull/45.

## Contract and implementation

Three explicit modes: passive, native ForceBased100/12/20 Nm and the documented
1 Nm control. Motor configuration/result schema v2 embeds the unchanged rig-v1,
effective Solver32, targets, gains, Moving-Frame convention, caps and controller
`native-pose-hold-force-v1`. Experiment identity is `native-force-solver32-v2:<hash>`.
Readers accept both v1 and v2 without changing passive field meanings.

Commands run before the existing single fixed-step `world.step`. Rendering observes
physics. Reset/mode change creates a new World/EventQueue/rig/motor binding, resets
clock/telemetry/IDs, and releases old motor references. Terminal contact never
continues diagnostically in the UI. Async export snapshots the clicked run before
hashing, preserving correctness across immediate reset/mode changes.

Tracking includes actual/target/error/relative angular velocity/limits/configured
per-axis cap for all14 joints. Actual effort and saturation are explicitly null:
supported getters cannot separate motor, contact and limit impulses. Configured cap
is not measured actual torque. Fixture cap/reaction proofs from #41 remain separate.

Passive config SHA remains
`414ed28b04c2fd0351554014f1c7e8637c5bd8674477c8a13483f410ed31e2aa`.
Motor20 SHA: `4daade1f6f3eb77c40553ad6c656f71efec617087a863448b2a37b4aa5578808`.
Motor1 SHA: `36bbd0efbdf51a2bf03d0fc40dc2a110b22950588c7380f4999309d307302d57`.

## Clean source evidence

Reviewed code head: `a780c7e03604d091e8ce4de4a6aefe3d70d50fce`, dirty=false.
Build ID:
`a780c7e03604d091e8ce4de4a6aefe3d70d50fce:3fb4620de1f8c06dd812c2aefed9791c94db97ffd9c990da84a9570dacb2d9c8`.
Base main: `06b520628502593d034485ee21fb8428daa6781b`.
Node24.21.0: 53/53 tests pass; production build passes (existing shared Rapier size
warning). No dependencies added. Subsequent documentation/results commit is a
distinct evidence head; exact final-head CI is recorded in PR/Issue #44.

Five fresh normal runs per cap, all repetition comparisons pass with deviation0:

| Case | Steps (five runs) | Standing time | Termination |
| --- | --- | --- | --- |
| Motor20/Solver32 | 3600 each | 60s each | timeout; no non-foot contact |
| Motor1/Solver32 | 187 each | 3.1166666666666667s each | both hands |
| Passive/Solver8 | 70 | 1.1666666666666667s | handL |

Passive original checkpoint comparison: all six maxima0 (position, rotation,
linear/angular velocity, contact point/load), without widening tolerances.
See [numeric comparison](motor-integration-44/numeric/comparison.json) and all ten raw runs.

20 Nm trajectory peaks: drift0.194125596m, anchor error0.000314006m,
limit error0.000159224rad, tracking error0.148907878rad. Terminal drift0.084029507m,
foot loads45.349552054N/43.528298254N; terminal tracking max0.138397937rad.
1 Nm peaks: drift0.864053327m, anchor0.000380772m, limit0.001974002rad,
tracking1.284276922rad. Terminal foot loads21.783689018N/25.261398130N.
These secondary metrics have no complete predeclared acceptance thresholds.
**60s meets only the time criterion; this is not full standing acceptance.**

## Browser and visual checks

Windows, Edge154.0.4258.53, Playwright direct headless production build with Pages
prefix, Node24.21.0. Clean source/harness provenance is embedded in
[browser report](motor-integration-44/browser/browser-qa.json).
Real resumed rAF motor20 run:60.005s wall time,3600 steps/60s simulation;
motor1:187 steps, both hands, no post-contact advancement. Both downloads validate.
Pause/resume/single-step/reset/export/reload,20 fresh passive resets,
20 mode-change/reset cycles, export race, render on/off, browser/Node passive
checkpoints, disposal/retained references, assets/console, and game
start/pointer/reset smoke pass. Console errors/warnings and failed responses: none.

Mobile landscape744×360 CSS pixels, DPR2, touch step/reset and mode selection,
no horizontal overflow. The three motor screenshots were rendered and viewed:
[60s](motor-integration-44/browser/motor20-time-criterion.png),
[contact end](motor-integration-44/browser/motor1-contact-end.png),
[mobile](motor-integration-44/browser/motor-mobile-landscape.png).
Rig and controls visible; long telemetry panel scrolls. This is an emulated viewport,
not physical Android or Windows GPU performance evidence.

Native hidden transition was not observed (`native_tab_hidden_observed:false`).
Synthetic visibility-handler test passes; genuine hidden-transition acceptance
remains open and is not claimed.

## Browser CPU (milliseconds per step)

Discard first20 warmup steps; measure `world.step`, commands and observation
separately. Rendering/DOM work excluded. Full trajectories, not #43's matched
60-step Node benchmark. Raw samples and quantiles are in the browser report.

| Cap/sample count | Physics median/P95/max | Commands median/P95/max | Observation median/P95/max |
| --- | --- | --- | --- |
| 20 Nm /3580 | 0.5/0.600000024/1.100000024 | 0/0.100000024/0.199999988 | 0.100000024/0.200000048/0.599999964 |
| 1 Nm /167 | 0.5/0.600000024/0.700000048 | 0/0.100000024/0.100000024 | 0.100000024/0.200000048/0.300000012 |

Timer quantization can yield zero command medians; this does not mean zero CPU cost.
#43's approximately3.3× Node solver ratio remains separate. Weak-device, GPU and
production budgets remain unaccepted. Solver32 is a Lab candidate only.

## Spec

Reviewed against #44 and remaining #41 criteria, fixed main above. Schema/UI/
lifecycle/normal termination/five runs/passive regression/browser evidence complete.
No remaining identified spec finding. Issues stay open until review/merge.

## Engineering

P2 fixed in `a780c7e`: null hinge observations could be coerced to zero during result
validation; motor command counts and spherical tracking needed independent export
consistency checks. Validation now requires numeric hinge observations, consistent
limit errors, one command timing per executed step and spherical actual orientation
matching same-step body checkpoints. Corrupted exports are rejected by regression
tests. Existing fixture negatives and motor-off proofs remain intact.

No remaining evidenced engineering finding after targeted tests, build and browser
checks. This self-review is not independent PR approval. Next step: separate review
of Draft #45. No further development, merge or deployment in this task.

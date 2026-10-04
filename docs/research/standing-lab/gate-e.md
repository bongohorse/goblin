# Gate E — built browser QA and review / #37

`npm run build` then `npm run lab:browser`, Windows x64 10.0.26300, Edge **154.0.4258.53**,
Node v24.21.0. Historical Gate E headless/headed runs preceded the final c19 commit;
the old dirty report is archived at review-39/historical-browser-qa.json. The current
browser-qa.json and passive-fall.png come from the clean #39 code-head 1c86764570c08c341e1cafdfef2f4eecccd35077,
with Playwright 1.63.0 direct and headed Edge (headless:false); no claim of a newly
rerun headless check or user-observed window. Build/harness provenance both clean;
review-39/review.md and checks.json describe commands and artifact hashes. An ephemeral HTTP server mounts only built dist under
`/goblin/`; no existing processes/ports stopped. passive-fall.png inspected visually:
full body/floor visible, handL floor contact and terminal/telemetry readable.

Verified direct `/goblin/labs/standing/`, reload, all assets, Single-step exactly once,
Pause frozen, Resume bounded without paused catch-up, paused viewport resize, 20 resets,
70-step render-on/off equality, Node/browser checkpoint equality, actual fall latch,
JSON download/schema validation, touch 744×360 landscape, normal game start/head pointer
interaction/reset, destroy with retained control rejected. Resource counts after warm-up:
15 bodies / 16 colliders / 14 joints; 7 owned listeners / 16 geometries / 1 texture /
1 shader program across every reset. No growth found in these counts; not a WASM/heap
byte-leak or long-duration GPU-performance proof. Errors, warnings and HTTP failures empty.

Native tab switching under automation keeps document.visibilityState `visible` for both
pages, even headed; do not claim an actual hidden transition. Paused tab switch freezes
time; explicit visibility-event handler and LabClock long-pause/stall regression pass.
No hardware Android or browser power-policy verification. This is an explicit QA limit,
not hidden physics evidence. Other checks are actual Windows production-browser actions.

Production src/main.js, goblin-rig.js, runtime.js and grab.js have zero diff against main;
PR #29 unaffected. Normal game smoke passed, full Node G1/G2 tests remain green. Existing
large shared Rapier bundle warning remains; no dependency upgrade or engine substitution.
Build/CI do not deploy this branch: Pages workflow runs on main push only; neither main
push nor workflow_dispatch is performed. Current-head CI and Draft-PR links are recorded
in #32 and the PR after creation. All issues remain open; implementation != merge.

Next separately scoped task: native motor baseline with positive isolated tracking/cap/
reaction fixtures, then controlled ForceBased vs AccelerationBased A/B on this frozen
rig/measurement/timestep/solver baseline. No balance, spherical target experiment or
solver sweep combined with that first motor-model comparison. Production integration
requires repeated full Standing acceptance plus its own ticket.

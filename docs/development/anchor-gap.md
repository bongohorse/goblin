# Anchor gap: D1 measurement and display contract

Issue [#98](https://github.com/bongohorse/goblin/issues/98), baseline `29c66e2`. This contract was fixed before D1 implementation. D1 is an optional read-only geometry display, default off, using the existing joint lines and inspector.

For each stable rig joint ID, transform both native local anchors by their respective native body rotation and translation. The Euclidean world-space distance is `anchor_gap` in metres, quality `derived`; display millimetres = metres × 1000. It is not motor torque, supporting force, muscle activity, stress, damage or a safety threshold. Existing configured limits, controller targets and assist commands retain separate provenance. Solver reactions are unavailable, not estimated from caps or geometry. Spherical joints do not acquire invented angular limits.

Use Rapier **0.21.0** installed runtime getters `ImpulseJoint.anchor1/anchor2`, body translations/rotations and `isValid`, already used by the inspector/rig. Geometry agrees with existing `jointObservation().anchor_error`; no new raw/WASM API or solver access. Never call a setter, step or controller method from this adapter.

## Fixed readability scale

| Exact distance in mm | Label | Colour |
| --- | --- | --- |
| 0–1 inclusive | ≤1 mm | blue `#83baff` |
| >1–5 inclusive | 1–5 mm | cyan `#60e2dc` |
| >5–20 inclusive | 5–20 mm | amber `#ffd166` |
| >20 | >20 mm | pink `#ff98c6` |
| Missing, invalid, negative or non-finite | N/A | grey `#b3bec9` |

Thresholds operate on unrounded values; numerical labels show three decimal places. An exact zero remains a valid zero; very small positive values must not become a misleading zero label. No per-frame normalization, percentages or green/healthy/red/broken meaning. Legend plus numerical value and range label provide a non-colour interpretation. OFF is a distinct display state. Safety is the existing run state; valid geometry can still be inspected during Safety, labelled with that state, while invalid geometry is N/A.

Preimplementation smoke, unchanged baseline: B/T1/R1, native steps 0/1/40/120/180, neutral and small/strong push at step1. Initial maximum gap 0.0000596 mm; neutral maxima 0.208–1.298 mm, small-push maxima 0.208–1.749 mm, strong-push maxima 0.208–1.609 mm. This is a short adapter/readability check, not a controller comparison or motion acceptance. Synthetic predefined adjacent-joint distances 0, 0.001, 1, 1.001, 5, 5.001, 20, 20.001 and 30 mm cover scale transitions independently of gameplay. The 1 mm boundary separates near-coincident anchors from visible millimetre differences; 5/20 mm expose progressively wider geometry without drowning normal millimetre motion in the widest class. These thresholds are UI choices, not physical failure criteria.

## Snapshot and lifecycle

One bounded all-joint geometry snapshot supplies `joint_id → vertex range → anchor_gap` and completed simulation step/time. Both inspector and coloured lines use this same snapshot. No fifteen-body polling to colour fourteen joints. The display refreshes at most 10 Hz during runs; forced selection, toggle, pause/step/reset updates capture immediately. Between refreshes, sampled anchors/colours/numerical readout retain their explicitly shown step. No mixed new colour/old raw value. Ordinary yellow joint display remains available independently; Anchor gap enables the same joint-line object, not a second overlay.

Missing joints have unavailable fields; invalid coordinates never reach GPU buffers. Reuse bounded position/colour buffers and material. Toggle off, fresh variant, reset and dispose remove owned resources and cached snapshots. Selection stays a separate white marker and does not obscure the coloured gap segment. Feedback/replay schemas and controller/native snapshots are unchanged.

## Required evidence

Adjacent unequal joints plus every body/connected joint, precise metre/mm boundaries, zero/N/A/missing, non-finite geometry, snapshot step equality, exact on/off native/controller parity for B/T1/R1, ordinary/safety pause, step, small/strong push, hold/release, all Quad/Single views, touch/keyboard, resets/variants/dispose, desktop and small-landscape drawcall/heap/render comparison. Heap and rAF/render timing are browser proxies, not a GPU timer or a 60-FPS guarantee.

G2 drag stability, native Hidden/Resume and the historically late state matrix remain separate open evidence. No new controller, drag study, motor-load overlay, research run or following feature package is authorized by D1.

## D1 result (2026-10-10)

Implemented on source `6ae7fbb4be626c508083313dbbadbc7f3047797f`, clean production build **6107bb375bea0699**. Actual local access: http://127.0.0.1:4182/goblin/playground/ (isolated production preview, existing servers preserved). This evidence commit only adds documentation/screenshots; runtime source hashes and build ID remain identical. Pages currently deploys Arena/Standing; Playground hosting remains #109, not part of D1.

Baseline: uniform yellow joint lines and metre readouts. Candidate: optional fixed-scale coloured existing lines, explicit millimetres/range/quality/step, compact selected-joint reading and collapsible source/scale explanations. UI includes OFF and N/A distinctly; large gaps do not imply physical failure. Existing command/configuration/derived/native fields remain separate; solver/muscle load stays unavailable.

169/169 Node tests and both production builds passed on the implementation source. Unit coverage includes unequal adjacent shoulder/elbow gaps, every segment and joint, exact thresholds, tiny positive/zero, missing/non-finite samples, stale-step rejection, exact B/T1/R1 native/controller parity and actual buffer colours/ranges/reuse/disposal. Native headed Chrome Portable156.0.8078.4, Windows/NVIDIA RTX3070Ti/ANGLE D3D11/WebGL2, own temporary profile,1280×720 and744×360 DPR1: all15 bodies/14 joints, keyboard toggle, Quad/Single and four cameras, pause/step/reset, fresh B/T1/R1, small/strong push, Safety, actual hold/release, emulated touch inspection,12 reset/toggle cycles and real marker JSON download passed. No console errors/warnings or failed requests. Marker snapshots now capture the inspector and diagnosis atomically, preventing old diagnosis metadata beside a new readout.

[Desktop](../evidence/issue98/desktop.png), [small landscape](../evidence/issue98/landscape.png), [active hold](../evidence/issue98/hold.png), [exact build/environment/checks and measured costs](../evidence/issue98/result.json). Full existing editor/camera/inspection/feedback browser regression is recorded separately in the PR release report. No G2 velocity study or new Standing acceptance.

### Bounded display cost

Same paused step0, Quad, no selected body,180 final foreground samples per case; no parallel local Node test/browser run. Existing renderer samples measure JS frame work/render submission, not GPU execution. Heap sampled after CDP garbage collection is a proxy, not a heap-retention profile.

| Viewport / mode | Drawcalls | Geometries / textures | Frame CPU median/P95 ms | Render submission median/P95 ms | Heap MiB |
| --- | --- | --- | --- | --- | --- |
|1280×720 OFF|72|18 /1|0.60 /0.80|0.40 /0.60|12.12|
|1280×720 ON|76|19 /1|0.60 /0.80|0.50 /0.60|11.56|
|744×360 OFF|72|18 /1|0.50 /0.70|0.40 /0.50|12.15|
|744×360 ON|76|19 /1|0.60 /0.80|0.40 /0.60|11.60|

One extra line submission per view; one bounded position/colour buffer and material, no texture. Heap differences reflect allocation/GC/JIT state and do **not** establish a memory improvement. Resource count returns to zero when overlays/selection are off; unit disposal checks all owned buffer/material events. Browser counters do not prove all allocator retention. rAF median ranged7.1–7.8ms/P9513.9–14.2ms in this final comparison; an earlier small-view probe reached27.4ms median. Scheduling is variable; no universal60-FPS, mobile-hardware, isolated GPU-time or browser-independent performance claim.

Remaining boundaries: D2 motor/assist command overlays require a separate scope; actual motor reactions are still not measured. The fixed scale is a reading aid and retains up to100ms sampled-geometry latency while running. G2, native Hidden/Resume and the late state matrix stay open independently. Next diagnostic lever, only after separate authorization: D2 with explicit configured-cap/command provenance, never inferred muscle or solver load. **STOPP after D1 release; no #103 or other package begun.**

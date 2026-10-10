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

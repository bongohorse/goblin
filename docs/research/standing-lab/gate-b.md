# Gate B validation

Node v24.21.0 / Windows x64, Rapier 0.21.0. Five focused tests cover recursive import
boundary, schema rejection, mass/COM and analytic sphere/box/capsule principal moments,
joint-frame angle versus independent quaternion, limits, actual nonadjacent contacts,
20 fresh resets and matching auto/single-step states. Capsule formula splits cylinder
and two solid hemispheres; transverse inertia includes centre translation and 3r/8
hemisphere COM. No additional-mass double counting. New pose has no forbidden initial
shape penetration and congruent anchors. See contracts.md corrective solver decision.

The only physical correction to Gate A proposal is 8 instead of 4 global iterations,
motivated by the unchanged safety bound, not standing time. No +16 extras, no motors.
900-step diagnostic continuation validates passive fall stability; actual measured runs
in Gate C stop at first non-foot contact. Runtime mass/inertia/geometry/limits verified.
Browser smoke/build evidence is added after running; no GPU performance inference.

Review Spec: independent passive Lab, single step path and fresh-world lifecycle complete.
Engineering: geometry/materials reused across reset, maps cleared, EventQueue/World freed,
single renderer loop, visibility pauses, clock discard; production modules unchanged.

Production-build browser smoke: Windows x64, headless Microsoft Edge 154.0.4258.53, direct /goblin/labs/standing/ and reload, step exactly once, run/pause frozen, fresh reset to step 0; zero console errors. Counts 15/16/14, 16 geometries, 1 texture. No GPU-speed claim. Initial missing favicon was fixed with a data favicon before rerun. Build passes (shared Rapier chunk size warning remains).

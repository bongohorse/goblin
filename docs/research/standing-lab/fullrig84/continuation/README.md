# Issue84 continuation — verified technical measurement blocker

2026-10-08. One new preregistered matrix from harness72592c5008e1844acecead82bf71e137b9296a4c, tree1eca0d9e87078b3b042f00dcd17b59c4b290597e. Protocol-v2 published in Issue84 before start; stack remains Draft PR86 on PR85/adb784c. No merge/deployment.

**61 study allocation attempts /448 public steps, 60 complete worlds and one partial world;29 IDs unattempted.** Ten expected negative controls and40 free32 one-step worlds completed. Five null Off/On motorized pairs stopped at step36 by the frozen predicate; yaw Off repeat1 has38 completed steps. Runner stopped itself at command39 of allocation61, before another step, on a pure encoding assertion. No manual kill was needed: process inventory was already empty. Diagnostics2/2, historical failed attempt1/0: **64 package allocations total,450 study+diagnostic steps**, within5/10 diagnostics,90/14450 new study and96 package caps. No rerun, pilot, tuning or continuation after discovering the common measurement invalidity.

## Finding and validity

Matrix adapter is repaired: six named public getters copied immediately; real16-slot non-diagonal regression verifies unused slots/aliasing, zero worlds. Two explicit one-step API/setup smokes passed. A further ordinary encoding defect was reproduced from original failed PRE with zero worlds: exact dyadic norm can be within C while Math.hypot rounds just above C. Both model and independent reader now tighten only representation until BOTH original predicates hold. Stored regression is red before/green after. Cap/gains/rig/numeric criteria unchanged. Original run/source pin remains72592c; repaired final code was NOT replayed. Future runner also clears pending PRE/command/POST fields each iteration; original failure.command contains previous frame38, not an applied command39.

**Common technical measurement blocker:** at world51/POST36, all eight foot contacts report cached contactDist=+0.019999995827674866m and positive impulses0.107–0.258Ns. Independent current-pose reconstruction of their stored local anchors gives gaps from-0.000753279m to-0.001907549m. The frozen contactDist<=0 filter reports no foot contact/0N, while the all-manifold impulse load is45.178379/43.687485N. Pinned bindings read manifold points[i].dist; solver source explicitly reconstructs recycled separations from current body-local anchors/poses instead of updating narrow-phase contacts each frame. [Source pins](blocker-sources.json); exact eight witnesses in [report.json](report.json).

This invalidates treating the recorded foot_contact_loss at step36 as actual unsupported flight. The predicate also compromises non-foot chronology. Apparent support failures are preserved as recorded decisions, but physical standing/support and controller benefit are **inconclusive**, not valid negative physics, fall, success or general controller prohibition. Cached signed distance and current support/contact semantics need a validated observer contract; changing that common prerequisite is beyond interpreting this frozen one-shot study. No matrix repetition is permitted in this order. Torso/position/velocity samples remain descriptive. Native effort, physical fall cause and engine precision remain unknown. No cap-masking or spine-roll causal finding is established.

## Condition/start observations

Representative repeat1; all available complete repeats passed the full trajectory repeat check. Values are descriptive, not a physical pass. T is observed duration; standing time remains N/A; selected contact duration* comes from the invalid cached predicate. Loads* are endpoint values under that filter. Loads† include all raw manifold impulses irrespective of cached gap and are diagnostic, not a replacement acceptance rule. Final residual support-window means cannot certify support. Reactions are angular speed peaks in rad/s, not measured native torque.

| Condition/start/variant | Worlds | T / standing / selected contact (s) | Torso RMS / final (rad) | Selected L/R load (N)* | All-manifold L/R load (N)† | COM / max foot drift peak (m) | Pelvis / torso / all segment peak (rad/s) | Result/reason |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- |
| free32 null off | 5 | 0.017 / N/A / 0.000* | 1.832e-7 / 1.832e-7 | 0.000e+0 / 0.000e+0* | 0.000e+0 / 0.000e+0† | 3.998e-10 / 7.451e-9 | 4.663e-5 / 8.735e-5 / 9.387e-5 | Pass: Commanddiagnostik |
| free32 null on | 5 | 0.017 / N/A / 0.000* | 1.832e-7 / 1.832e-7 | 0.000e+0 / 0.000e+0* | 0.000e+0 / 0.000e+0† | 3.998e-10 / 7.451e-9 | 4.663e-5 / 8.735e-5 / 9.387e-5 | Pass: Commanddiagnostik |
| free32 yaw off | 5 | 0.017 / N/A / 0.000* | 9.956e-9 / 9.956e-9 | 0.000e+0 / 0.000e+0* | 0.000e+0 / 0.000e+0† | 2.616e-9 / 1.490e-8 | 4.640e-6 / 2.568e-6 / 3.300e-5 | Pass: Commanddiagnostik |
| free32 yaw on | 5 | 0.017 / N/A / 0.000* | 9.956e-9 / 9.956e-9 | 0.000e+0 / 0.000e+0* | 0.000e+0 / 0.000e+0† | 2.616e-9 / 1.490e-8 | 4.640e-6 / 2.568e-6 / 3.300e-5 | Pass: Commanddiagnostik |
| free32 pitch off | 5 | 0.017 / N/A / 0.000* | 0.040000 / 0.040000 | 0.000e+0 / 0.000e+0* | 0.000e+0 / 0.000e+0† | 5.008e-9 / 3.725e-8 | 8.330e-5 / 2.029e-5 / 0.000229 | Pass: Commanddiagnostik |
| free32 pitch on | 5 | 0.017 / N/A / 0.000* | 0.039998 / 0.039998 | 0.000e+0 / 0.000e+0* | 0.000e+0 / 0.000e+0† | 8.550e-9 / 1.676e-8 | 0.000307 / 0.000193 / 0.000307 | Pass: Commanddiagnostik |
| free32 roll off | 5 | 0.017 / N/A / 0.000* | 0.040000 / 0.040000 | 0.000e+0 / 0.000e+0* | 0.000e+0 / 0.000e+0† | 7.521e-9 / 2.235e-8 | 2.310e-5 / 2.780e-5 / 0.000216 | Pass: Commanddiagnostik |
| free32 roll on | 5 | 0.017 / N/A / 0.000* | 0.040000 / 0.040000 | 0.000e+0 / 0.000e+0* | 0.000e+0 / 0.000e+0† | 7.521e-9 / 2.235e-8 | 2.310e-5 / 2.780e-5 / 0.000216 | Pass: Commanddiagnostik |
| fb32 null off | 5 | 0.600 / N/A / 0.000* | 0.003364 / 0.008845 | 0.000e+0 / 0.000e+0* | 45.178379 / 43.687485† | 0.010454 / 0.001135 | 0.072020 / 0.042268 / 0.233978 | Inconclusive: Kontaktmessung |
| fb32 null on | 5 | 0.600 / N/A / 0.000* | 0.003360 / 0.008834 | 0.000e+0 / 0.000e+0* | 45.184351 / 43.691918† | 0.010455 / 0.001135 | 0.072020 / 0.042236 / 0.233978 | Inconclusive: Kontaktmessung |
| fb32 yaw off | 1 | 0.633 / N/A / 0.500* | 0.003874 / 0.009941 | 37.280816 / 43.612043* | 45.257121 / 43.612043† | 0.012346 / 0.002058 | 0.119204 / 0.045917 / 0.220713 | Inconclusive: Kontaktmessung; Encode-Abbruch |
| fb32 yaw on | 0 | — | — | — | — | — | — | Inconclusive: unversucht |
| fb32 pitch off | 0 | — | — | — | — | — | — | Inconclusive: unversucht |
| fb32 pitch on | 0 | — | — | — | — | — | — | Inconclusive: unversucht |
| fb32 roll off | 0 | — | — | — | — | — | — | Inconclusive: unversucht |
| fb32 roll on | 0 | — | — | — | — | — | — | Inconclusive: unversucht |

Expected negative controls: wrong-sign5/5 and missing-reaction5/5 detected, one step each; matching free32 pitch positive commands discriminate both faults. They are command diagnostics only. free32 null/yaw Off/On coincide; pitch On endpoint differs by about-1.63544e-6rad; roll endpoint is identical at printed precision. No long-horizon transfer claim follows. Null motorized On/Off RMS ratio≈0.998619 on the36-step stored prefix, a descriptive difference only; invalid support and missing full horizon prevent a benefit verdict. Yaw pair is incomplete; pitch/roll motorized pairs unattempted. No failed/missing repeat averaged away.

## Verification and preserved evidence

[Original continuation raw bytes/parts/manifest](execution/) are unchanged. Stored-only independent audit validates all61 initial states/448 completed command/PRE/POST frames, settings/torque ownership/controls/full available repeats, and reconciles2303 raw records including failure PRE/partial state. Ledger records61 allocations,448 attempted and completed steps,60 terminals, one failure; no later allocation/step. Failure schema/manifest/external published pin checked. Reader allocates zero worlds and does not silently recategorize the original archive. [Full report](report.json) carries every attempted ID, observed metrics and29 unattempted IDs. Historical original first failure/preregistration and149 historical+6 plan manifest entries remain unchanged.

Targeted matrix/encoding/pure/stored checks pass after repairs. Existing regression suite93/93 passed,506 first-use test worlds separately counted; no new research worlds. Production build passed. Final actual-head CI and final internal review are recorded on PR86/Issue84. Browser N/A CLI-only; no arena/UI/physics defaults/old engine helper/baselines/dependencies/CI changes. AGENTS.md now records complete behavioral goals, autonomous routine fixes, risk-scaled checks, internal review and valid-negative-result handling while preserving explicit budgets/boundaries.

## Exactly one next functional lever

**Implement current-contact/support observability in the Standing Lab.** Small work package: keep original cached manifold distances separately; compute and expose current signed contact geometry from current collider poses/local witnesses, validate temporal consistency against an independent current-pose collider query and public solver-contact diagnostics, and pair correctly identified impulses with that geometry for foot-support/first-nonfoot telemetry. Add focused supported/airborne/recycled-contact transition checks, including this stored+20mm/negative-current-gap witness. Success means loaded planted feet cannot falsely trigger flight, genuinely airborne feet still do, and first non-foot contact uses current geometry. Freeze that observer contract before any separately authorized bounded controller comparison. No gain selection, general engine precision round, recovery or gameplay work in this package.

Stop at verified technical blocker with Draft updated. Issues60/30/31 remain open; no merge/deployment or Standing/controller release.

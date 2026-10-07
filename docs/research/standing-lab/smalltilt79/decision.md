# Issue79 decision: local_smalltilt_supported

## Execution and provenance

Exactly one authorized execution, Windows/Node24.21.0/Rapier0.21.0, clean published harness7534e4e473b0371d4e54da553dd59b6ef4abbf6e, parent main dc44ff06d8cdb56829506c8ce1faceeb32462c82. Preregistration: https://github.com/bongohorse/goblin/issues/79#issuecomment-6047223773 ; Draft PR80. No study pilot, tuning, rerun, merge or deployment. Actual dt0.01666666753590107s; core horizon6.000000312924385s. Frozen contract, config, protocol, runner and reader remain byte-identical to preregistration;91 source pins validated. Additional archive helpers/stored tests are post-execution only.

## All predefined gates

75 fresh worlds,18330 public steps, no failed/skipped world.15 motion one-step controls pass command/readback/setup/reference audits. Wrong-sign pitch+ all5 worsen from observed0.07999999657225815rad to0.20094641056849513rad (see raw exact endpoint) and exit the small-tilt domain on step62; expected negative evidence only. Missing-reaction5 one-step observations match planned core pitch+/on first steps: positive max physical deltaH5.3487746098939226e-8, negative min0.0017866706196813713, actual-integral residual max5.728659974148249e-9; both predefined discrimination margins positive.

Every core on repeat completes360 with tilt<.01rad and transverse torso speed<.02rad/s. Worst final tilt0.0012776867401871105rad; worst transverse speed0.0010753405532686344rad/s. Every off repeat completes360 with worst final-vs-initial delta1.0184203577678907e-8rad<=1e-5. Summary.json lists all50 terminal observations; full original trajectories are preserved.

## Raw storage and validation

Original pretty JSON287397917bytes, SHA25625be46c8779a3b9c8c0f5b21f3682c4eaa9626d13b1cf6eec4afd72c7ceb69bb, losslessly gzip-compressed11926410bytes in23 ordered parts. archive.json checks every part, full gzip and uncompressed byte counts/hashes; raw bytes are unchanged. Restore by concatenating raw.json.gz.part-000 through022 and gunzip. Run node scripts/smalltilt79-archive.mjs to validate directly without extracting or creating worlds. The helper also recomputes the original standingBuild hash from original Git inputs, excluding post-execution helper files.

Strict reader independently recomputes commands, trajectories, physical spin+orbital H, metrics, references, terminations and decision: valid75worlds/18330steps; engine_precision indeterminate_not_certified. The frozen corruption driver contained one no-op fixture on successful studies (it assigned the already-existing success decision). Its original failure log is retained. Only a separate post-execution driver makes this mutation actually change the outcome; all19 real corruption mutations reject. Frozen measurement harness unchanged; zero additional worlds. Archive corruption tests also reject missing/reordered parts and byte/hash tampering.

## Scope and limitations

This supports ONLY the fixed isolated torso/upperArm small-tilt matrix. Partner endpoint speed reaches0.8537436605789117rad/s: partner motion/energy/physicalH remain descriptive. No partner-speed ceiling, monotone pair-energy rule, exact negative partner omega, exact transverse f32 command or general engine precision envelope was fitted. Original16False/native54 and historical manifest values remain unchanged. This is no general controller/Standing/COM/Hip/Yaw/FullRig/get-up release. Parent60 remains open; any further experiment requires its own scoped decision.

CLI-only source change: no application runtime/UI/assets/configuration edits. Chrome/Pages smoke N/A; existing87 plus two stored-archive regressions yield89 tests, production build and finalPR CI required. All100 previous manifest entries, baseline/runtime and historical README exclusions preserved. Stop with Draft80 and this decision. No merge/deployment.

Stored corruption reproduction after lossless extraction: node scripts/smalltilt79-stored-regressions.mjs raw.json 7534e4e473b0371d4e54da553dd59b6ef4abbf6e. The original frozen driver is retained as provenance; use the corrected stored-only driver. Final local results:89/89 tests and production build pass.

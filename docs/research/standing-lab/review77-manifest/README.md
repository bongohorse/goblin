# Issue77 — manifest review fix

P2, scripts/review-actuation74.mjs/verifyManifest: removing gate-b72/README.md from the supplied manifest returned11 verified entries without error. Complete enumeration is required for the new immutable evidence, not just correctness of present hashes. The helper now requires exactly the covered sibling file set and rejects omissions/empty/unknown/path entries before hashing. No old manifest or measurement changed.

Three older directories intentionally lack README hashes (torso-torque60, review68, target-study52). The check() call now names those three legacy README exclusions explicitly; strict default verification does not silently exempt every README. Existing83 manifest entries in the full stack remain valid, byte-identical. Legacy README bytes are separately pinned below and preserved, not retroactively added to old manifests.

This is a stored-data validator fix, not an engine/command/criterion change. Source-hash snapshots under actuation74 remain historical c8fc281; the following hashes pin current reviewed sources. Independent135 fresh reproduction and future limited-upright decision live in PR76/review77. No merge/deployment/upright execution.

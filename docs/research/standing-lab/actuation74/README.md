# Issue #74 — limited actuation review and protocol decision

**Recommend a separately authorized bounded actuation measurement, not precision certification or upright.** [Protocol](protocol.md) and [config](config.json) define the27-case/5-world local claim, still unexecuted. [Spec/Engineering review](review.md), [independent stored-data math](independent-checks.json), [29 independent references](independent-reference.json), [before](reader-before.json)/[after](reader-after.json) reader corruptions, [provenance](provenance.json), [checks](checks.json), [manifest](sha256.json).

Issue74 explicitly narrows the proof purpose. The absence of a general engine error envelope leaves THAT claim indeterminate; it does not invalidate a separately correct public command trace or a local impulse/API/frame control. Positive/negative commands can supply empirical fixture evidence while physical POST endpoint/H residuals remain descriptive. Command pairing does not exclude every common external/numerical moment. Residuals do not establish an outer torque, body distribution, engine defect,6s coherent bias or standing success.

The original #72 broad-budget decision, config/nulls, protocol, initial withdrawn arm-axis screen and torso-specific corrected screen remain byte-identical history. This alternative protocol provides an explicitly approved-by-Issue74 claim boundary, not fitted acceptance tolerances. It contains no engine/H/endpoint precision gate or use of those screens in its verdict. #60 remains stopped until a separate execution task.

## Concrete findings and fixes

Two P2 Reader findings in PR73 validated at e025db6: malformed build_id and a fabricated initial_alignment_difference both accepted. Same raw corruption patterns are rejected after the narrow source fix; original data and all62 existing SHA256 entries are unchanged. Historical reader source hash in gate-b72/provenance.json identifies its old review snapshot; current source hash is recorded separately here. No attribution replay or evidence regeneration.

## Proposed local check and remaining uncertainty

24 positive immediate-impulse/free-torque/connected-torque cases plus actual missing-reaction, wrong-frame and extra-dt negative commands. Hard intended WORLD +tau/-tau/same-phase/no-accumulation/Nm/whole-vector cap checks are independent from physical response. Pure encoding prototype rounds float32 components toward zero and verifies an exact dyadic cap, while legacy nearest-round .15000000596046448Nm readbacks remain untouched. The proposed future command policy is not applied to any engine run in this review.

Reference/data validity, local API diagnostic markers and empirical negative-model separation are separate from general engine precision. No endpoint or H pass marker hides inside a descriptive metric. Reference-only numerical guards remain at previously validated resolution, never enlarged or presented as a statistical/domain-wide engine bound. All five repeats and failures/invalids must remain visible. Actual Frame/Units empirical negatives have NOT been measured yet; if they cannot distinguish intended from faulty actuation, stop with a local blocker.

A later independently authorized small-upright experiment retains original PD1.34/1.34, nominal cap.15, .01rad/.02rad/s/6s, domain.2 and five worlds. It measures those behavioral quantities directly. It is not run here, not inferred from an Ein-Step residual, and supplies no FullRig/Standing permission by itself.

## Reproduce the review without new experiments

Node24.21.0, npm ci, same lockfile. Output outside clean worktree:

    node scripts/torso-gate-b72-reader.mjs docs/research/standing-lab/gate-b72/attribution.json
    node scripts/review-actuation74.mjs <outside>/independent-checks.json
    node scripts/review-torso-reference68.mjs docs/research/standing-lab/review68/diagnosis.json <outside>/independent-reference.json
    node --test tests/actuation74.test.js tests/torso-gate-b72.test.js
    npm test
    npm run build

These verify stored data and pure math; review-actuation74 creates no world or physics step. Existing regression suite remains applicable. New actuation74 manifest complete, prior62 entries preserved; targeted mismatch hash rejected. Browser N/A. Final CI/head/review on GitHub. No new attribution/sweep, merge, deployment or upright experiment; stop after decision.

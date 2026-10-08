# Outcome-driven development

## Product outcome versus research evidence
Follow [gameplay-first policy](../development/gameplay-first.md). Game-product features may use labelled assists, animation and explicit physics ownership handoffs if they improve reliable play and measured performance. Fully dynamic Lab outcomes retain their own stricter physics rules; neither a gameplay prototype nor green CI constitutes an unassisted Standing pass. Report game feel/interruptibility and research telemetry under different acceptance criteria. Do not turn a failed research study into a production prohibition.

## One work package, one useful result
Each issue states a functional outcome, current baseline, measurable improvement or decision, bounded scope and relevant checks. Implementation, ordinary repairs, targeted validation, internal review and draft PR belong to that same issue. Split only at independently useful results or real dependencies; do not create tickets for routine adapter fixes, each review finding or each internal gate.

## Development and evidence are different phases
Before freezing a research run, use small real installed-API and observer smoke checks. Verify data meaning and timing, not only array shape or synthetic fixtures. For contact/support work, cover current touching, separation and loaded contact against an independent observation appropriate to the claim. Observer failure is not controller failure.
State diagnostic and research budgets separately in the issue. Development permits ordinary in-scope repairs and the relevant rerun within those budgets. A frozen measurement preserves original traces, failures and parameters; a changed implementation receives a new version and honest provenance. Never overwrite evidence or silently turn a diagnostic into a scientific result.

## Stop classification
- Ordinary implementation/API/serialization/observer bug: repair within scope, run focused checks, continue when trustworthy. Do not escalate every fix to a new user turn.
- Valid negative or inconclusive behavior: report it and continue independent planned cases if the protocol permits and they remain safe. Do not claim success or repeat until pass.
- Untrustworthy common measurement, unstable/nonfinite simulation or unresolved mechanical assumption: stop the affected experiment. Repair the common prerequisite within authorized scope before a versioned restart if the issue allows it; otherwise provide one concrete blocker and remedy.
- New hypothesis, threshold/gain/rig change, exhausted budget or out-of-scope work: requires a separately scoped decision. No hidden tuning.
Historical ticket-specific freezes and budgets remain binding until explicitly amended. These rules authorize no pending experiment, merge or deployment.

## Checks proportional to the change
During development run focused checks for changed behavior. At the final head run required repository checks and build once; repeat only for new relevant edits, failures or unresolved concerns. CI remains required. Documentation-only changes need diff/link/consistency review, not new physics runs or browser sessions.
A full independent experimental reproduction needs a stated reason: disputed result, changed measurement/physics or high-impact release claim. Do not automatically rerun every historical study for each prose/reader edit. Stored evidence checks are preferred where they answer the question.
Browser QA covers changed UI/runtime behavior; CLI-only research can state browser N/A. Native visibility and hardware budgets remain separate claims.

## Progress and reporting
Report baseline versus candidate using metrics appropriate to the lane. For Standing research: standing/contact time, foot support, drift, torso error and segment reaction peaks. For gameplay: complete interaction cycles, interruption/reset reliability, comprehensible reactions, qualitative player feedback and actual frame-time cost. Tests green is verification, not functional improvement.
Use one concise issue summary, one result table and links to raw evidence. Reuse existing schemas/runners where sound; do not add manifests or duplicate reports without a concrete integrity need. Preserve existing historical evidence contracts.
At completion state: what changed, what the experiment actually establishes, what remains uncertain and exactly one next development lever. Keep research to a specific missing fact with a bounded question. Prefer building the next usable Lab capability over broad research or general engine certification without a concrete blocker.

## Reviews and release
Review inside the work package, fix findings there and label agent self-review honestly. A separate review issue is reserved for a justified independent assessment. Merge/deployment requires its existing explicit authorization; the workflow does not infer release permission.

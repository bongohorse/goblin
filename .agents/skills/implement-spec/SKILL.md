---
name: implement-spec
description: Implement an explicitly requested multi-ticket Goblin spec using a dependency graph, isolated worktrees and one integration branch. Do not select automatically for one issue or research gates.
---

# Implement Spec - Goblin

Use only when the user explicitly requests this skill or whole-spec orchestration. Installing it does not authorize execution. Read AGENTS.md, docs/agents/issue-tracker.md, the full spec, comments and relevant skills.

1. Record authorized tickets, acceptance criteria, blockers, stop conditions and fixed base SHA. Detect cycles, missing blockers and unresolved decisions before dispatching affected work. Inspect evidence and integrated commits rather than trusting closed-ticket status alone.
2. Separate implementation dependencies from human decision/research gates. An experiment recommendation does not authorize its next experiment/controller. Preserve stop-after-one-ticket instructions even when further tickets are ready. For standing/recovery, read docs/development/labs.md and canonical research; use Standing Lab first, preserve baselines and local Rapier compatibility checks.
3. Create a dedicated integration branch from the inspected base. Optionally delegate read-only discovery; share concise pointers to notes rather than duplicating context.
4. Dispatch only the authorized ready frontier. Assign each implementer its own branch/worktree based on the current integration SHA, ticket/spec pointers, file ownership, checks and stop conditions. Serialize shared-file changes and experiments sharing settings. If delegation/worktrees are unavailable, execute the graph sequentially and report that limit.
5. Load .agents/skills/implement/SKILL.md for each ticket. Reproduce behavioral failures and add focused regression checks where a meaningful seam exists, then implement and verify. Do not depend on an absent tdd skill or force tests for prose edits.
6. Before integration, merge the latest integration tip into the ticket branch, resolve conflicts in scope and rerun relevant checks. Never reset dirty worktrees or discard another agent's work. Record commit and evidence.
7. Serialize integration, using a merger subagent when available. Confirm the ticket branch contains the integration tip and integrate with git merge --ff-only. If the tip moved, update and verify again. Unlock dependents only after integration and acceptance pass. Stop affected work on failed checks or unresolved findings.
8. After the first integrated commit ahead of the base, create/update one draft PR referencing spec/tickets. Use Refs for incomplete work and closing references only for fulfilled criteria; leave parents open when deferred criteria remain.
9. Load .agents/skills/code-review/SKILL.md against the fixed base; fix in-scope findings and rerun affected checks. Load .agents/skills/pr/SKILL.md for the body. Distinguish tests/build, browser behavior, target-device and live evidence.
10. Report integrated/blocked/deferred tickets, branch/head, PR, checks and limits. Leave the PR draft unless readiness was authorized. Do not merge to main, deploy or manually close issues just because orchestration finished.
11. Remove only this run's worktrees after confirming work is committed and recoverable. Retain dirty/failed worktrees and report them; never force cleanup.

---
name: retro
description: Analyze a Goblin coding session and propose evidence-backed agent environment improvements when the user explicitly requests a retrospective. Do not run automatically.
---

# Retro - Goblin

Treat this as analysis and recommendations. Installation does not authorize a retrospective or edits. Use the specified session, defaulting to the visible current session. Read only relevant logs identified or made available by the user; do not search unrelated private sessions or reproduce credentials. State missing-log limits.

1. Read AGENTS.md, relevant skills, package.json, CI workflows and existing development docs.
2. Trace concrete events to failures, repeated lookup or wasted output. Separate observations from hypotheses.
3. Inspect:
   - Navigation: missing pointers and hidden ownership; prefer pointers to existing docs.
   - Automated checks: existing tests/build/hooks, unwired checks and gaps linked to observed mistakes. Missing lint alone does not prove missing guardrails; Goblin already runs tests/build in CI.
   - Standards: propose deterministic checks for mechanical violations and review guidance for judgment calls; avoid duplicating enforced rules.
   - Tool economy: excessive JSON/logs, repeated reads and avoidable network research; prefer filtered output and local Rapier docs.
   - No-ops/information access: dead instructions, unavailable tools and missing evidence. Do not treat Linux checks as Windows GPU proof or change global tools.
4. Present a short severity-ordered table with evidence pointer, observed problem, smallest proposed fix, benefit and confidence. Identify existing checks addressing the concern. Report no finding when appropriate.
5. Stop after recommendations unless particular fixes were explicitly authorized. Do not autonomously edit AGENTS.md, skills, CI, dependencies, credentials or global configuration. Do not start self-correction loops. Use small issue gates for accepted fixes.

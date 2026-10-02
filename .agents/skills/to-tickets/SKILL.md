---
name: to-tickets
description: Split a Goblin GitHub issue, roadmap section, plan, or spec into small agent-sized GitHub sub-issues with blockers and acceptance criteria. Use especially for "Issue in Teilaufgaben aufteilen".
disable-model-invocation: false
---

# To Tickets - Goblin
Read `docs/agents/issue-tracker.md` first.

## Process
1. Read the complete parent issue and comments.
2. Inspect relevant code so the split matches reality.
3. Split into vertical slices, not layer chores.
4. Keep each child small enough for one focused agent session.
5. Put prerequisite cleanup first only when it truly gates later work.
6. Give every ticket explicit acceptance criteria and blockers.
7. Create child issues in dependency order.
8. Add a `## Teilaufgaben` checklist to the parent.
9. Use native GitHub sub-issues when possible; otherwise parent checklist + `Parent: #N` in every child is mandatory.

Do not close the parent.

## Child template
```markdown
## Parent
#<parent>

## What to build
A user-visible or independently verifiable result.

## Acceptance criteria
- [ ] Concrete behaviour/check 1
- [ ] Concrete behaviour/check 2
- [ ] `npm run build` passes
- [ ] No new relevant browser-console errors

## Blocked by
None (can start immediately)
```

Only add mobile/Pages/physics criteria when relevant.

Good: one complete gameplay behaviour, one reproducible bug fix, one complete CI/deploy capability.
Bad: "change CSS", "edit physics", "update tests", or giant mixed-scope issues.

If the user explicitly says to create subtasks, publish them without another approval round unless unresolved product decisions materially change the split.

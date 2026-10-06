---
name: pr
description: Write or update a concise Goblin PR body with the concrete change, before/after evidence, rollback risk and affected scope.
---

# PR - Goblin

Read the final diff and originating issue. Describe the final implementation for a reader without conversation context. Use docs/GLOSSARY.md vocabulary when present. Scale detail to the change.

```markdown
## Summary

<concrete problem/trigger, resulting behavior and issue reference>
<optional smallest useful visual>

## Evidence

- Before: <observed behavior, failing check or previous document shape>
- After: <verified behavior/document change, exact command and result>
- Limits: <relevant unperformed checks or remaining acceptance gaps>

## Merge risk

**Door:** two-way / one-way; <rollback method or irreversible consequence>
**Blast radius:** low / medium / high; <affected systems/routes/workflow>
```

Use visuals only when they clarify ownership, branching or behavior: Mermaid for relationships, tables for exact comparisons, pseudocode/diffs for algorithms. Do not force diagrams for prose edits.

Use actual execution results and evidence pointers. For visual/input/physics work, include relevant screenshots, video or reproducible browser behavior checks. Build success alone proves neither gameplay nor standing. Identify revision, environment, seeds/configuration and measurements when material. Distinguish Lab acceptance from arena integration, Linux browser checks from Windows GPU performance, and local checks from Pages/live verification.

Never fabricate a failing-before run, test count, screenshot, deployment or measurement. If a before run is missing, use the observed problem/diff and state the gap. Prose edits can use document comparison and structural validation without runtime proof.

Assess actual reversibility and affected scope. Mention physics defaults, reset/input, assets and CI only when affected. Use Refs #N for partial work and closing references only for fulfilled criteria. Writing a body does not authorize merge, deployment, issue closure or marking a draft ready.

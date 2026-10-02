---
name: pr
description: Write a concise Goblin pull-request body with scope, evidence and merge risk.
---

# PR - Goblin
Use:

```markdown
## Summary
- what changed
- why
- issue reference

## Evidence
- Build: `npm run build` -> pass/fail
- Behaviour: what was actually verified
- Live/Pages check when relevant

## Merge risk
**Door:** two-way / one-way
**Blast radius:** low / medium / high
<main risk>
```

For visual/gameplay changes, screenshots/video/manual repro evidence is stronger than build output. Never claim verification that did not happen.

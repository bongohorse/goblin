---
name: implement
description: Implement one Goblin issue or spec end-to-end, verify it, review it, and leave the branch ready for PR.
disable-model-invocation: true
---

# Implement - Goblin
1. Read full issue and comments.
2. Inspect current implementation.
3. Identify the smallest complete vertical slice.
4. Implement only that scope.
5. Add/adjust a focused regression check where a good seam exists.
6. Run `npm run build` regularly.
7. Verify gameplay/input/visual behaviour directly when relevant.
8. Run `code-review` against the issue.
9. Fix in-scope findings.
10. Commit the completed gate.

Keep CI and Pages compatible. Do not fold unrelated refactors into the change.

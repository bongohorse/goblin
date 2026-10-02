---
name: threejs-qa-release
description: Verify Beat your Goblin in real browser states and keep CI/GitHub Pages release-ready with production builds, mobile checks, console checks and deployment evidence.
---

# Three.js QA Release - Goblin

Prove the player-facing build works, not just that source code compiles.

## Focused QA

Select checks matching the change:
- game starts
- main pointer/touch interaction works
- changed tool works
- objective/score state updates
- reset/retry works
- UI fits desktop and mobile landscape
- no new relevant console errors/warnings
- production build passes

## Full release pass

1. Run `npm run build`.
2. Verify Vite base-path behaviour for GitHub Pages.
3. Check the production build rather than dev mode only.
4. Exercise start -> active play -> interaction -> round end -> retry.
5. Check desktop and mobile landscape.
6. Check browser console/network failures.
7. Check repeated resets for object/resource growth.
8. Review bundle/large assets when new runtime assets were added.
9. Verify GitHub Actions CI.
10. Verify GitHub Pages deployment and live URL.

## Graphics evidence

When visuals changed, combine this skill with `threejs-visual-validation`.

## Audio evidence

When audio changed verify:
- unlock after user gesture
- correct event trigger
- mute/volume behaviour
- pause/restart cleanup
- no repeated duplicate loops
- no decode/load errors

## Release rule

A green build is necessary but not sufficient for gameplay changes. Report what was actually exercised.

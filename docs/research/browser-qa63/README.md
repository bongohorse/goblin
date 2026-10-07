# Browser QA review fixes — Issue #63

2026-10-07. Fixes to existing Draft-PR #62 after review5437575901. Original
review head91cb96676a9d67a97476d763a2f6b4e295e53e33;
base840c5b1f635da1682f8c84dbe671ac9bf2d465d9. No runtime/physics/dependency changes.

## Spec

Both scoped P2 findings fixed. Unspecified installed-Chrome and Edge F5 profiles
removed. Windows/container docs consistently use the selected Chrome Portable;
an executable isolated manual-start command reads the same ignored local JSON.
No machine path committed, no global/MGD/private-profile changes.

The Resume oracle now requires positive plausible progress, enforces measured
per-frame and total catch-up budgets, and checks run identity, FB20 mode,
invalid/termination and pause/visibility states. It preserves automatic return
evidence before a separate explicit Pause/Resume measurement. Its acceptance
contract and real LabClock-derived limits are in [Browser QA](../../development/browser-qa.md).

The old predicate accepted delta=0 because it only imposed an upper bound. Focused
tests now reject zero and one-step progress over a second, total/per-frame bursts,
synchronous catch-up, reported-max mismatch, run replacement/missing IDs,
invalid/termination and wrong pause/visibility states. Positive cases drive the
real LabClock at60Hz and100ms frames; legitimate three-step slow frames pass.
Native-event negatives distinguish absent/untrusted transitions from deviations.

## Engineering / execution evidence

Windows, existing Node24.21.0, Chrome Portable156.0.8078.4 only. Fresh pinned MCP
stdio startup confirms the actual selected installation in chrome://version,
headed and isolated temporary profile. No other browser selected. Browser hash
unchanged: ea4eb4ea31e82309db8b8b9dcdd445f2ed997d09f96f95f7d78db26ed39be249.
Live build840c5b1f635da1682f8c84dbe671ac9bf2d465d9, dirty=false,
sourcea8b43967da40a2b9dbd7a6b060d389eed4db6061b43689994a81c6072e04611b.

| New measurement | Native prerequisite | Separate Resume | Assessment |
| --- | --- | --- | --- |
| native-concurrent.json, PID17336 (overlapped own Smoke) | standalone/live events=[], hidden=[] |60steps/1003ms, max1/frame; valid run |missing-native-events, exit1; supplemental only |
| native-serial.json, PID19872 (after own Smoke closed) | standalone/live events=[], hidden=[]; activeStep11→return39→+500ms69, paused=false |60steps/1003.9ms, max1/frame, same valid run; explicit final Pause |missing-native-events, exit1; Resume PASS independently |
| smoke.json, fresh configured MCP |not a native visibility test |LabStep1, explicitPause stableStep14/+500ms, Reset0, JSONdownload, game15parts/60s/score0 |Smoke PASS, pageerrors=[] |

No new native PASS claimed. Native Hidden-Pause was never reached in these new
measurements; continuing steps are not a demonstrated product defect. The
historical single5.5239s PASS and two failed repeats in
[Issue61 evidence](../browser-qa61/README.md) are unchanged, with their six hashes
rechecked. The stricter oracle does not make the older generalized harness
retroactively reproducible. No new browser automation diagnosis performed.

Reports retain all events/frame samples, omit machine paths and record original
local source hashes plus a three-report manifest. Collected in the dirty fix
worktree before commit. The serial collector hash identifies the committed
collector; final oracle boundary checks were added afterward and replayed against
the retained raw measurement. Its final hash/replay are explicit in that report.
Do not reinterpret deployed build provenance as the QA-fix Git head.

70/70 runtime/oracle tests and production build pass; existing Rapier chunk warning.
Syntax/diff checks pass. No app UI, renderer, resource, pointer/touch, physics or
Pages asset-path change. Final commit/CI evidence is recorded on #63 and PR62.

## Decision / remaining manual check

Scoped fixes are suitable for the QA/documentation PR after final-head CI and
self-review. This is not an independent Approval or a general native Hidden
acceptance. Keep PR62 Draft; no merge/deployment here. #60 remains paused.

The manual same-Portable countercheck remains pending. Use the isolated manual
start in [VS Code setup](../../development/vscode.md), first about:blank then live
FB20. Install the passive logger from the
[review](https://github.com/bongohorse/goblin/pull/62#pullrequestreview-5437575901),
close DevTools, select another tab for>=6s, return and wait500ms before reading.
Require trusted hidden→visible spanning>=5s, stable step/paused=true through
return, same run/no invalid/termination, then explicit Resume without catch-up.
Without hidden events: prerequisite missing. Genuine hidden without pause:
separate Lab-fix requirement. No manual user action claimed as performed.

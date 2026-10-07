# Chrome Portable setup and native visibility diagnosis — Issue 61

2026-10-07. Chrome Portable Beta156.0.8078.4 from the selected launcher installation
is the sole Goblin QA browser. Actual Chrome.exe has a valid Google signature and
SHA256 ea4eb4ea31e82309db8b8b9dcdd445f2ed997d09f96f95f7d78db26ed39be249.
The launcher README/Profile.txt contract was read; automation uses its contained
binary with fresh isolated profiles, never the user's portable profile. No update.

Local Goblin MCP was changed to the pinned0.0.83 server with explicit executablePath
and headed mode in an ignored local JSON. Previous project values are backed up
locally. A fresh MCP stdio instance used this actual configuration and reported
Chrome/156.0.8078.4. Already running Codex MCP requires restart; it was not claimed
to have hot-reloaded. Restart Codex/MCP for the Goblin workspace before its next
interactive browser check, then verify Browser.getVersion before navigation.

[Permanent policy and manual/native procedure](../../development/browser-qa.md).
Production browser harnesses share the local configuration and fail closed with
no Edge/installed-Chrome/Playwright-Chromium fallback. Missing config and conflicting
legacy executable overrides were rejected. Machine paths are local, not committed.

## Spec

Setup and ordinary Chrome smoke pass. Native evidence exists for one bounded run,
but automated repetition is NOT reliably accepted. No application or physics fix.
No global/MGD settings, dependencies, launcher/Profile.txt or private profile edits.
No merge/deployment or automatic continuation of Issue60.

## Engineering / measured evidence

Node24.21.0, Windows x64. MCP and direct-CDP Browser.getVersion both verify156.0.8078.4.
Live build840c5b1f635da1682f8c84dbe671ac9bf2d465d9, dirty=false, source hash
a8b43967da40a2b9dbd7a6b060d389eed4db6061b43689994a81c6072e04611b.
MCP Smoke: Lab reset→Step1, pause stable, reset→0, JSON downloaded;
game start15parts/60s/score0. No pageerrors. The initial probe's download.path()
was unsuitable over the remote connection; saveAs() fixed only that test harness.

| Probe | Standalone | Live FB20 | Assessment |
| --- | --- | --- | --- |
| Fresh configured MCP |visible/focused, no events |Step11→27 while other tab selected, no pause |no native evidence |
| Raw CDP with debugger attached |visible/unfocused, no events |Step14→35 |excludes Playwright as sole sufficient explanation |
| Raw CDP with background debugger detached |trusted hidden/visible |Step11 remains paused across5.5239s and return |one genuine native pass |
| Generalized probe, OS temporary profile |no hidden/events |continues |failed repetition |
| Same probe, isolated workspace profile |no hidden/events |continues |failed repetition |

Positive run878a4097-be54-4fcf-b69a-3aac5f45bb1d, Chrome PID26032:
hidden/trusted at689.5ms; visible/trusted at6213.4ms; five hidden samples allStep11/
paused=true. Returned and another500ms stillStep11/paused=true. Explicit Resume:
60Steps/1003.8ms/max1step per observed rAF. No invalid/termination/run-ID change.
No synthetic visibility event/property patch/lifecycle emulation in any probe.
The in-page observer recorded while detached; reattachment only followed return.

The subsequent failed runs are preserved rather than discarded. Neither temporary
profile location nor debugger detachment is a reproducible fix by itself. Actual
underlying focus/window/debugger interaction remains unresolved. No production
defect is proved: those failures never reached hidden=true. A same-installation
manual countercheck remains required for robust native QA; use the documented
procedure and retain trusted events/steps. The positive case is not an all-run claim.

The native probe asserts actual hidden events, paused stable steps, a >=5s hidden
interval and bounded explicit resume; absent events intentionally fail. It saves
both passes and failures. File-version/CDP identity is checked on every run.
An interactive MCP is suitable for ordinary smoke, not this native criterion while
its background observer remains attached. No GPU/weak-device budget claim.

## Evidence provenance and checks

Six JSON reports and SHA256 manifest preserve measurement data. Original local
source hashes are recorded; machine executable/profile/argument paths are omitted
from committed copies. The reports were collected with external local MCP/CDP
diagnostic harnesses; the committed generalized probe's two executions failed as
recorded. Its code is not falsely presented as a clean successful measurement.

Locked npm ci,67/67 tests, production build, syntax checks and fail-closed config checks pass.
Build has the existing large Rapier chunk warning. Main runtime/UI/assets and
physics baseline data are unchanged. Spec/Engineering self-review found no remaining
scope finding; automated visibility remains a disclosed QA boundary, not hidden.

Issue60's CLI-only work has no demonstrated Lab-defect blocker from this diagnosis,
but it is not resumed here. Its next instruction must explicitly decide continuation.
Future native browser claims require a genuine observation or manual countercheck.
Issue61 stops at setup/diagnosis/Draft-PR; separate review/merge and MCP restart remain.
`chrome://version` in a fresh configured MCP independently confirmed the exact
selected contained executable and a Playwright temporary profile, headless=false.
The real executable/profile paths remain in local identity evidence; the committed
identity report records the match and original source hash, without machine paths.

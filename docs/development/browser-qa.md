# Goblin browser QA

Since Issue #61, use only the user's selected **Chrome Portable Beta x64**
installation for Goblin browser checks. No Edge, installed Chrome or downloaded
Playwright Chromium fallback. A browserName of chromium selects the automation
engine; it does not select the binary when executablePath is supplied.

Read the selected installation's README and Profile.txt before setup. The launcher
selects the sibling Chrome Beta x64/Chrome.exe and portable profile. For automation,
use that exact contained binary with an isolated temporary profile instead of the
user's portable profile. Do not update the installation or edit Profile.txt.

Copy .codex/chrome-portable.example.json to the ignored
.codex/chrome-portable.local.json. Set executablePath to the verified actual
Chrome.exe, not the launcher. Machine-specific paths stay local. Configure only
goblin_windows_browser in the project's .codex/config.toml, using the pinned
MCP and --config argument; enable it only on the Windows host. Use an absolute
local JSON path if the MCP working directory is uncertain. Restart the Codex
session/MCP after changing its launch configuration; an already running Edge
session does not become Chrome. Confirm browser identity before navigating.

The production test:browser and lab:browser harnesses read the same JSON, or
GOBLIN_BROWSER_CONFIG for an isolated worktree. Missing config, mismatching legacy
executable override, or missing sibling launcher fails instead of falling back.
Visible mode is the default; GOBLIN_HEADED_BROWSER=0 explicitly requests headless
for checks where native visibility is not required. Historical evidence files
keep their original browser labels and are not retroactively Chrome evidence.

For each acceptance, record actual executable/process, file version/hash, CDP
Browser.getVersion, isolated profile and control method, plus deployed build SHA.
Keep debugging local (pipe or loopback only), not an exposed network endpoint.
No browser automation run alone certifies Windows GPU or weak-device budgets.
VS Code has no repository browser F5 profiles. Use the isolated Windows manual
start in [VS Code setup](vscode.md); installed-browser launch profiles do not meet
this policy.

## Native visibility

First test a standalone observer page; then the live Lab. Record genuine trusted
visibilitychange events, hidden, visibilityState, hasFocus, timestamps and Lab
step/paused state. Observe the background tab without activating it. Require an
active FB20 run, at least five seconds hidden with stable steps/paused=true,
paused return and an explicit resume without hidden-time catch-up.

Do not substitute dispatchEvent, hidden-property patches or lifecycle emulation.
Playwright's focus emulation can mask native tab visibility. A browser switch
alone is not a fix. If automation stays visible, preserve the negative result and
prepare a manual same-installation check: resume FB20, select another tab for five
seconds, return, confirm it remains paused at the transition step, then resume.
Collect trusted event/step evidence before claiming a pass. Diagnose browser
instrumentation separately; change Lab code only for an independently reproduced
failure when hidden=true was genuinely observed.

Issue #61 contains the machine-specific execution report and remaining QA gates.

## Independent native probe

`node scripts/chrome-native-visibility.cjs` launches the same configured portable
binary visibly with a fresh temporary profile and loopback-only CDP, without
Playwright initialization. It first checks standalone visibility, then the live
Lab at its actual deployed SHA. It detaches the background target's debugger
before the real tab switch; an in-page observer records trusted events and samples
without reactivating the tab. It reattaches only after returning. This is an actual
native transition, not an emulated lifecycle event. Attached-debugger measurements
can stay visible even without Playwright, so they must not certify Hidden-Pause.

The probe verifies CDP version against the configured executable's file version,
records executable hash/process/profile/launch arguments, asserts hidden pause,
stable return and bounded explicit resume, and saves JSON under the OS temporary
directory or GOBLIN_VISIBILITY_OUTPUT. Debug access is closed after the probe;
only that probe's browser is closed. Temporary profile is not the user's profile.
Use the interactive MCP for ordinary smoke checks; use this independent observer
for native visibility. No alternative browser is selected on failure.

Issue #61 observed one genuine native pass with this detached observer, followed
by two failed repetitions with no hidden events. Therefore detachment is not a
certified universal fix. The harness deliberately fails when native transition
evidence is absent; never turn its empty event trace into a Lab defect or pass.
The retained raw reports distinguish the positive case from the failed repeats.
GOBLIN_BROWSER_PROFILE_ROOT may place a fresh isolated profile in another local
directory for an explicitly scoped environment comparison; never point it to a
private browser profile. Native acceptance still needs a same-Chrome manual
countercheck when the automation cannot reproduce the transition.

## Resume oracle (Issue #63)

The probe preserves the automatic return measurement, then explicitly pauses
before a separate one-second Resume check. All frame samples retain run_id,
FB20 mode, invalid/termination, paused and hidden state. A missing native event
produces `missing-native-events`, not a product defect or a native pass; a Resume
check can pass independently without establishing Hidden-Pause.

The oracle follows the existing LabClock: 60Hz, up to three steps per frame,
elapsed time clamped to 50ms. It checks positive plausible progress, the measured
max_per_frame, each frame's elapsed-time budget (including a residual fraction of
one step), the total wall-time budget and explicit paused finish. Slow frames may
legitimately produce two or three steps. The lower bound uses the sum of clamped
frame intervals, with three steps allowed for clock priming/sampling/rounding;
zero progress always fails. It does not impose the historical run's max1/rAF on
all devices. Tests drive the real LabClock at normal and slow frame intervals and
reject stillstand, catch-up, run replacement, invalid/termination, wrong pause
states and missing/untrusted native events. No Lab timing/runtime code changes.

For the manual countercheck, use the same isolated Portable start and the live
Standing Lab. Install a passive visibilitychange/interval logger via DevTools,
then close DevTools before selecting another tab for at least six seconds.
First do this on about:blank, then with active FB20. After return wait 500ms before
reading the logger: require trusted hidden/visible spanning at least five seconds,
stable step/paused=true from the hidden transition through return, unchanged
run_id and no invalid/termination. Explicit Resume must advance without catch-up.
The executable logger is in the [PR review](https://github.com/bongohorse/goblin/pull/62#pullrequestreview-5437575901).
This manual countercheck remains pending; do not report it as performed.

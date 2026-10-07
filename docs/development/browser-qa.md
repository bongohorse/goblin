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

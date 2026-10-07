# Goblin in VS Code (Windows 11)

## Separate from MGD

Use a separate clone, window, profile and Codex conversation. Do not add both repositories to a shared multi-root workspace. Goblin uses npm, Node >=24.21.0 <25, development port 5174 and preview port 4174. An occupied port causes a clear error instead of silently choosing another port. MGD's files and global VS Code settings are not modified by this setup.

Create an empty **Goblin** profile using VS Code's Profiles editor. Install the recommended extensions in that profile and associate it with the Goblin folder. Do not copy MGD-specific settings. Profiles separate editor settings/extensions; they do not isolate Git credentials, the Codex account or all user-level MCP settings. Check inherited MCP servers when starting the Goblin session. Use repo-local configuration for Goblin tools and never commit credentials.

## Windows directly (recommended for agent-controlled GPU browser tests)

Install Git and Node 24.21.0 (or a later Node 24 release). In Windows PowerShell:

```powershell
git clone --recurse-submodules https://github.com/bongohorse/goblin.git
code --new-window --profile Goblin .\goblin
```

If already cloned, open that folder instead of cloning over it. After pulling changes that add or update submodules, run:

```powershell
git submodule update --init --recursive
```

This initializes the pinned local Rapier reference at `vendor/rapier`, including the matching website docs and TypeScript/Rust source used for Codex physics research. `--profile Goblin` creates the named profile if absent. Verify the selected profile and install the recommendations through the Extensions panel.

In the Goblin terminal:

```powershell
node --version
npm ci
npm test
npm run build
npm run dev
```

Open http://localhost:5174/?debug in Edge. Tasks are available under **Terminal → Run Task**. F5 with **Goblin: Windows Edge** starts Vite and a debugging browser; Chrome is an alternative if installed. Stop the development task through **Terminal → Terminate Task** when finished. `start-windows.bat` is an alternative that installs locked dependencies, propagates failures and starts from its own directory.

## Optional separate devcontainer

With the container engine used for your MGD environment running, install Dev Containers in the Goblin profile and select **Dev Containers: Reopen in Container**. This repo supplies its own container, Node 24.21.0, Git/GitHub CLI and Codex extension. Creation runs `npm ci`; dependencies live in a Goblin-specific Docker volume, separate from native Windows dependencies and from MGD. No MGD volumes, credentials or Codex home directory are mounted.

The development server forwards 5174 to Windows. Start **Goblin: dev** and open the forwarded URL in Windows Edge. F5 is configured to launch the browser on the UI host rather than inside Linux. If a particular container engine/debugger cannot do this, open Edge manually using the Ports panel. A container browser does not establish Windows GPU performance.

The container config is supplied for standard Dev Containers-compatible engines. Its creation and host browser launch must still be verified on your Windows/WSLC setup; they were not executed in the cloud environment.

## Optional Codex browser control on Windows

`.codex/config.toml` includes a project-scoped Playwright MCP server named `goblin_windows_browser`, pinned to 0.0.83 and disabled by default. It launches installed Windows Edge with an isolated temporary browser session and vision tools for canvas interactions. No personal Edge profile is used, and closing the session discards its storage.

When Codex executes natively on Windows with Node/npm on PATH:

1. Trust this Goblin project in Codex after reviewing its configuration.
2. Set this server's `enabled` to `true` in the project's `.codex/config.toml` and restart the Codex extension/session. Keep this machine-specific change local; do not commit it.
3. Start `npm run dev` and ask Codex to open http://localhost:5174/?debug using `goblin_windows_browser`, inspect console errors and take a screenshot.
4. Verify Edge's graphics acceleration and the actual renderer; browser access alone does not prove hardware rendering.

Keep this server disabled when Codex executes inside Linux/WSL/devcontainer. Windows Edge is not installed there. Automatic control from that environment requires a separately configured Windows-host MCP connection; this repo does not assume a reachable host address or expose an unauthenticated browser-control port. Manual Windows Edge testing works independently of that connection.

Project config complements user-level Codex config; it does not disable unrelated global MCP servers. Confirm the server name before browser actions. VS Code's F5 debugger and Codex MCP are separate browser sessions.

## Chrome DevTools MCP in the Codex VS Code extension

The Codex extension can use MCP directly; installing Codex CLI is optional. For Windows Chrome Portable, configure a server named `chrome-devtools` through Codex Settings → MCP servers with type STDIO, command `npx`, and three separate argument fields:

1. `-y`
2. `chrome-devtools-mcp@latest`
3. `--executablePath=<absolute path to the actual chrome.exe>`

Use the actual browser binary rather than a portable launcher. Keep machine-specific paths in local Codex configuration; do not commit them or replace existing project MCP entries. The default server creates its own browser profile; verify profile identity before acceptance and do not reuse a personal profile or concurrently share a profile with Playwright. If a fixed profile is needed, configure a separate local `--userDataDir=<path>`.

Save configuration, then use **Developer: Reload Window** in the VS Code command palette (Ctrl+Shift+P) and start a new Codex chat. This is separate from VS Code's F5 debugger. Preserve an already running devserver; otherwise start `npm run dev` on port 5174.

For the connection smoke test, ask Codex to use `chrome-devtools` to open http://localhost:5174/?debug, report the actual browser version and URL, take a screenshot and read the console without editing files. A user-reported test on 2026-10-07 succeeded with Windows Chrome Portable **156.0.8078.4**: start/debug screen captured, no console errors or warnings, only Vite connecting/connected messages. This records connectivity only; it is not an independently repeated gameplay, GPU or Hidden/Resume acceptance.

Use DevTools for console/network diagnosis and performance traces; use Playwright for repeatable gameplay/input tests, including coordinate-based canvas interactions. Report the tool/browser used and any fallback explicitly. Do not interpret a DOM accessibility snapshot as proof of rendered canvas behavior.

### Foreground and Hidden/Resume checks

For foreground measurements, record browser version, executable/profile identity, effective launch arguments, viewport/DPR and GPU/backend. Keep browser conditions consistent across comparisons. A Memory Saver exception can prevent discarding the test site but does not guarantee background animation.

For native Hidden/Resume acceptance, inspect effective browser launch arguments for automation defaults that disable background throttling or occlusion behavior. Use normal Chrome behavior and require observed native hidden → visible events, pause evidence and actual simulation progress after resume. Dispatching synthetic events, switching an automation tab without observing visibility, or a successful connection smoke test cannot satisfy this gate. If native events cannot be produced, report the limitation and leave the gate open; use a manual check in the approved browser environment.

## Production browser checks and continuation

```powershell
npx playwright install chromium
npm run build
npm run test:browser
```

These tests launch Chromium automatically and use the production `/goblin/` path. Screenshots default to the OS temporary directory. Chromium/touch emulation is not native Android or hardware-performance acceptance.

Start a new Goblin Codex conversation with: "Read AGENTS.md, masterplan issue #11 and G0 issue #12, including their current comments. Verify the open G0 checks on this environment and document evidence before moving to G1. Use repo-local skills, keep MGD untouched, and report after each completed task."

G0 implementation was merged in PR #22. Real-device/live-play acceptance remains open; do not mark it complete merely because setup/build works.

## Sources

- VS Code profiles: https://code.visualstudio.com/docs/configure/profiles
- Dev Containers: https://code.visualstudio.com/docs/devcontainers/containers
- Built-in browser debugging: https://code.visualstudio.com/docs/nodejs/browser-debugging
- Codex project MCP configuration: https://developers.openai.com/codex/mcp
- Playwright MCP: https://github.com/microsoft/playwright-mcp

- Chrome DevTools MCP: https://developer.chrome.com/docs/devtools/agents
- Chrome DevTools MCP configuration: https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/configuration.md

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

The development server forwards 5174 to Windows. Start **Goblin: dev** and open the forwarded URL in the selected Chrome Portable. F5 is configured to launch the browser on the UI host rather than inside Linux. If a particular container engine/debugger cannot do this, open Chrome Portable manually using the Ports panel. A container browser does not establish Windows GPU performance.

The container config is supplied for standard Dev Containers-compatible engines. Its creation and host browser launch must still be verified on your Windows/WSLC setup; they were not executed in the cloud environment.

## Codex browser control and production checks

Use only the selected Chrome Portable installation. See [Browser QA](browser-qa.md) for the local MCP configuration, isolated profiles, production harnesses and native visibility gates. No Edge or automatic browser fallback.

## Sources

- VS Code profiles: https://code.visualstudio.com/docs/configure/profiles
- Dev Containers: https://code.visualstudio.com/docs/devcontainers/containers
- Built-in browser debugging: https://code.visualstudio.com/docs/nodejs/browser-debugging
- Codex project MCP configuration: https://developers.openai.com/codex/mcp
- Playwright MCP: https://github.com/microsoft/playwright-mcp

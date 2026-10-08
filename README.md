# Beat your Goblin

Three.js + Rapier browser physics prototype. Masterplan: [#11](https://github.com/bongohorse/goblin/issues/11).

**Product direction:** [Gameplay first](docs/development/gameplay-first.md) — reliable, fun local real-time behavior may use labelled animation, IK and physics assistance. [Scientific Standing Labs](docs/development/labs.md) retain strict unassisted evidence rules and separate acceptance.

Use Node 24.21.0 or a compatible later Node 24 release:

```sh
npm ci
npm test
npm run build
npm run dev
```

VS Code / Windows / separate devcontainer setup: [Development guide](docs/development/vscode.md).

Development: http://localhost:5174/ · Preview: http://localhost:4174/.

Production browser regression checks (including two 60-second idle checks in parallel):

```sh
npx playwright install chromium
npm run build
npm run test:browser
```

The browser test serves the build itself under `/goblin/`. Optional
`GOBLIN_CHROMIUM_EXECUTABLE` selects an installed Chromium binary;
`GOBLIN_SOFTWARE_BROWSER=1` enables a single-process SwiftShader test setup.
`GOBLIN_IDLE_MS=2000` shortens only the idle check for focused development runs;
use the default full duration for acceptance. Screenshots default to the OS temporary directory and
can be redirected with `GOBLIN_DESKTOP_SCREENSHOT`/`GOBLIN_MOBILE_SCREENSHOT`.

Append `?debug` to inspect read-only `window.goblinDiagnostics()` snapshots.
See [G0 evidence and remaining device checks](docs/qa/g0.md).

// Supported browser-QA entrypoint. The historical test sources are hash-pinned
// by SmallTilt79 and must not be edited just to select a browser.
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {portableChrome} = require('./chrome-portable.cjs');

const scripts = Object.freeze({
  game: path.resolve(__dirname, '../tests/browser-smoke.cjs'),
  standing: path.resolve(__dirname, '../tests/standing-browser.cjs'),
});

function prepareBrowserQa(kind, sourceEnv = process.env, identify = portableChrome) {
  if (!Object.hasOwn(scripts, kind)) throw new Error('Unknown browser QA mode; expected game or standing.');
  const {executablePath} = identify(); // Throws on missing/wrong portable binary; no fallback.
  if (typeof executablePath !== 'string' || !path.isAbsolute(executablePath))
    throw new Error('Chrome Portable identity did not provide an absolute executable path.');
  const env = {...sourceEnv, GOBLIN_CHROMIUM_EXECUTABLE: executablePath, GOBLIN_HEADED_BROWSER: '1'};
  // Do not turn a portable GPU/browser acceptance into a software-rendering run.
  delete env.GOBLIN_SOFTWARE_BROWSER;
  return {script: scripts[kind], env};
}

if (require.main === module) {
  try {
    const {script, env} = prepareBrowserQa(process.argv[2]);
    const result = spawnSync(process.execPath, [script, ...process.argv.slice(3)], {
      cwd: process.cwd(), env, stdio: 'inherit', windowsHide: true,
    });
    if (result.error) throw result.error;
    if (result.signal) throw new Error('Browser QA child exited with signal ' + result.signal);
    process.exitCode = result.status ?? 1;
  } catch (error) {
    console.error('Goblin Chrome Portable QA: ' + error.message);
    process.exitCode = 1;
  }
}

module.exports = {prepareBrowserQa};

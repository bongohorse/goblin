const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');

// The local MCP configuration is shared with browser fixtures. Never fall back.
function portableChrome() {
  if (process.platform !== 'win32') throw new Error('Goblin browser QA requires the Windows Chrome Portable host.');
  const configPath = process.env.GOBLIN_BROWSER_CONFIG || path.resolve(__dirname, '../.codex/chrome-portable.local.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const executablePath = config.browser?.launchOptions?.executablePath;
  if (!executablePath || !path.isAbsolute(executablePath)) throw new Error('An absolute portable Chrome executablePath is required; no browser fallback.');
  const binary = fs.realpathSync(executablePath);
  if (path.basename(binary).toLowerCase() !== 'chrome.exe' || path.basename(path.dirname(binary)) !== 'Chrome Beta x64') throw new Error('Expected the selected Chrome Beta x64 portable binary.');
  const launcher = path.resolve(path.dirname(binary), '../Chrome Beta x64 Launcher.exe');
  if (!fs.statSync(launcher).isFile()) throw new Error('The corresponding portable launcher is missing.');
  if (process.env.GOBLIN_CHROMIUM_EXECUTABLE && fs.realpathSync(process.env.GOBLIN_CHROMIUM_EXECUTABLE) !== binary) throw new Error('Legacy executable override conflicts with Chrome Portable.');
  return {executablePath:binary, headless:process.env.GOBLIN_HEADED_BROWSER === '0'};
}
function portableChromeIdentity() {
  const {executablePath} = portableChrome();
  const version = execFileSync('powershell.exe', ['-NoProfile','-Command','(Get-Item -LiteralPath $env:GOBLIN_CHROME_IDENTITY_PATH).VersionInfo.ProductVersion'], {
    encoding:'utf8', windowsHide:true, env:{...process.env,GOBLIN_CHROME_IDENTITY_PATH:executablePath}
  }).trim();
  return {executablePath,version,sha256:createHash('sha256').update(fs.readFileSync(executablePath)).digest('hex')};
}
module.exports = {portableChrome,portableChromeIdentity};

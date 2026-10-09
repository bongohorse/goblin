// Capability smoke only: blank page, no gameplay navigation or world.step().
import {mkdtemp, readFile, stat, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {checkPreview, waitForStep, requireEventPreconditions} from './execution-checks.mjs';

export async function main(args) {
  const allowed = new Set(['--url', '--dist', '--entry', '--executable', '--video']);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!allowed.has(flag) || options[flag] !== undefined) throw Error('arguments: unknown or duplicate option');
    if (flag === '--video') options[flag] = true;
    else {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw Error('arguments: missing option value');
      options[flag] = value;
    }
  }
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major !== 24 || minor < 21) throw Error('runtime: use project Node >=24.21.0 <25; do not change global configuration');
  const previewFlags = ['--url', '--dist', '--entry'];
  if (previewFlags.some(f => options[f]) && !previewFlags.every(f => options[f])) throw Error('preview: provide --url, --dist and --entry together');
  if (options['--video'] && !options['--executable']) throw Error('video: explicit confirmed browser executable required');
  // Exercise callback/argument forwarding before any browser/physics start.
  const page = {waitForFunction: async (callback, arg) => callback(arg)};
  if (!await waitForStep(page, 0, () => 0)) throw Error('runner: wait callback failed');
  requireEventPreconditions('fixture', {step: 0, invalid: false, upright: true}, {step: 0, upright: true});
  console.log('PASS runner arguments/callback and event fixture (no gameplay capability claim)');
  const {default: R} = await import('@dimforge/rapier3d-compat');
  await R.init();
  const world = new R.World({x: 0, y: -9.81, z: 0});
  try { if (world.bodies.len() !== 0) throw Error('wasm: unexpected bodies'); }
  finally { world.free(); }
  console.log('PASS Node Rapier/Wasm init/read/free, zero steps');
  if (options['--url']) console.log('PASS preview', await checkPreview({url: options['--url'], dist: options['--dist'], entry: options['--entry']}));
  if (!options['--executable']) {
    console.log('NOT CHECKED browser/screenshot/video; pass explicit --executable (and --video if needed)');
    return;
  }
  const {chromium} = await import('playwright');
  const scratch = await mkdtemp(join(tmpdir(), 'goblin-preflight-'));
  let browser;
  let stage = 'browser launch';
  try {
    // Own ephemeral context only. Never use/close the user's persistent profile.
    browser = await chromium.launch({executablePath: options['--executable'], headless: false});
    stage = 'context/video encoder';
    const context = await browser.newContext({viewport: {width: 1280, height: 720}, deviceScaleFactor: 1,
      ...(options['--video'] ? {recordVideo: {dir: scratch}} : {})});
    const blank = await context.newPage();
    stage = 'blank page Wasm/WebGL2';
    await blank.setContent('<canvas></canvas><p>Goblin capability preflight — no scene</p>');
    const capabilities = await blank.evaluate(async () => {
      const gl = document.querySelector('canvas').getContext('webgl2');
      if (!gl) throw Error('browser: WebGL2 unavailable');
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      await WebAssembly.compile(new Uint8Array([0,97,115,109,1,0,0,0]));
      return {dpr: devicePixelRatio, renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unavailable'};
    });
    stage = 'browser wait callback';
    await waitForStep(blank, 0, () => 0, 1000);
    stage = 'inline/file screenshot';
    const shot = await blank.screenshot();
    if (!shot.length) throw Error('screenshot: empty inline output');
    const file = join(scratch, 'blank.png');
    await blank.screenshot({path: file});
    if (!(await stat(file)).size) throw Error('screenshot: empty file');
    const video = blank.video();
    stage = 'context close/video finalization';
    // Closing just this page/context finalizes encoder output before inspection.
    await blank.close();
    await context.close();
    if (options['--video']) {
      const bytes = await readFile(await video.path());
      if (bytes.length < 4 || !bytes.subarray(0, 4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]))) throw Error('video: missing WebM output');
    }
    console.log('PASS blank browser/Wasm/WebGL2/real wait callback/inline+file screenshot', {version: browser.version(), ...capabilities, video: !!video});
  } catch (error) {
    if (/ffmpeg/i.test(error.message)) throw Error('video: encoder missing/inaccessible; confirm existing PLAYWRIGHT_BROWSERS_PATH for this process; no automatic installation');
    throw Error(`browser: ${stage} failed; verify confirmed executable, isolated profile and required capability locally; no run started`);
  } finally {
    try { if (browser) await browser.close(); }
    finally { await rm(scratch, {recursive: true, force: true}); }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(error => {
    // Avoid emitting executable/profile paths or credentials in shareable logs.
    const known = /^(arguments|runtime|preview|runner|wasm|video|screenshot|browser):/.test(error.message);
    console.error('PREFLIGHT FAILED:', known ? error.message : 'dependency/browser capability failed; inspect local tool diagnostics and execution-preflight.md; no run started');
    process.exitCode = 1;
  });
}

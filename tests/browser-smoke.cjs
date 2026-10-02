// Run after npm run build. Uses the production /goblin/ path, not Vite dev mode.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

async function main() {
  const root = path.resolve('dist');
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://local').pathname;
    const relative = pathname.replace(/^\/goblin\//, '');
    const file = path.resolve(root, relative || 'index.html');
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end(); return;
    }
    const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' };
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = process.env.GOBLIN_TEST_URL || `http://127.0.0.1:${server.address().port}/goblin/?debug`;
  let browser;
  try {
  browser = await chromium.launch({
    executablePath: process.env.GOBLIN_CHROMIUM_EXECUTABLE || undefined,
    args: process.env.GOBLIN_SOFTWARE_BROWSER ? ['--no-sandbox', '--no-zygote', '--single-process', '--in-process-gpu', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [],
  });
  const errors = [], warnings = [], failedResponses = [];
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const desktop = await context.newPage();
  const mobileContext = await browser.newContext({ viewport: { width: 744, height: 360 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const mobile = await mobileContext.newPage();
  for (const page of [desktop, mobile]) {
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); if (msg.type() === 'warning') warnings.push(msg.text()); });
    page.on('response', response => { if (response.status() >= 400) failedResponses.push(response.url()); });
  }
  const snapshot = page => page.evaluate(() => window.goblinDiagnostics());
  const point = async page => (await snapshot(page)).parts.find(part => part.id === 'head').screen;
    await Promise.all([desktop.goto(url), mobile.goto(url)]);
    await Promise.all([desktop.waitForFunction(() => window.goblinDiagnostics), mobile.waitForFunction(() => window.goblinDiagnostics)]);
    await mobile.locator('#startBtn').tap();
    await mobile.locator('#resetBtn').tap();
    const idleMs = Number(process.env.GOBLIN_IDLE_MS || 60050);
    console.log(`Checking ${idleMs / 1000} seconds before start and after reset (parallel desktop/mobile)...`);
    await Promise.all([desktop.waitForTimeout(idleMs), mobile.waitForTimeout(idleMs)]);
    for (const page of [desktop, mobile]) {
      const state = await snapshot(page);
      assert.equal(state.score, 0);
      assert.equal(state.time, 60);
      assert.equal(await page.locator('#objectives input:checked').count(), 0);
    }
    await desktop.locator('#startBtn').click();
    await desktop.locator('#resetBtn').click();
    const head = await point(desktop);
    await desktop.mouse.move(head.x, head.y); await desktop.mouse.down();
    assert.equal((await snapshot(desktop)).grabbed, true, 'mouse picks head');
    await desktop.evaluate(() => document.querySelector('canvas').dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 })));
    assert.equal((await snapshot(desktop)).grabbed, false);
    await desktop.mouse.up();
    const touchHead = await point(mobile);
    await mobile.touchscreen.tap(touchHead.x, touchHead.y);
    assert.ok((await snapshot(mobile)).score > 0, 'touch action scores');
    await desktop.locator('#helpBtn').click();
    const paused = await snapshot(desktop);
    await desktop.waitForTimeout(1100);
    assert.equal((await snapshot(desktop)).time, paused.time);
    assert.equal((await snapshot(desktop)).paused, true);
    await desktop.locator('#closeHelp').click();
    await desktop.evaluate(() => window.dispatchEvent(new Event('blur')));
    assert.equal((await snapshot(desktop)).paused, true);
    await desktop.evaluate(() => window.dispatchEvent(new Event('focus')));
    assert.equal((await snapshot(desktop)).paused, false);
    await desktop.locator('[data-tool="ball"]').click();
    for (let i = 0; i < 30; i++) {
      const target = await point(desktop);
      await desktop.mouse.click(target.x, target.y);
    }
    const spawned = await snapshot(desktop);
    assert.ok(spawned.projectiles > 0);
    assert.ok(spawned.projectiles <= 24);
    assert.ok(spawned.bodies <= 46);
    await desktop.locator('#resetBtn').click();
    const clean = await snapshot(desktop);
    assert.equal(clean.projectiles, 0); assert.equal(clean.bodies, 22); assert.equal(clean.joints, 10);
    for (let i = 0; i < 20; i++) await desktop.locator('#resetBtn').click();
    const reset = await snapshot(desktop);
    assert.equal(reset.bodies, clean.bodies); assert.equal(reset.joints, clean.joints);
    assert.equal(reset.score, 0); assert.equal(reset.grabbed, false);
    await mobile.setViewportSize({ width: 360, height: 744 });
    await mobile.setViewportSize({ width: 744, height: 360 });
    const layout = await mobile.evaluate(() => {
      const canvas = document.querySelector('canvas').getBoundingClientRect();
      const bar = document.querySelector('#toolbar').getBoundingClientRect();
      const reset = document.querySelector('#actions').getBoundingClientRect();
      return { canvas: { width: canvas.width, height: canvas.height }, viewport: { width: innerWidth, height: innerHeight }, overlap: !(reset.right <= bar.left || reset.bottom <= bar.top || reset.left >= bar.right || reset.top >= bar.bottom) };
    });
    assert.equal(layout.canvas.width, layout.viewport.width); assert.equal(layout.canvas.height, layout.viewport.height);
    assert.equal(layout.overlap, false);
    assert.equal((await snapshot(mobile)).dpr, 1.5);
    const samples = await desktop.evaluate(() => new Promise(resolve => {
      const samples = []; let previous;
      function sample(now) {
        if (previous !== undefined) samples.push({ delta: now - previous, ...window.goblinDiagnostics() });
        previous = now;
        if (samples.length >= 120) resolve(samples); else requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    }));
    const sorted = samples.map(s => s.delta).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)], p95 = sorted[Math.floor(sorted.length * .95)];
    assert.deepEqual(errors, []); assert.deepEqual(failedResponses, []);
    await desktop.screenshot({ path: process.env.GOBLIN_DESKTOP_SCREENSHOT || '/tmp/goblin-g0-desktop.png' });
    await mobile.screenshot({ path: process.env.GOBLIN_MOBILE_SCREENSHOT || '/tmp/goblin-g0-mobile.png' });
    console.log(JSON.stringify({ browser: browser.version(), url, checks: 'PASS', reset, mobile: await snapshot(mobile), layout, medianFrameMs: median, p95FrameMs: p95, maxPhysicsMs: Math.max(...samples.map(s => s.physicsMs)), warnings: [...new Set(warnings)], errors, failedResponses }, null, 2));
  } finally {
    await browser?.close(); server.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

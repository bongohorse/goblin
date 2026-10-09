import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {waitForStep, requireEventPreconditions, checkPreview} from '../scripts/execution-checks.mjs';

test('wait callback executes with forwarded target before Start; invalid inputs never reach page', async () => {
  let calls = 0;
  const page = {waitForFunction: async (fn, arg, options) => {
    calls++; assert.equal(options.timeout, 30000); return fn(arg);
  }};
  assert.equal(await waitForStep(page, 12, () => 12), true);
  assert.equal(await waitForStep(page, 13, () => 12), false);
  for (const step of [NaN, -1, 1.5, '12']) await assert.rejects(waitForStep(page, step, () => 12), /step:/);
  await assert.rejects(waitForStep(page, 0, null), /readSteps:/);
  await assert.rejects(waitForStep(page, 0, () => NaN), /observer:/);
  assert.equal(calls, 3);
});

test('late/falling strong hit and inactive-target interruption are rejected without input', () => {
  const policy = {step: 180, upright: true, activeTarget: true};
  const ready = {step: 180, invalid: false, upright: true, activeTarget: true};
  requireEventPreconditions('strong', ready, policy);
  assert.throws(() => requireEventPreconditions('strong', {...ready, step: 237}, policy), /missed planned step/);
  assert.throws(() => requireEventPreconditions('strong', {...ready, upright: false}, policy), /upright/);
  assert.throws(() => requireEventPreconditions('strong', {...ready, activeTarget: false}, policy), /active target/);
  assert.throws(() => requireEventPreconditions('strong', {...ready, invalid: undefined}, policy), /safety/);
});

test('preview rejects reachable wrong HTML/assets, SPA fallback, HTTP errors and unavailable server', async () => {
  const dist = await mkdtemp(join(tmpdir(), 'goblin-preview-test-'));
  const html = '<script type="module" src="./assets/game.js"></script>';
  let mode = 'good';
  const server = createServer((req, res) => {
    if (mode === '404') return res.writeHead(404).end();
    res.end(req.url.endsWith('game.js') ? (mode === 'asset' ? 'old' : mode === 'fallback' ? html : 'export{}') : mode === 'html' ? 'old' : html);
  });
  try {
    await mkdir(join(dist, 'assets')); await writeFile(join(dist, 'index.html'), html);
    await writeFile(join(dist, 'assets/game.js'), 'export{}');
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const options = {url: `http://127.0.0.1:${server.address().port}/goblin/`, dist, entry: 'index.html'};
    assert.deepEqual(await checkPreview(options), {entry: 'index.html', matchedAssets: 1});
    for (mode of ['html', 'asset', 'fallback']) await assert.rejects(checkPreview(options), /build bytes differ/);
    mode = '404'; await assert.rejects(checkPreview(options), /HTTP 404/);
    await new Promise(resolve => server.close(resolve));
    await assert.rejects(checkPreview(options), /unreachable/);
    await assert.rejects(checkPreview({...options, entry: '../outside.html'}));
  } finally {
    if (server.listening) await new Promise(resolve => server.close(resolve));
    await rm(dist, {recursive: true, force: true});
  }
});

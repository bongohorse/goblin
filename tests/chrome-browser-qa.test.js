import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {prepareBrowserQa} = require('../scripts/chrome-browser-qa.cjs');
const portable = path.resolve('test-only-Chrome-Beta-x64', 'chrome.exe');

test('historical browser fixtures are reached only with an explicit verified portable executable', () => {
  const source = {GOBLIN_CHROMIUM_EXECUTABLE: 'legacy', GOBLIN_SOFTWARE_BROWSER: '1',
    GOBLIN_HEADED_BROWSER: '0', CUSTOM: 'kept'};
  for (const [kind, expected] of [['game', 'browser-smoke.cjs'], ['standing', 'standing-browser.cjs']]) {
    const {script, env} = prepareBrowserQa(kind, source, () => ({executablePath: portable}));
    assert.equal(path.basename(script), expected);
    assert.equal(env.GOBLIN_CHROMIUM_EXECUTABLE, portable);
    assert.equal(env.GOBLIN_HEADED_BROWSER, '1');
    assert.equal(env.CUSTOM, 'kept');
    assert.equal(Object.hasOwn(env, 'GOBLIN_SOFTWARE_BROWSER'), false);
  }
  assert.equal(source.GOBLIN_CHROMIUM_EXECUTABLE, 'legacy');
  assert.equal(source.GOBLIN_SOFTWARE_BROWSER, '1');
});

test('browser QA fails closed on wrong mode, missing config or nonabsolute identity', () => {
  assert.throws(() => prepareBrowserQa('wrong', {}, () => ({executablePath: portable})), /Unknown browser QA mode/);
  assert.throws(() => prepareBrowserQa('game', {}, () => { throw Error('Missing portable config'); }), /Missing portable config/);
  assert.throws(() => prepareBrowserQa('standing', {}, () => ({executablePath: 'chrome.exe'})), /absolute executable path/);
});

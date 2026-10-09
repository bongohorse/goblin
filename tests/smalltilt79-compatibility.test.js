import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {assertCurrentCompatibility, readHistoricalInput} from '../scripts/smalltilt79-historical-inputs.mjs';
const ROOT = 'docs/research/standing-lab/smalltilt79/';
const ledger = JSON.parse(fs.readFileSync(ROOT + 'build-inputs.json'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const changedRead = (path, change) => name => {
  const bytes = fs.readFileSync(name);
  return name === path ? Buffer.from(change(bytes.toString())) : bytes;
};

test('79 accepts exact reviewed feedback while historical UI retains original ledger identity', () => {
  assert.equal(assertCurrentCompatibility().compatible_source_boundary, true);
  for (const path of ['index.html', 'src/main.js', 'src/rig-debug.js', 'src/style.css', 'tests/browser-smoke.cjs', 'labs/standing/index.html', 'src/labs/standing/browser.js', 'src/labs/standing/style.css']) {
    const historical = readHistoricalInput(path);
    assert.equal(hash(historical), ledger.files.find(input => input.path === path).sha256);
    assert.notEqual(hash(fs.readFileSync(path)), hash(historical));
  }
});

test('79 rejects any unreviewed browser/helper/HTML/CSS edit, including UI physics injection', () => {
  const changes = [
    ['index.html', text => text.replace('</body>', '<script>window.standingLab.destroy()</script></body>')],
    ...['src/main.js', 'src/rig-debug.js', 'src/style.css', 'tests/browser-smoke.cjs'].map(path => [path, text => text + '\nunreviewed change\n']),
    ['src/labs/standing/browser.js', text => text.replace('await initRapier();', 'await initRapier(); RAPIER.init();')],
    ['src/labs/standing/browser.js', text => text.replace('sim.step();', 'sim.step();sim.step();')],
    ['src/labs/standing/feedback.js', text => text.replace('pause();', 'pause(); sim.world.step();')],
    ['labs/standing/index.html', text => text.replace('</body>', '<script>window.standingLab.destroy()</script></body>')],
    ['src/labs/standing/style.css', text => text + '\n#view { display:none }\n']
  ];
  for (const [path, change] of changes) {
    const read = changedRead(path, change);
    assert.notDeepEqual(read(path), fs.readFileSync(path), 'mutation must take effect');
    assert.throws(() => assertCurrentCompatibility(read), /outside reviewed feedback boundary/);
    assert.throws(() => readHistoricalInput('src/labs/standing/browser.js', read), /outside reviewed feedback boundary/);
  }
});

test('79 rejects core physics, initialization, clock, measurement and export source changes', () => {
  const changes = [
    ['src/labs/standing/simulation.js', 'new RAPIER.World(this.config.gravity)', 'new RAPIER.World({x:0,y:0,z:0})'],
    ['src/labs/standing/simulation.js', 'observed_time:this.time', 'observed_time:this.time*2'],
    ['src/labs/standing/config.js', 'result.fixed_dt!==rig.fixed_dt', 'false'],
    ['src/labs/standing/clock.js', 'tick();', 'tick();tick();'],
    ['src/labs/standing/measurement.js', 'if(distance>0)continue;', 'if(distance>1)continue;'],
    ['src/labs/standing/motors.js', 'stiffness:100', 'stiffness:200'],
    ['scripts/smalltilt79-runner.mjs', 'f.world.step();', 'f.world.step();f.world.step();']
  ];
  for (const [path, before, after] of changes) {
    const read = changedRead(path, text => text.replace(before, after));
    assert.notDeepEqual(read(path), fs.readFileSync(path), 'mutation must take effect');
    assert.throws(() => assertCurrentCompatibility(read), error => error.message.includes(path + ' current source differs'));
    assert.throws(() => readHistoricalInput('src/labs/standing/browser.js', read), error => error.message.includes(path + ' current source differs'));
  }
});

test('79 rejects archived UI corruption independently of accepted current feedback', () => {
  for (const path of ['index.html', 'labs/standing/index.html', 'src/labs/standing/browser.js', 'src/labs/standing/style.css']) {
    const read = changedRead(ROOT + 'frozen-inputs/' + path, text => text + '\ncorrupt\n');
    assert.equal(assertCurrentCompatibility(read).compatible_source_boundary, true);
    assert.throws(() => readHistoricalInput(path, read), /historical source changed/);
  }
});

test('79 historical package snapshots do not hide current Rapier dependency/lock changes', () => {
  for (const path of ['package.json', 'package-lock.json']) {
    const read = changedRead(path, text => {
      const json = JSON.parse(text);
      if (path === 'package.json') json.dependencies['@dimforge/rapier3d-compat'] = '^0.22.0';
      else json.packages['node_modules/@dimforge/rapier3d-compat'].integrity = 'changed';
      return JSON.stringify(json);
    });
    assert.throws(() => assertCurrentCompatibility(read), /current Rapier .* differs/);
  }
});

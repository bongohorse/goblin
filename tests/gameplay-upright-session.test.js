import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import R from '@dimforge/rapier3d-compat';
import {UprightSlice} from '../src/gameplay/upright-assist.js';
import {CONFIG_B,UprightSession} from '../src/gameplay/upright-session.js';

await R.init();
test('browser B equals archived candidate; controller and historical evidence stay frozen',()=>{
  const evidence=JSON.parse(fs.readFileSync(new URL('../docs/development/gameplay-upright-evidence.json',import.meta.url)));
  assert.deepEqual(CONFIG_B,evidence.configs.find(c=>c.id==='B'));
  const hash=createHash('sha256').update(fs.readFileSync(new URL('../src/gameplay/upright-assist.js',import.meta.url))).digest('hex');
  assert.equal(hash,evidence.provenance.reviewed_controller_sha256);
});
test('scene recorder forwards native commands; pause and reset remain step-free',()=>{
  const sim=new UprightSlice({config:CONFIG_B}),session=new UprightSession(sim);
  try{
    assert.equal(session.paused,true);
    assert.equal(session.audit.ledger.size,22);
    const bind=sim.snapshot().parts;
    sim.preStep(); // Native commands only, no world.step / behavioral trial.
    assert.equal([...session.audit.ledger.values()].filter(c=>c.cap===20&&c.stiffness===40&&c.damping===2).length,22);
    session.pause();
    assert.ok([...session.audit.ledger.values()].every(c=>c.cap===0&&c.stiffness===0&&c.damping===0));
    assert.ok(session.events.filter(e=>e.kind==='interrupt').every(e=>e.motionUnchanged));
    session.resume();session.push(false,true);assert.equal(session.pending,false);
    session.pause();assert.equal(session.pending,null);
    session.lastRun={old:true};session.reset({assisted:false,obstacle:true});
    assert.equal(session.lastRun,null);assert.equal(session.paused,true);assert.equal(sim.enabled,false);
    assert.deepEqual(sim.snapshot().parts,bind);
    assert.equal(sim.steps,0);assert.equal(session.trace.length,1);
    let stepCalls=0;const old=sim.step;sim.step=()=>{stepCalls++;};
    session.tick(20);session.tick(40);assert.equal(stepCalls,0,'paused clock cannot step');
    sim.step=old;
  }finally{session.dispose();}
});

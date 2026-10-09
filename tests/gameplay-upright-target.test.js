import test from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {UprightSlice,targetAtStep,TARGET_REACTION} from '../src/gameplay/upright-assist.js';
import {CONFIG_B,UprightSession} from '../src/gameplay/upright-session.js';
await R.init();
// Native command checks with synthetic counters; never world.step.
test('T1 fixed bounded directional target and smooth step-timed return',()=>{
  assert.deepEqual(TARGET_REACTION,{id:'T1',angle:Math.PI/30,rise:6,hold:12,restore:42});
  for(let step=-1;step<=120;step++){
    const t=targetAtStep(step);assert.ok(t.angle>=0&&t.angle<=Math.PI/30);
    assert.ok(t.up.x>=0);assert.equal(t.up.z,0);assert.ok(Math.abs(Math.hypot(t.up.x,t.up.y)-1)<1e-12);
    if(step>=60||step<0)assert.deepEqual(t.up,{x:0,y:1,z:0});
  }
  assert.equal(targetAtStep(0).angle,0);assert.equal(targetAtStep(6).angle,Math.PI/30);
  assert.equal(targetAtStep(18).angle,Math.PI/30);assert.equal(targetAtStep(60).angle,0);
  assert.equal(targetAtStep(18).phase,'RETURN');
  assert.ok(targetAtStep(3).angle<targetAtStep(4).angle);assert.ok(targetAtStep(30).angle>targetAtStep(40).angle);
});
test('T1 changes only bounded world torque direction; B commands and relative targets retained',()=>{
  assert.throws(()=>new UprightSlice({reaction:'T2'}),/Invalid target reaction/);
  assert.throws(()=>new UprightSlice({reaction:'T1',yieldProfile:'Y1'}),/Invalid target reaction/);
  const b=new UprightSlice({config:CONFIG_B}),t=new UprightSlice({config:CONFIG_B,reaction:'T1'});
  try{
    b.preStep();t.preStep();assert.deepEqual(t.commands,b.commands);
    const targets=t.entries.map(e=>structuredClone(e.target));
    for(const sim of [b,t]){sim.steps=120;sim.state='ASSISTED_READY';sim.push(false);}
    t.steps=b.steps=126;
    for(const sim of [b,t])for(const {body} of sim.rig.byId.values())body.setAngvel({x:0,y:0,z:0},false);
    const pose=t.snapshot().parts;t.preStep();b.preStep();
    assert.deepEqual(t.snapshot().parts.map(p=>[p.position,p.rotation,p.velocity,p.angularVelocity]),pose.map(p=>[p.position,p.rotation,p.velocity,p.angularVelocity]));
    assert.equal(t.commands.support,b.commands.support);assert.equal(t.commands.motorCap,b.commands.motorCap);
    assert.deepEqual(t.entries.map(e=>e.target),targets);assert.deepEqual(t.config,CONFIG_B);
    assert.ok(t.commands.torques.torso.z<0);assert.ok(t.commands.torques.pelvis.z<0);
    for(const torque of Object.values(t.commands.torques))assert.ok(Math.hypot(...Object.values(torque))<=20);
    t.push(false);assert.equal(t.targetStart,120,'cannot extend active window');
    for(const {body} of t.rig.byId.values())body.setAngvel({x:0,y:0,z:0},false);
    t.steps=180;t.preStep();assert.deepEqual(t.commands,b.commands,'neutral target at exact deadline');
  }finally{b.dispose();t.dispose();}
});
test('T1 interruption, strong hit, grab/release and paused reset cannot restore stale target',()=>{
  const sim=new UprightSlice({config:CONFIG_B,reaction:'T1'}),session=new UprightSession(sim);
  const ready=()=>{session.reset({assisted:true,obstacle:false});sim.steps=120;sim.state='ASSISTED_READY';sim.push(false);sim.steps=126;};
  try{
    for(const reason of ['manual-assist-off','balance-lost','unsupported','obstacle','pause','safety']){
      ready();sim.preStep();sim.interrupt(reason);sim.steps=150;sim.push(false);sim.preStep();
      assert.equal(sim.targetStart,null);assert.equal(sim.targetAssist().phase,'OFF');assert.equal(sim.commands.support,0);assert.equal(sim.motorEnabled,false);
      for(const p of sim.snapshot().parts)assert.deepEqual([p.force.x,p.force.y,p.force.z,p.torque.x,p.torque.y,p.torque.z],[0,0,0,0,0,0]);
      assert.ok([...session.audit.ledger.values()].every(c=>c.cap===0&&c.stiffness===0&&c.damping===0));
    }
    ready();sim.push(true);assert.equal(sim.targetStart,null);assert.equal(sim.enabled,false);
    ready();const hand=sim.rig.byId.get('handL').body;assert.ok(sim.beginGrab(hand,hand.translation(),0));sim.grab.release(.1);
    sim.steps=150;sim.preStep();assert.equal(sim.targetStart,null);assert.equal(sim.enabled,false);
    ready();session.pause();session.resume();sim.steps=150;sim.preStep();assert.equal(sim.targetAssist().phase,'OFF');
    session.reset({assisted:true,obstacle:false});const bind=sim.snapshot().parts;
    assert.equal(sim.targetStart,null);assert.equal(sim.targetAssist().phase,'NEUTRAL');assert.equal(session.paused,true);assert.equal(session.pending,null);
    assert.deepEqual(sim.snapshot().counts,{bodies:15,colliders:17,joints:14});
    ready();session.reset({assisted:true,obstacle:false});assert.deepEqual(sim.snapshot().parts,bind);
  }finally{session.dispose();}
});

import {createRequire} from 'node:module';
const {waitForStep}=createRequire(import.meta.url)('./gameplay-upright-browser.cjs');
test('native runner forwards exact step argument without launching or stepping',async()=>{
  const original=globalThis.uprightDiagnostics;let observed=0;
  globalThis.uprightDiagnostics=()=>({final:{steps:observed,invalid:null}});
  try{
    const calls=[];const page={waitForFunction:async(fn,arg,options)=>{
      calls.push({arg,options});assert.equal(fn(arg),null);observed=arg;assert.equal(fn(arg),true);return 'ready';
    }};
    assert.equal(await waitForStep(page,360),'ready');assert.deepEqual(calls,[{arg:360,options:{timeout:30000}}]);
  }finally{if(original===undefined)delete globalThis.uprightDiagnostics;else globalThis.uprightDiagnostics=original;}
});

import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {comparePair} from '../src/gameplay/upright-comparison.js';
test('stored five-run finish keeps frozen sources, complete pairs and historical error in total budget',()=>{
  const data=JSON.parse(gunzipSync(fs.readFileSync(new URL('../docs/development/gameplay-upright-target-finish-evidence.json.gz',import.meta.url))));
  const error=JSON.parse(fs.readFileSync(new URL('../docs/development/gameplay-upright-target-evidence.json',import.meta.url)));
  assert.equal(error.budget.started,1);assert.equal(error.budget.completed,0);
  assert.equal(data.records.length,5);assert.equal(data.budget.started,6);assert.equal(data.budget.newStarted,5);assert.equal(data.budget.priorStarted,1);
  assert.equal(data.records[4].role,'safety');assert.equal(data.records[4].trace.length,361);
  for(let i=0;i<4;i+=2){const p=comparePair(data.records[i],data.records[i+1]);assert.equal(p.Q.valid,true);assert.equal(p.S.inputSafe,true);assert.equal(p.S.returnEnvelopeAtTwoSeconds,true);}
  for(const [file,hash] of Object.entries(data.records[0].identity.sources))assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),hash,'frozen observed physics source');
  const b=data.records[1],target=data.records[3];assert.equal(comparePair(data.records[0],b).Q.legacyV1.pass,false);
  assert.ok(data.records[0].trace.every((r,i)=>JSON.stringify(r.observation.bodies)===JSON.stringify(data.records[2].trace[i].observation.bodies)));
  assert.equal(target.trace[180].targetAssist.phase,'NEUTRAL');assert.ok(target.trace.slice(180).every(r=>r.targetAssist.angle===0));
  const safety=data.records[4],grab=safety.events.find(e=>e.kind==='interrupt'&&e.reason==='grab');assert.equal(grab.step,153);
  assert.ok(grab.nativeMotorCommands.every(c=>c.cap===0&&c.stiffness===0&&c.damping===0));
  assert.ok(safety.trace.slice(grab.step+1).every(r=>!r.assisted&&r.maxWorldForce===0&&r.maxWorldTorque===0&&r.activeMotorAxes===0&&r.observation.controller.targetStart===null));
  assert.deepEqual(safety.reset.parts.map(p=>[p.position,p.rotation,p.velocity,p.angularVelocity]),safety.initial.parts.map(p=>[p.position,p.rotation,p.velocity,p.angularVelocity]));
  assert.equal(data.pairs.find(p=>p.pairId==='T1').H.answers[2],'unklar','no implicit complete gameplay acceptance');
});

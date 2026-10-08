import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import R from '@dimforge/rapier3d-compat';
import {ASSIST_CONFIG, LIMITS, UprightSlice} from '../src/gameplay/upright-assist.js';

await R.init();
const poses=sim=>sim.snapshot().parts.map(({position,rotation,velocity,angularVelocity})=>({position,rotation,velocity,angularVelocity}));
const length=v=>Math.hypot(v.x,v.y,v.z);

// API/state checks only: no world.step(), extra behavioral experiments or Standing run.
test('arena bind, command caps, interruption and reset without stepping a world',()=>{
  const sim=new UprightSlice();
  try {
    assert.equal(R.version(),'0.21.0');
    assert.ok(Math.abs(sim.entries.find(e=>e.spec.id==='shoulderL').target.z)>.27,'actual angled arena bind, not identity');
    assert.deepEqual(sim.snapshot().counts,{bodies:15,colliders:17,joints:14});
    const initial=poses(sim);
    // Artificial API fixture, never stepped: exercise clamping rather than a trajectory.
    const pelvis=sim.rig.byId.get('pelvis').body;
    pelvis.setTranslation({x:0,y:-10,z:0},true);
    pelvis.setRotation({x:0,y:0,z:Math.sin(.6),w:Math.cos(.6)},true);
    sim.preStep();
    assert.ok(Math.abs(sim.commands.support-LIMITS.supportWeight*sim.mass*9.81)<1e-6);
    for(const torque of Object.values(sim.commands.torques))assert.ok(length(torque)<=20+1e-6);
    assert.equal(sim.commands.motorCap,20);
    const before=poses(sim),calls=[];
    for(const e of sim.entries){
      const nativeCap=e.joint.setMotorMaxForce.bind(e.joint),nativeMotor=e.joint.configureMotor.bind(e.joint);
      e.joint.setMotorMaxForce=(...args)=>{calls.push(['cap',e.spec.id,args]);nativeCap(...args);};
      e.joint.configureMotor=(...args)=>{calls.push(['motor',e.spec.id,args]);nativeMotor(...args);};
    }
    sim.interrupt('test-hit');
    assert.deepEqual(poses(sim),before,'interrupt does not write pose or velocities');
    assert.equal(sim.enabled,false);assert.equal(sim.motorEnabled,false);assert.equal(sim.commands.support,0);
    assert.equal(calls.filter(([kind])=>kind==='cap').length,22,'ten hinges plus four spherical joints × three axes');
    for(const [kind,,args] of calls) {
      if(kind==='cap')assert.equal(args.at(-1),0);
      else assert.deepEqual(args.slice(-3),[0,0,0],'target velocity, stiffness and damping are zero');
    }
    for(const p of sim.snapshot().parts){assert.equal(length(p.force),0);assert.equal(length(p.torque),0);}
    sim.reset();assert.deepEqual(poses(sim),initial);assert.equal(sim.steps,0);assert.equal(sim.lastHit,null);
    const head=sim.rig.byId.get('head').body;
    assert.equal(sim.beginGrab(head,head.translation(),0),true);assert.equal(sim.enabled,false);
    assert.deepEqual(sim.snapshot().counts,{bodies:16,colliders:17,joints:15});
    sim.reset();assert.equal(sim.grab.active,false);assert.equal(head.additionalSolverIterations(),0);
    assert.deepEqual(sim.snapshot().counts,{bodies:15,colliders:17,joints:14});assert.deepEqual(poses(sim),initial);
    sim.interrupt('pause');assert.equal(sim.reason,'pause');assert.equal(sim.enabled,false);
  } finally {sim.dispose();}
});

test('invalid gains fail before creating a world; diagnostic budget and negative results stay explicit',()=>{
  assert.throws(()=>new UprightSlice({config:{...ASSIST_CONFIG,stiffness:101}}),/Invalid gameplay assist config/);
  const evidence=JSON.parse(fs.readFileSync(new URL('../docs/development/gameplay-upright-evidence.json',import.meta.url)));
  assert.equal(evidence.configs.length,3);assert.equal(evidence.diagnostics.length,5);
  assert.ok(evidence.diagnostics.length<=evidence.diagnosticBudget);
  assert.ok(evidence.diagnostics.every(d=>d.status==='complete'));
  const b=evidence.diagnostics.find(d=>d.config.id==='B');
  assert.ok(b.result.afterPeak-b.result.preHit<2*Math.PI/180);
  const c=evidence.diagnostics.find(d=>d.config.id==='C');
  assert.equal(c.result.final.state,'DOWN');assert.equal(c.result.firstFloor,3);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {UprightSlice,YIELD_PROFILES} from '../src/gameplay/upright-assist.js';
import {CONFIG_B,UprightSession} from '../src/gameplay/upright-session.js';
await R.init();
// Real API command checks; synthetic simulation-step counter, never world.step.
const ready=sim=>{sim.steps=120;sim.state='ASSISTED_READY';sim.push(false);};
test('fixed step profiles reduce only bounded Up torque, restore and never extend an active window',()=>{
  assert.deepEqual(YIELD_PROFILES,{B:{hold:0,restore:0},Y1:{hold:12,restore:18},Y2:{hold:24,restore:24}});
  assert.throws(()=>new UprightSlice({yieldProfile:'Y3'}),/Invalid yield profile/);
  for(const profile of ['B','Y1','Y2']){
    const sim=new UprightSlice({config:CONFIG_B,yieldProfile:profile});
    try{
      const pelvis=sim.rig.byId.get('pelvis').body;
      pelvis.setRotation({x:0,y:0,z:Math.sin(.1),w:Math.cos(.1)},true);
      sim.preStep();const full=structuredClone(sim.commands);
      ready(sim);const start=sim.yieldStart,{hold,restore}=YIELD_PROFILES[profile];
      for(const {body} of sim.rig.byId.values())body.setAngvel({x:0,y:0,z:0},false);
      sim.preStep();assert.equal(sim.commands.support,full.support);
      assert.equal(sim.commands.motorCap,full.motorCap);
      assert.deepEqual(sim.config,CONFIG_B);
      for(let elapsed=0;elapsed<=hold+restore;elapsed++){
        sim.steps=120+elapsed;
        const expected=profile==='B'?1:elapsed<hold?0:Math.min(1,(elapsed-hold)/restore);
        assert.equal(sim.upAssist().factor,expected);
        // Keep the command-only fixture fixed: push changes angular velocity even without stepping.
        for(const {body} of sim.rig.byId.values())body.setAngvel({x:0,y:0,z:0},false);
        sim.preStep();assert.equal(sim.commands.upFactor,expected);
        for(const id of ['pelvis','torso'])for(const axis of ['x','y','z'])
          assert.equal(sim.commands.torques[id][axis],full.torques[id][axis]*expected);
        if(elapsed===1){sim.push(false);assert.equal(sim.yieldStart,start,'second impulse does not extend window');}
      }
      assert.equal(sim.upAssist().phase,'FULL');
    }finally{sim.dispose();}
  }
});
test('all interruptions discard restoration; small input in OFF/DOWN cannot enable assistance',()=>{
  const sim=new UprightSlice({config:CONFIG_B,yieldProfile:'Y2'});
  try{
    for(const reason of ['manual-assist-off','balance-lost','unsupported','obstacle','pause','safety']){
      sim.reset();ready(sim);sim.steps=145;
      sim.interrupt(reason);sim.steps=300;sim.state='DOWN';sim.push(false);sim.preStep();
      assert.equal(sim.yieldStart,null);assert.equal(sim.enabled,false);
      assert.equal(sim.upAssist().phase,'OFF');assert.equal(sim.motorEnabled,false);
      assert.equal(sim.commands.support,0);assert.equal(sim.commands.upFactor,0);
      for(const p of sim.snapshot().parts)assert.deepEqual([p.force.x,p.force.y,p.force.z,p.torque.x,p.torque.y,p.torque.z],[0,0,0,0,0,0]);
    }
    sim.reset();ready(sim);sim.push(true);assert.equal(sim.yieldStart,null);assert.equal(sim.enabled,false);
    sim.reset();ready(sim);const hand=sim.rig.byId.get('handL').body;
    assert.ok(sim.beginGrab(hand,hand.translation(),0));assert.equal(sim.yieldStart,null);
    sim.grab.release(.1);sim.steps=300;sim.preStep();assert.equal(sim.enabled,false);
  }finally{sim.dispose();}
});
test('pause/reset remove old yield and inputs; resume cannot restore disabled assist',()=>{
  const sim=new UprightSlice({config:CONFIG_B,yieldProfile:'Y1'}),session=new UprightSession(sim);
  try{
    const bind=sim.snapshot().parts;session.resume();ready(sim);session.pause();
    const step=sim.steps;session.tick(100);session.tick(200);assert.equal(sim.steps,step);
    session.resume();sim.steps=300;sim.preStep();assert.equal(sim.upAssist().phase,'OFF');
    session.reset({assisted:true,obstacle:false});assert.equal(sim.yieldStart,null);
    assert.equal(sim.upAssist().phase,'FULL');assert.equal(session.paused,true);
    assert.equal(session.pending,null);assert.deepEqual(sim.snapshot().parts,bind);
    assert.deepEqual(sim.snapshot().counts,{bodies:15,colliders:17,joints:14});
    session.reset({assisted:false});assert.equal(sim.upAssist().phase,'OFF');
  }finally{session.dispose();}
});

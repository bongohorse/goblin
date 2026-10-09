import test from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {createUprightRun} from '../src/gameplay/upright-run.js';
import {variantOptions} from '../src/gameplay/upright-variants.js';
await R.init();
const free=(extra={})=>createUprightRun(variantOptions('R1'),{record:false,audit:false,runPolicy:{mode:'free'},...extra});

test('free native run passes 10 and 60 seconds without recording; safety remains effective',()=>{
  const {sim,session}=free({audit:true});
  try{
    session.resume();session.tick(0);
    for(let i=1;i<=3661;i++)session.tick(i/60);
    assert.equal(sim.steps,3661);assert.equal(sim.invalid,null);assert.equal(session.paused,false);
    assert.equal(sim.world.timestep,Math.fround(1/60));assert.equal(session.trace.length,0);assert.equal(session.events.length,0);
    assert.equal(session.lastRun,null);assert.equal(session.report().windowLimit,null);
    sim.rig.byId.get('torso').body.setLinvel({x:NaN,y:0,z:0},false);
    sim.invalid=sim.safety();assert.equal(sim.invalid,'nonfinite:torso');session.observePause();
    assert.equal(session.pauseContext.kind,'safety');assert.equal(sim.enabled,false);
    session.resume();assert.equal(session.paused,true);assert.equal(session.singleStep(),false);
  }finally{session.dispose();}
});
test('optional timer observes once, preserves pending/state, and permits step/resume beyond expiry',()=>{
  const {sim,session}=free({runPolicy:{mode:'free',timerSteps:30}});
  try{
    session.resume();session.push(false,true);session.tick(0);
    for(let i=1;i<=30;i++)session.tick(i/60);
    assert.equal(sim.steps,30);assert.equal(session.pauseContext.reason,'timer-end');
    assert.equal(session.pauseContext.kind,'observation');assert.equal(sim.enabled,true);assert.equal(session.pending,false);
    const before=sim.snapshot();session.tick(1000);assert.deepEqual(sim.snapshot(),before);
    assert.equal(session.singleStep(),true);assert.equal(sim.steps,31);assert.equal(session.paused,true);
    session.resume();session.tick(2000);session.tick(2000+1/60);assert.equal(sim.steps,32);assert.equal(session.paused,false);
    sim.interrupt('manual-assist-off');session.observePause();session.singleStep();session.resume();
    assert.equal(sim.enabled,false);
  }finally{session.dispose();}
});
test('timer during a grip uses explicit safety cancellation without reactivating assistance',()=>{
  const {sim,session}=free({runPolicy:{mode:'free',timerSteps:1}});
  try{
    const body=sim.rig.byId.get('handL').body;session.resume();sim.beginGrab(body,{...body.translation()},0);
    session.advanceStep();assert.equal(session.pauseContext.reason,'timer-end-active-grab');
    assert.equal(session.pauseContext.kind,'safety');assert.equal(sim.grab.active,false);
    session.singleStep();session.resume();assert.equal(sim.enabled,false);
  }finally{session.dispose();}
});
test('slow motion maps wall time to fixed native steps, with no pause/speed catch-up',()=>{
  for(const speed of [.25,.5,1]){
    const {sim,session}=free({speed});
    try{
      session.resume();session.tick(0);
      for(let i=1;i<=120;i++)session.tick(i/60);
      assert.equal(sim.steps,120*speed);assert.equal(sim.world.timestep,Math.fround(1/60));
      session.observePause();const before=sim.snapshot();session.tick(500);assert.deepEqual(sim.snapshot(),before);
      session.setSpeed(.5);session.resume();session.tick(1000);assert.equal(sim.steps,before.steps);
      session.tick(1000+1/60);assert.equal(sim.steps,before.steps);
      session.observePause();session.singleStep();assert.equal(sim.steps,before.steps+1);
      session.setSpeed(1);session.resume();session.tick(2000);assert.equal(sim.steps,before.steps+1);
      session.tick(2000+1/60);assert.equal(sim.steps,before.steps+2);
      assert.throws(()=>session.setSpeed(2));
    }finally{session.dispose();}
  }
});
test('historical explicit 6/10/12 second windows remain terminal safety stops',()=>{
  for(const limit of [360,600,720]){
    const {sim,session}=createUprightRun(variantOptions('B'),{record:false,audit:false});
    try{
      assert.equal(session.windowLimit,600);session.windowLimit=limit;
      // Exercise the final native step without reproducing historical experiments.
      sim.steps=limit-1;session.singleStep();assert.equal(sim.steps,limit);
      assert.equal(session.pauseContext.kind,'safety');assert.equal(session.pauseContext.reason,'window-limit');
      assert.equal(sim.enabled,false);session.resume();assert.equal(session.paused,true);assert.equal(session.singleStep(),false);
    }finally{session.dispose();}
  }
});
test('shared fresh-run construction frees old worlds/grip anchors and clears run data',()=>{
  let previousWorld=null;
  for(const variant of ['B','T1','R1','R1','R1']){
    const {sim,session}=createUprightRun(variantOptions(variant),{audit:false,record:false,speed:.25,
      runPolicy:{mode:'free',timerSteps:600},resetOptions:{assisted:false,obstacle:true}});
    assert.notEqual(sim.world,previousWorld);previousWorld=sim.world;
    assert.equal(sim.steps,0);assert.equal(sim.enabled,false);assert.equal(sim.obstacleEnabled,true);
    assert.equal(session.pending,null);assert.equal(session.trial,null);assert.equal(session.lastRun,null);
    assert.equal(session.speed,.25);assert.equal(session.runPolicy.timerSteps,600);
    assert.equal(sim.world.bodies.len(),15);assert.equal(sim.world.impulseJoints.len(),14);
    const body=sim.rig.byId.get('handL').body;sim.beginGrab(body,{...body.translation()},0);
    session.pending=true;let frees=0;const original=sim.world.free.bind(sim.world);
    sim.world.free=()=>{frees++;original();};session.dispose();assert.equal(frees,1);assert.equal(sim.grab.active,false);
  }
});

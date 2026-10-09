import test from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {UprightReturnSlice} from '../src/gameplay/upright-return.js';
import {UprightSession,CONFIG_B} from '../src/gameplay/upright-session.js';
import {PlaygroundFeedback} from '../src/gameplay/playground-feedback.js';
import {variantOptions} from '../src/gameplay/upright-variants.js';
await R.init();

const create=variant=>new UprightSession(new UprightReturnSlice({config:CONFIG_B,...variantOptions(variant)}));
function physical(s){
  const sim=s.sim;
  return {snapshot:sim.snapshot(),pending:s.pending,trial:structuredClone(s.trial),
    controller:{yieldStart:sim.yieldStart,targetStart:sim.targetStart,noSupport:sim.noSupport,rest:sim.rest,lastHit:structuredClone(sim.lastHit)},
    motorCommands:structuredClone([...s.audit.ledger.values()]),
    sleeping:[...sim.rig.byId.values()].map(({body})=>body.isSleeping())};
}

for(const variant of ['B','T1','R1'])test(variant+': observation/marker/step/resume match uninterrupted native steps, including pending input',()=>{
  const a=create(variant),b=create(variant),f=new PlaygroundFeedback();
  const identity={build:{build_id:'pause-regression'},variant,run_id:'one'};
  try{
    a.resume();b.resume();a.tick(0);b.tick(0);
    let wallTime=0;
    for(let step=1;step<=144;step++){
      if(step===21){a.push(false);b.push(false);}
      if(step===25){assert.equal(a.push(false,true),true);assert.equal(b.push(false,true),true);}
      if([23,51,119].includes(step)){
        const before=physical(b);
        if(step===23&&variant!=='B')assert.equal(before.snapshot.targetAssist.phase,'RISE');
        if(step===51&&variant!=='B')assert.equal(before.snapshot.targetAssist.phase,'RETURN');
        const m=f.mark(identity,b.sim.steps,()=>b.sim.snapshot(),()=>({}),()=>({...b.observePause('marker'),snapshot_timing:'before-pause-request'}));
        assert.deepEqual(m.snapshot,before.snapshot);assert.equal(m.pause.kind,'observation');
        assert.deepEqual(physical(b),before,'no native/controller/pending changes on marker');
        assert.equal(b.push(true),false,'paused pushes must not queue');
        b.tick(wallTime+500);b.tick(wallTime+1000);assert.deepEqual(physical(b),before);
        const old=b.sim.step;let calls=0;b.sim.step=function(){calls++;return old.call(this);};
        assert.equal(b.singleStep(),true);assert.equal(calls,1);b.sim.step=old;
        assert.equal(b.paused,true);a.tick(step/60+.000001);
        assert.deepEqual(physical(b),physical(a),'single step is the regular path');
        b.resume();wallTime+=1000;b.tick(wallTime);
        assert.deepEqual(physical(b),physical(a),'resume first frame does not catch up');
      }else{a.tick(step/60+.000001);wallTime+=1/60;b.tick(wallTime+.000001);}
      assert.equal(b.sim.steps,step);assert.deepEqual(physical(b),physical(a));
      if(step===118)assert.equal(b.pending,false,'step-scheduled input survives observation pauses');
      if(step===121){
        assert.equal(b.pending,null,'input applied exactly at regular step120');
        assert.equal(b.sim.lastHit.step,120);assert.equal(b.events.filter(e=>e.kind==='push-after').length,2);
      }
    }
    const exported=JSON.parse(f.report(identity,{note:'Zustandstreue Pause'},[...b.sim.rig.byId.keys()]).json);
    assert.equal(exported.observation.step,118);assert.equal(exported.observation.pause.kind,'observation');
    assert.equal(exported.observation.snapshot.steps,118,'marker stays copied while run continues');
  }finally{a.dispose();b.dispose();}
});

test('active-grab marker captures before an explicit safety stop; pending and grip are discarded without throw',()=>{
  const s=create('R1'),f=new PlaygroundFeedback(),identity={run_id:'grip'};
  try{
    s.resume();assert.equal(s.push(false,true),true);
    const body=s.sim.rig.byId.get('handL').body,baseBodies=s.sim.world.bodies.len();
    assert.equal(s.sim.beginGrab(body,body.translation(),1),true);
    s.sim.grab.move({x:body.translation().x+.1,y:body.translation().y,z:body.translation().z},1.05);
    const motion=s.sim.snapshot().parts;
    const marker=f.mark(identity,0,()=>s.sim.snapshot(),()=>({}),()=>({...s.observePause('marker'),snapshot_timing:'before-pause-request'}));
    assert.equal(marker.snapshot.grab.active,true);assert.equal(marker.snapshot.counts.bodies,baseBodies+1);
    assert.equal(marker.pause.kind,'safety');assert.equal(marker.pause.reason,'marker-active-grab');
    assert.equal(marker.pause.grab_cancelled,true);assert.equal(marker.pause.pending_discarded,true);
    assert.equal(s.sim.grab.active,false);assert.equal(s.sim.grab.diagnostics.lastRelease.threw,false);
    assert.equal(s.pending,null);assert.equal(s.sim.world.impulseJoints.len(),14);
    const repeated=s.observePause('marker');assert.equal(repeated.action,'already-paused');
    assert.deepEqual(s.sim.snapshot().parts.map(p=>({id:p.id,position:p.position,rotation:p.rotation,velocity:p.velocity,angularVelocity:p.angularVelocity})),
      motion.map(p=>({id:p.id,position:p.position,rotation:p.rotation,velocity:p.velocity,angularVelocity:p.angularVelocity})));
    s.sim.grab.move({x:100,y:100,z:100},50);s.sim.grab.release(50);
    s.resume();assert.equal(s.sim.enabled,false);assert.equal(s.pending,null);
    assert.ok([...s.audit.ledger.values()].every(c=>c.cap===0));
    s.reset({assisted:true,obstacle:false});f.clear();assert.equal(s.sim.steps,0);assert.equal(s.sim.enabled,true);
    assert.equal(s.pauseContext.kind,'initial');assert.equal(s.pending,null);assert.equal(s.trial,null);
    assert.throws(()=>f.report({run_id:'new'},{},[]),/first/);
  }finally{s.dispose();}
});

test('manual assist-off, strong hit and hidden safety stop stay off across observation/resume/step',()=>{
  for(const cause of ['manual-assist-off','strong-push','hidden']){
    const s=create('R1');
    try{
      s.resume();s.tick(0);s.tick(1/60);
      if(cause==='strong-push')s.push(true);else if(cause==='hidden'){s.observePause();s.pause('hidden');}else s.sim.interrupt(cause);
      const before=physical(s);s.observePause('marker');assert.deepEqual(physical(s),before);
      if(cause==='hidden')assert.equal(s.pauseContext.kind,'safety');
      s.resume();assert.equal(s.sim.enabled,false);s.observePause();s.singleStep();assert.equal(s.sim.enabled,false);
      assert.equal(s.sim.motorEnabled,false);assert.ok([...s.audit.ledger.values()].every(c=>c.cap===0));
      assert.equal(s.push(false,true),false);
    }finally{s.dispose();}
  }
});

test('terminal and invalid runs cannot resume or single-step; a replacement variant starts fresh',()=>{
  const s=create('B');let replacement;
  try{
    s.windowLimit=1;s.singleStep();assert.equal(s.pauseContext.reason,'window-limit');
    const before=physical(s);s.resume();assert.equal(s.paused,true);assert.equal(s.singleStep(),false);assert.deepEqual(physical(s),before);
    s.reset({assisted:true,obstacle:false});s.sim.invalid='test-invalid';s.observePause();
    s.resume();assert.equal(s.paused,true);assert.equal(s.singleStep(),false);
    replacement=create('T1');assert.equal(replacement.sim.steps,0);assert.equal(replacement.paused,true);
    assert.equal(replacement.pending,null);assert.equal(replacement.sim.grab.active,false);assert.equal(replacement.sim.enabled,true);
  }finally{s.dispose();replacement?.dispose();}
});

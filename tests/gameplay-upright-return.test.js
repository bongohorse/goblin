import test from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {UprightSlice,targetAtStep} from '../src/gameplay/upright-assist.js';
import {UprightReturnSlice,returnAtStep,RETURN_R1} from '../src/gameplay/upright-return.js';
import {UprightSession,CONFIG_B} from '../src/gameplay/upright-session.js';
import {analyzeReturn} from '../scripts/gameplay-upright-return-analysis.mjs';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
await R.init();
// Synthetic counters/native command reads, zero world.step calls.
test('R1 preserves all rise/hold samples and uses one bounded, smooth, exact-deadline return',()=>{
  assert.deepEqual(RETURN_R1,{id:'R1',restore:72,total:90});
  for(let n=-1;n<=18;n++)assert.deepEqual(returnAtStep(n),targetAtStep(n));
  let previous=returnAtStep(18).angle;
  for(let n=19;n<=90;n++){
    const t=returnAtStep(n);assert.ok(t.angle>=0&&t.angle<=previous);previous=t.angle;
    assert.ok(Math.abs(Math.hypot(t.up.x,t.up.y)-1)<1e-12);
  }
  assert.deepEqual(returnAtStep(90),targetAtStep(60));assert.deepEqual(returnAtStep(720),targetAtStep(60));
  assert.ok(returnAtStep(19).angle-returnAtStep(20).angle<targetAtStep(19).angle-targetAtStep(20).angle);
});
test('B and idle T1 remain identical; R1 interruptions/reset cannot restore targets or motion-write',()=>{
  for(const reaction of ['B','T1']){
    const old=new UprightSlice({config:CONFIG_B,reaction}),fresh=new UprightReturnSlice({config:CONFIG_B,reaction,returnProfile:'R1'});
    try{
      assert.deepEqual(fresh.snapshot(),old.snapshot());
      fresh.preStep();old.preStep();assert.deepEqual(fresh.snapshot(),old.snapshot());
      for(const reason of ['grab','manual-assist-off','balance-lost','obstacle','pause','strong-push']){
        fresh.reset();fresh.state='ASSISTED_READY';fresh.steps=120;fresh.push();fresh.steps=150;
        const motion=fresh.snapshot().parts.map(p=>[p.position,p.rotation,p.velocity,p.angularVelocity]);
        fresh.interrupt(reason);assert.equal(fresh.targetStart,null);assert.equal(fresh.targetAssist().phase,'OFF');
        fresh.steps=180;fresh.preStep();assert.equal(fresh.motorEnabled,false);
        assert.deepEqual(fresh.snapshot().parts.map(p=>[p.position,p.rotation,p.velocity,p.angularVelocity]),motion);
        assert.ok(fresh.snapshot().parts.every(p=>Object.values(p.force).concat(Object.values(p.torque)).every(v=>v===0)));
      }
      fresh.reset();assert.equal(fresh.targetStart,null);assert.deepEqual(fresh.snapshot().parts,UprightSnapshot(old));
    }finally{old.dispose();fresh.dispose();}
  }
});
function UprightSnapshot(sim){sim.reset();return sim.snapshot().parts;}
test('trial input arm/check/apply is stepfree; late/falling/ inactive event is rejected, reset clears plan',()=>{
  const sim=new UprightReturnSlice({config:CONFIG_B,reaction:'T1',returnProfile:'R1'}),session=new UprightSession(sim);
  const plan={id:'fixture',durationSteps:240,actions:[{kind:'small',step:120,policy:{step:120,upright:true}},{kind:'off',step:150,policy:{step:150,activeTarget:true}}]};
  try{
    const before=sim.snapshot();session.armTrial(plan);assert.deepEqual(sim.snapshot(),before);
    sim.steps=121;session.applyTrialEvents();assert.equal(session.trial.outcomes[0].applied,false);assert.equal(sim.lastHit,null);
    session.reset({assisted:true,obstacle:false});assert.equal(session.trial,null);assert.equal(session.pending,null);
    session.armTrial(plan);sim.steps=120;session.applyTrialEvents();assert.equal(session.trial.outcomes[0].applied,false,'not yet genuinely upright');
    session.reset({assisted:true,obstacle:false});session.armTrial(plan);sim.steps=120;sim.state='ASSISTED_READY';
    sim.metrics.feet.forEach(f=>f.distance=0);session.paused=false;session.applyTrialEvents();
    assert.equal(sim.steps,120);assert.equal(session.trial.outcomes[0].applied,true);assert.equal(sim.targetStart,120);
    sim.steps=150;session.applyTrialEvents();assert.equal(session.trial.outcomes[1].applied,true);assert.equal(sim.targetStart,null);
    assert.ok([...session.audit.ledger.values()].every(c=>c.cap===0&&c.stiffness===0&&c.damping===0));
    session.reset({assisted:true,obstacle:false});assert.equal(sim.steps,0);assert.equal(session.paused,true);assert.equal(session.trial,null);assert.equal(session.pending,null);
  }finally{session.dispose();}
});
test('shared idle reference is explicit and refuses changed common sources or triggered reference',()=>{
  const archive=JSON.parse(gunzipSync(fs.readFileSync('docs/development/gameplay-upright-target-finish-evidence.json.gz')));
  const extend=(r,id,returnProfile)=>{
    const copy=structuredClone(r);copy.id=id;copy.identity.returnProfile=returnProfile;
    for(let n=361;n<=720;n++)copy.trace.push({...structuredClone(copy.trace[360]),step:n,time:n/60});
    return copy;
  };
  // Synthetic extension only for reader validation; never reported as new physics.
  const rows=[extend(archive.records[2],'reference','R1'),extend(archive.records[3],'legacy-small','legacy'),extend(archive.records[3],'R1-small','R1')];
  assert.equal(analyzeReturn(rows).valid,true);assert.equal(analyzeReturn(rows).comparison.lowerAfterRms,false);
  const sources=structuredClone(rows);sources[2].identity.returnSource='different';assert.equal(analyzeReturn(sources).valid,false);
  const triggered=structuredClone(rows);triggered[0].trace[500].observation.controller.targetStart=120;assert.equal(analyzeReturn(triggered).valid,false);
  const prefix=structuredClone(rows);prefix[2].trace[120].torso.position.x+=.001;assert.equal(analyzeReturn(prefix).valid,false);
});

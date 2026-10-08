import {test} from 'node:test';
import assert from 'node:assert/strict';
import {StandingSimulation,initRapier} from '../src/labs/standing/simulation.js';
import {compareResults,TOLERANCES} from '../src/labs/standing/compare.js';
import {validateResult,validateResultProvenance} from '../src/labs/standing/config.js';
import {LabClock} from '../src/labs/standing/clock.js';
await initRapier();

test('actual passive checkpoints agree at 30/60/144 Hz and irregular render intervals',async()=>{
  const results=[];
  for(const intervals of [[1/30],[1/60],[1/144],[1/144,1/30,1/60]]){
    const s=new StandingSimulation(),clock=new LabClock(s.config.fixed_dt);let t=0,i=0;
    try{clock.advance(t,false,()=>s.step());while(!s.terminal){t+=intervals[i++%intervals.length];clock.advance(t,false,()=>s.step());}results.push(await s.result());}finally{s.dispose();}
  }
  for(const r of results.slice(1))assert.equal(compareResults(results[0],r).pass,true);
});

test('five fresh worlds reproduce all checkpoints; compare ignores identifiers/timing but catches corruption',async()=>{
  const results=[];for(let i=0;i<5;i++){const s=new StandingSimulation();try{while(!s.terminal)s.step();results.push(await s.result());}finally{s.dispose();}}
  assert.equal(new Set(results.map(r=>r.run_id)).size,5);
  assert.deepEqual(results[0].checkpoints.map(c=>c.step),[0,1,10,30,60,69]);
  for(const r of results.slice(1))assert.equal(compareResults(results[0],r).pass,true);
  const sign=structuredClone(results[1]);for(const c of sign.checkpoints)for(const b of c.bodies)for(const k of ['x','y','z','w'])b.rotation[k]*=-1;
  sign.physics_timing.mean=12345;sign.run_id='different';assert.equal(compareResults(results[0],sign).pass,true,'quaternion sign and CPU/UUID excluded');
  const displaced=structuredClone(sign);displaced.checkpoints[0].bodies[0].position.x+=TOLERANCES.position*2;assert.equal(compareResults(results[0],displaced).pass,false);
  const missing=structuredClone(sign);missing.checkpoints.pop();assert.equal(compareResults(results[0],missing).pass,false);
  const wrong=structuredClone(sign);wrong.failure_bodies=['handR'];assert.equal(compareResults(results[0],wrong).pass,false);
  const forged=structuredClone(results[0]);forged.config.gravity.x=.1;
  await assert.rejects(()=>validateResultProvenance(forged),/hash mismatch/);
  const fakeIds=structuredClone(results[0]);fakeIds.config_id='config:sha256:'+'0'.repeat(64);fakeIds.experiment_id='passive-v1:'+'0'.repeat(64);
  await assert.rejects(()=>validateResultProvenance(fakeIds),/hash mismatch/);
  for(const mutate of [r=>{r.telemetry=null;},r=>{r.checkpoints=[];r.unreached_checkpoints=[];},r=>{r.checkpoints[0].bodies[0].id='unknown';},r=>{r.observed_time=NaN;}]){
    const damaged=structuredClone(results[0]);mutate(damaged);
    assert.throws(()=>validateResult(damaged));
    assert.equal(compareResults(damaged,damaged).pass,false,'two identically damaged traces must not pass');
  }
});

test('fresh reset after terminal clears measurements/contacts and reproduces the complete result',async()=>{
  const s=new StandingSimulation();try{
    const initial=s.snapshot();while(!s.terminal)s.step();const first=await s.result(),world=s.world,events=s.events;
    s.reset();assert.notEqual(s.world,world);assert.notEqual(s.events,events);assert.equal(s.terminal,null);assert.equal(s.physicsTimes.length,0);assert.equal(s.observationTimes.length,0);assert.equal(s.checkpoints.length,1);assert.deepEqual(s.snapshot(),initial);
    while(!s.terminal)s.step();const second=await s.result();assert.notEqual(first.run_id,second.run_id);assert.equal(compareResults(first,second).pass,true);
  }finally{s.dispose();}
});

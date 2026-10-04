import {test} from 'node:test';
import assert from 'node:assert/strict';
import {StandingSimulation,initRapier} from '../src/labs/standing/simulation.js';
import {compareResults,TOLERANCES} from '../src/labs/standing/compare.js';
await initRapier();

test('five fresh worlds reproduce all checkpoints; compare ignores identifiers/timing but catches corruption',async()=>{
  const results=[];for(let i=0;i<5;i++){const s=new StandingSimulation();try{while(!s.terminal)s.step();results.push(await s.result());}finally{s.dispose();}}
  assert.equal(new Set(results.map(r=>r.run_id)).size,5);
  assert.deepEqual(results[0].checkpoints.map(c=>c.step),[0,1,10,30,60,70]);
  for(const r of results.slice(1))assert.equal(compareResults(results[0],r).pass,true);
  const sign=structuredClone(results[1]);for(const c of sign.checkpoints)for(const b of c.bodies)for(const k of ['x','y','z','w'])b.rotation[k]*=-1;
  sign.physics_timing.mean=12345;sign.run_id='different';assert.equal(compareResults(results[0],sign).pass,true,'quaternion sign and CPU/UUID excluded');
  const displaced=structuredClone(sign);displaced.checkpoints[0].bodies[0].position.x+=TOLERANCES.position*2;assert.equal(compareResults(results[0],displaced).pass,false);
  const missing=structuredClone(sign);missing.checkpoints.pop();assert.equal(compareResults(results[0],missing).pass,false);
  const wrong=structuredClone(sign);wrong.failure_bodies=['handR'];assert.equal(compareResults(results[0],wrong).pass,false);
});

test('fresh reset after terminal clears measurements/contacts and reproduces the complete result',async()=>{
  const s=new StandingSimulation();try{
    const initial=s.snapshot();while(!s.terminal)s.step();const first=await s.result(),world=s.world,events=s.events;
    s.reset();assert.notEqual(s.world,world);assert.notEqual(s.events,events);assert.equal(s.terminal,null);assert.equal(s.physicsTimes.length,0);assert.equal(s.observationTimes.length,0);assert.equal(s.checkpoints.length,1);assert.deepEqual(s.snapshot(),initial);
    while(!s.terminal)s.step();const second=await s.result();assert.notEqual(first.run_id,second.run_id);assert.equal(compareResults(first,second).pass,true);
  }finally{s.dispose();}
});

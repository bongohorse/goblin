import test from 'node:test';
import assert from 'node:assert/strict';
import {BASELINE,canonical,configIdentity} from '../src/labs/standing/config.js';
import {experimentConfig,experimentIdentity,validateExperiment} from '../scripts/motor-solver43-config.js';
import {candidateRun} from '../scripts/motor-solver43.js';
test('motor experiment hashes identify exact caps/solver configs without altering passive identity',async()=>{
  const passiveBefore=canonical(BASELINE),identities=[];
  for(const cap of [20,1])for(const solver of [8,32]){
    const c=experimentConfig(cap,solver),id=await experimentIdentity(c);
    assert.equal(c.baseline.solver_config.numSolverIterations,8);assert.equal(c.effective_solver_config.numSolverIterations,solver);
    assert.match(id.experiment_id,/^motor-solver-candidate-v1:[0-9a-f]{64}$/);assert.equal(id.config_hash,'sha256:'+id.experiment_id.split(':')[1]);
    assert.deepEqual(await experimentIdentity(structuredClone(c)),id);identities.push(id.config_hash);
  }
  assert.equal(new Set(identities).size,4);assert.equal(canonical(BASELINE),passiveBefore);
  assert.equal((await configIdentity(BASELINE)).config_id,'config:sha256:414ed28b04c2fd0351554014f1c7e8637c5bd8674477c8a13483f410ed31e2aa');
});
test('frozen experiment rejects undeclared budgets, gain/rig/tolerance changes and invalid run horizons',()=>{
  assert.throws(()=>experimentConfig(2,32));assert.throws(()=>experimentConfig(20,64));
  for(const mutate of [c=>c.actuation.stiffness=101,c=>c.baseline.fixed_dt=1/30,c=>c.safety.limit_error_rad=.1,c=>c.horizon_steps=7200]){const c=structuredClone(experimentConfig(20,32));mutate(c);assert.throws(()=>validateExperiment(c));}
  assert.throws(()=>candidateRun(experimentConfig(20,32),{horizon:NaN}));
});
test('diagnostic continuation retains the original anomaly guard and never exports invalid standing time',()=>{
  const r=candidateRun(experimentConfig(1,8),{mode:'diagnostic-after-contact',horizon:200});
  assert.equal(r.steps,140);assert.equal(r.end.termination_reason,'invalid_simulation');assert.equal(r.end.invalid_detail,'constraint_error:elbowR');
  assert.equal(r.standing_time,null);assert.equal(r.accepted_standing_evidence,false);assert.ok(r.first_nonfoot_contact);
  assert.ok(r.metrics.first_limit_safety_crossing.value>.05);
});
test('solver32 contact end remains separate from guarded diagnostic continuation through the head impact',()=>{
  const config=experimentConfig(1,32),normal=candidateRun(config,{horizon:200}),diagnostic=candidateRun(config,{mode:'diagnostic-after-contact',horizon:200});
  assert.equal(normal.steps,186);assert.equal(normal.end.termination_reason,'non_foot_contact');
  assert.deepEqual(normal.end.failure_bodies,['handL','handR']);assert.equal(normal.standing_time,186/60);
  assert.equal(diagnostic.steps,200);assert.equal(diagnostic.standing_time,null);
  assert.equal(diagnostic.first_normal_terminal.failure_step,186);assert.ok(diagnostic.contact_onsets.some(e=>e.step===192&&e.pair==='floor/head'));
  assert.ok(diagnostic.metrics.limit_error_rad.value<.05);assert.equal(diagnostic.metrics.first_limit_safety_crossing,null);
  assert.notEqual(normal.state_contact_sequence_hash,diagnostic.state_contact_sequence_hash);
});

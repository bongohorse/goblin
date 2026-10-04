import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {StandingSimulation,initRapier} from '../src/labs/standing/simulation.js';
import {motorExperiment,validateMotorExperiment} from '../src/labs/standing/motor-config.js';
import {validateResult,validateResultProvenance,configIdentity,BASELINE} from '../src/labs/standing/config.js';
import {compareResults} from '../src/labs/standing/compare.js';
await initRapier();
test('motor v2 reader enforces frozen config, tracking and provenance while passive v1 hash stays unchanged',async()=>{
  const s=new StandingSimulation(undefined,{},motorExperiment(1));try{
    s.step();const r=await s.result();await validateResultProvenance(r);assert.equal(r.schema_version,2);assert.equal(r.controller_id,'native-pose-hold-force-v1');assert.equal(r.solver_config.numSolverIterations,32);
    assert.equal(r.telemetry.motor_tracking.length,14);assert.equal(r.telemetry.motor_effort,null);assert.equal(r.telemetry.motor_saturation,null);
    assert.equal(r.motor_commands_timing.count,1);assert.equal(s.world.integrationParameters.numSolverIterations,32);
    const changed=structuredClone(r);changed.config_id='config:sha256:'+'0'.repeat(64);changed.experiment_id='native-force-solver32-v2:'+'0'.repeat(64);await assert.rejects(()=>validateResultProvenance(changed),/hash mismatch/);
    for(const mutate of [r=>r.config.solver_config.numSolverIterations=8,r=>r.config.rig.fixed_dt=1/30,r=>r.telemetry.motor_tracking[0].configured_axis_cap_Nm=20,r=>r.telemetry.motor_tracking[0].target=.1,r=>r.telemetry.motor_tracking[0].error_rad+=.1,r=>r.telemetry.motor_tracking[0].relative_angular_velocity_rad_s.x=NaN,r=>r.telemetry.motor_tracking[1].joint_id=r.telemetry.motor_tracking[0].joint_id,r=>r.telemetry.motor_effort=1]){const bad=structuredClone(r);mutate(bad);assert.throws(()=>validateResult(bad));}
    assert.notEqual((await configIdentity(motorExperiment(1))).config_id,(await configIdentity(motorExperiment(20))).config_id);
    assert.equal((await configIdentity(BASELINE)).config_id,'config:sha256:414ed28b04c2fd0351554014f1c7e8637c5bd8674477c8a13483f410ed31e2aa');
    assert.throws(()=>validateMotorExperiment({...motorExperiment(),solver_config:{numSolverIterations:64}}));
  }finally{s.dispose();}
});
test('fresh reset rebinds every motor handle; pending export stays on its clicked run and dispose clears references',async()=>{
  const s=new StandingSimulation(undefined,{},motorExperiment());const motor=s.motor;
  try{const initial=s.snapshot();for(let i=0;i<20;i++){
    const world=s.world,events=s.events,id=s.runId,entries=s.motor.entries;s.step();const pending=s.result();s.reset();const exported=await pending;
    await validateResultProvenance(exported);assert.equal(exported.run_id,id);assert.equal(exported.simulation_steps,1);
    assert.notEqual(s.world,world);assert.notEqual(s.events,events);assert.notEqual(s.runId,id);assert.notEqual(s.motor.entries,entries);assert.equal(s.motor.entries.length,14);
    assert.equal(s.commandTimes.length,0);assert.equal(s.physicsTimes.length,0);assert.deepEqual(s.snapshot(),initial);assert.deepEqual(s.counts(),{bodies:15,colliders:16,joints:14});
  }}finally{s.dispose();s.dispose();}
  assert.equal(motor.entries.length,0);assert.equal(s.commandTimes.length,0);assert.throws(()=>s.step(),/Disposed/);
  const passive=new StandingSimulation();try{assert.equal(passive.motor,null);assert.equal(passive.world.integrationParameters.numSolverIterations,8);while(!passive.terminal)passive.step();const r=await passive.result();const original=JSON.parse(fs.readFileSync('docs/research/standing-lab/review-39/baseline/run-1.json'));assert.equal(compareResults(original,r).pass,true);}finally{passive.dispose();}
});
test('integrated solver32 normal modes preserve candidate contact/timeout references and stop permanently',async()=>{
  for(const cap of [20,1]){
    const s=new StandingSimulation(undefined,{},motorExperiment(cap));try{while(!s.terminal)s.step();const r=await s.result();await validateResultProvenance(r);assert.equal(s.steps,cap===20?3600:187);assert.equal(r.termination_reason,cap===20?'timeout':'non_foot_contact');assert.deepEqual(r.failure_bodies,cap===20?[]:['handL','handR']);assert.equal(s.step(),false);assert.equal(s.steps,r.simulation_steps);assert.equal(r.checkpoints.at(-1).step,s.steps);}finally{s.dispose();}
  }
});

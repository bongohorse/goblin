import test from 'node:test';
import assert from 'node:assert/strict';
import {StandingSimulation,initRapier} from '../src/labs/standing/simulation.js';
import {modelExperiment,validateModelExperiment} from '../src/labs/standing/model-config.js';
import {validateResultProvenance,validateResult,configIdentity} from '../src/labs/standing/config.js';
import {modelRun,validateModelRun} from '../scripts/motor-model48.js';
await initRapier();
test('study hashes and reader preserve frozen parameters, declared gain units and same-step evidence',async()=>{
  const ids=[];for(const cap of [20,1])for(const [model,cal] of [['ForceBased',false],['AccelerationBased',false],['AccelerationBased',true]]){
    const config=modelExperiment(model,cap,cal);ids.push((await configIdentity(config)).config_id);
    for(const mutate of [c=>c.actuation.gain_units='Nm',c=>c.actuation.stiffness+=1,c=>c.actuation.target_convention='direct',c=>c.rig.bodies[0].mass+=1,c=>c.solver_config.numSolverIterations=8,c=>c.actuation.max_torque_Nm=2]){const bad=structuredClone(config);mutate(bad);assert.throws(()=>validateModelExperiment(bad));}
    const s=new StandingSimulation(undefined,{},config);try{s.step();s.step();const pending=s.result(),id=s.runId;s.reset();const r=await pending;
      assert.equal(r.run_id,id);assert.equal(r.schema_version,3);assert.equal(r.checkpoints.at(-1).step,2);await validateResultProvenance(r);
      const bad=structuredClone(r);bad.config.actuation.model=model==='ForceBased'?'AccelerationBased':'ForceBased';assert.throws(()=>validateResult(bad));
      const corrupt=structuredClone(r);corrupt.telemetry.motor_tracking[0].relative_angular_velocity_rad_s.x+=1;assert.throws(()=>validateResult(corrupt));
      const hash=structuredClone(r);hash.config_id='config:sha256:'+'0'.repeat(64);hash.experiment_id='native-model-ab-v3:'+'0'.repeat(64);await assert.rejects(()=>validateResultProvenance(hash));
    }finally{s.dispose();}
  }assert.equal(new Set(ids).size,6);assert.throws(()=>modelExperiment('ForceBased',20,true));
});
test('study invalid latch never continues or claims Standing time; calibrated impact diagnostics prohibited',async()=>{
  const s=new StandingSimulation(undefined,{},modelExperiment());try{s.world.removeRigidBody(s.bodies.get('head').body);s.step();const r=await s.result();assert.equal(r.termination_reason,'invalid_simulation');assert.equal(r.standing_time,null);assert.equal(s.step(),false);await validateResultProvenance(r);}finally{s.dispose();}
  await assert.rejects(()=>modelRun(modelExperiment('AccelerationBased',20,true),{diagnostic:true}),/No calibrated/);
  const diagnostic=await modelRun(modelExperiment('AccelerationBased',1),{diagnostic:true});await validateModelRun(diagnostic);assert.equal(diagnostic.standing_time,null);assert.equal(diagnostic.diagnostic_only,true);assert.equal(diagnostic.result,undefined);
  await assert.rejects(()=>validateModelRun({...diagnostic,standing_time:60}),/Diagnostic/);
  await assert.rejects(()=>validateModelRun({...diagnostic,invalid_measurement:'missing'}),/Incomplete/);
  const normal=await modelRun(modelExperiment('AccelerationBased',1));await validateModelRun(normal);
  await assert.rejects(()=>validateModelRun({...normal,end_reason:'timeout'}),/Inconsistent/);
  await assert.rejects(()=>validateModelRun({...normal,invalid:'invented'}),/Inconsistent/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {StandingSimulation,initRapier} from '../src/labs/standing/simulation.js';
import {motorExperiment,validateMotorExperiment} from '../src/labs/standing/motor-config.js';
import {validateResult,validateResultProvenance,configIdentity,BASELINE} from '../src/labs/standing/config.js';
import {compareResults} from '../src/labs/standing/compare.js';
import {hingeOracle} from '../scripts/motor-rig-oracle.js';
import {Quaternion,Vector3} from 'three';
await initRapier();
test('motor reader rejects coherently false hinge and angular velocity against same-step bodies',async()=>{
  const s=new StandingSimulation(undefined,{},motorExperiment(1));try{
    for(let step=0;step<=2;step++){
      if(step)s.step();const r=await s.result();
      for(const t of r.telemetry.motor_tracking){const e=s.motor.entries.find(e=>e.spec.id===t.joint_id);
        const a=e.joint.body1(),b=e.joint.body2();
        if(t.kind==='revolute')assert.ok(Math.abs(t.actual-hingeOracle(a.rotation(),b.rotation(),e.bindFrame,e.frame2).angle)<1e-8);
        else {const qa=new Quaternion().copy(a.rotation()).multiply(new Quaternion().copy(e.bindFrame)),qb=new Quaternion().copy(b.rotation()).multiply(new Quaternion().copy(e.frame2));const relative=qa.invert().multiply(qb);assert.ok(1-Math.abs(relative.dot(new Quaternion().copy(t.actual)))<1e-6);}
        const frame=new Quaternion().copy(a.rotation()).multiply(new Quaternion().copy(e.joint.frameX1()));
        const velocity=new Vector3().copy(b.angvel()).sub(new Vector3().copy(a.angvel())).applyQuaternion(frame.invert());
        assert.ok(velocity.distanceTo(new Vector3().copy(t.relative_angular_velocity_rad_s))<1e-6);
      }
      const bad=structuredClone(r),t=bad.telemetry.motor_tracking.find(t=>t.kind==='revolute'),j=bad.telemetry.joints.find(j=>j.id===t.joint_id);
      t.actual=.01;t.error_rad=.01;j.angle=.01;j.limit_violation=0;
      assert.throws(()=>validateResult(bad),/checkpoint/);
      const badVelocity=structuredClone(r);badVelocity.telemetry.motor_tracking[0].relative_angular_velocity_rad_s.x+=1;
      assert.throws(()=>validateResult(badVelocity),/velocity/);
    }
  }finally{s.dispose();}
});
test('incomplete motor export includes clicked-step evidence without mutating scheduled checkpoints',async()=>{
  const s=new StandingSimulation(undefined,{},motorExperiment(1));try{
    s.step();s.step();const id=s.runId,pending=s.result();s.reset();const r=await pending;
    assert.equal(r.run_id,id);assert.equal(r.simulation_steps,2);assert.equal(r.checkpoints.at(-1).step,2);
    await validateResultProvenance(r);assert.deepEqual(s.checkpoints.map(c=>c.step),[0]);
    const missing=structuredClone(r);missing.checkpoints.pop();assert.throws(()=>validateResult(missing),/checkpoint/);
  }finally{s.dispose();}
});
test('motor v2 reader enforces frozen config, tracking and provenance while passive v1 hash stays unchanged',async()=>{
  const s=new StandingSimulation(undefined,{},motorExperiment(1));try{
    s.step();const r=await s.result();await validateResultProvenance(r);assert.equal(r.schema_version,2);assert.equal(r.controller_id,'native-pose-hold-force-v1');assert.equal(r.solver_config.numSolverIterations,32);
    assert.equal(r.telemetry.motor_tracking.length,14);assert.equal(r.telemetry.motor_effort,null);assert.equal(r.telemetry.motor_saturation,null);
    assert.equal(r.motor_commands_timing.count,1);assert.equal(s.world.integrationParameters.numSolverIterations,32);
    const changed=structuredClone(r);changed.config_id='config:sha256:'+'0'.repeat(64);changed.experiment_id='native-force-solver32-v2:'+'0'.repeat(64);await assert.rejects(()=>validateResultProvenance(changed),/hash mismatch/);
    for(const mutate of [r=>r.config.solver_config.numSolverIterations=8,r=>r.config.rig.fixed_dt=1/30,r=>r.telemetry.motor_tracking[0].configured_axis_cap_Nm=20,r=>r.telemetry.motor_tracking[0].target=.1,r=>r.telemetry.motor_tracking[0].error_rad+=.1,r=>r.telemetry.motor_tracking[0].relative_angular_velocity_rad_s.x=NaN,r=>r.telemetry.motor_tracking[1].joint_id=r.telemetry.motor_tracking[0].joint_id,r=>r.telemetry.motor_effort=1]){const bad=structuredClone(r);mutate(bad);assert.throws(()=>validateResult(bad));}
    for(const mutate of [r=>r.telemetry.joints[0].angle=null,r=>r.telemetry.joints[0].limit_violation=null,r=>r.motor_commands_timing.count=0,r=>{const q=r.checkpoints.at(-1).bodies.find(b=>b.id==='upperArmL').rotation;q.x=Math.sin(.1);q.w=Math.cos(.1);}]){const bad=structuredClone(r);mutate(bad);assert.throws(()=>validateResult(bad));}
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
  const passive=new StandingSimulation();try{assert.equal(passive.motor,null);assert.equal(passive.world.integrationParameters.numSolverIterations,8);while(!passive.terminal)passive.step();const r=await passive.result();const original=JSON.parse(fs.readFileSync('docs/research/standing-lab/review-39/baseline/run-1.json'));assert.equal(compareResults(original,r).pass,false);assert.ok(compareResults(original,r).errors.includes('measurement_version'));assert.equal(r.simulation_steps,69);}finally{passive.dispose();}
});
test('integrated solver32 normal modes preserve candidate contact/timeout references and stop permanently',async()=>{
  for(const cap of [20,1]){
    const s=new StandingSimulation(undefined,{},motorExperiment(cap));try{while(!s.terminal)s.step();const r=await s.result();await validateResultProvenance(r);assert.equal(s.steps,cap===20?3600:186);assert.equal(r.termination_reason,cap===20?'timeout':'non_foot_contact');assert.deepEqual(r.failure_bodies,cap===20?[]:['handL','handR']);assert.equal(s.step(),false);assert.equal(s.steps,r.simulation_steps);assert.equal(r.checkpoints.at(-1).step,s.steps);}finally{s.dispose();}
  }
});

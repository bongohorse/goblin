import test from 'node:test';
import assert from 'node:assert/strict';
import {initRapier} from '../src/labs/standing/simulation.js';
import {rotationDistance} from '../src/labs/standing/math.js';
import {nativeTargets,targetConfig,targetIdentity} from '../scripts/spherical-target52-contract.js';
import {verifyTargetFixtures} from '../scripts/spherical-target52-fixtures.js';
import {targetSimulation,targetRun,validateTargetRun} from '../scripts/spherical-target52.js';
await initRapier();
test('spherical targets: real tracking/sign/frame/matrix/cap/reaction oracles',()=>verifyTargetFixtures());
test('target contract rejects global/malformed mapping and keeps distinct identities',()=>{
  assert.throws(()=>nativeTargets({x:1,y:0,z:0,w:0}),/domain/);
  assert.throws(()=>nativeTargets({x:0,y:0,z:0,w:2}),/unit/);
  assert.throws(()=>nativeTargets({x:NaN,y:0,z:0,w:1}));
  assert.notEqual(targetIdentity(targetConfig('fixed-native',1)).experiment_id,targetIdentity(targetConfig('moving-frame',1)).experiment_id);
  assert.throws(()=>targetConfig('fixed-native',2));
});
test('fixed study reset replaces handles, preserves neutral frames, frees resources and obeys invalid latch',()=>{
  const sim=targetSimulation(targetConfig('fixed-native',1));const motor=sim.motor;
  try{
    const first=sim.snapshot();
    for(let i=0;i<20;i++){const world=sim.world,events=sim.events,entries=motor.entries;sim.step();sim.reset();
      assert.notEqual(sim.world,world);assert.notEqual(sim.events,events);assert.notEqual(motor.entries,entries);
      assert.deepEqual(sim.snapshot(),first);assert.deepEqual(sim.counts(),{bodies:15,colliders:16,joints:14});
      for(const e of motor.entries)assert.ok(rotationDistance(e.joint.frameX1(),e.bindFrame)<1e-8);
    }
    sim.bodies.get('head').body.setAngvel({x:201,y:0,z:0},true);sim.step();assert.equal(sim.terminal.termination_reason,'invalid_simulation');assert.equal(sim.terminal.standing_time,null);assert.equal(sim.step(),false);
  }finally{sim.dispose();sim.dispose();}
  assert.equal(motor.entries.length,0);assert.throws(()=>sim.step(),/Disposed/);
});
test('target reader rejects legacy/mixed/corrupt reports and verifies neutral A/B evidence',async()=>{
  const moving=await targetRun(targetConfig('moving-frame',1)),fixed=await targetRun(targetConfig('fixed-native',1));
  assert.equal(fixed.steps,186);assert.deepEqual(fixed.measurement.checkpoints,moving.measurement.checkpoints);assert.equal(fixed.state_sequence_hash,moving.state_sequence_hash);
  assert.equal(fixed.first_terminal.termination_reason,'non_foot_contact');assert.deepEqual(fixed.first_terminal.failure_bodies,['handL','handR']);
  for(const mutate of [r=>r.result={schema_version:2},r=>r.config.representation='moving-frame',r=>r.config.reference_experiment.actuation.stiffness=99,r=>r.schema_version=2,r=>delete r.end,r=>delete r.metrics,r=>r.metrics.drift_peak_m=-1,r=>r.steps++,r=>r.first_terminal.standing_time=60,r=>r.end.motor_tracking.pop(),r=>r.measurement.checkpoints.at(-1).bodies[0].rotation.x+=.1,r=>r.measurement.schema_version=2,r=>r.state_sequence_hash='bad',r=>r.measurement.telemetry.motor_effort=1,r=>r.end_reason='timeout']){
    const bad=structuredClone(fixed);mutate(bad);await assert.rejects(()=>validateTargetRun(bad));
  }
});

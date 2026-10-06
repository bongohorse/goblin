import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateTargetRun} from '../scripts/spherical-target52.js';
const source=JSON.parse(fs.readFileSync('docs/research/standing-lab/target-study52/fixed-native-1-1.json'));
test('target reader rejects nested unknown/nonfinite or mixed legacy fields',async()=>{
  for(const mutate of [r=>r.metrics.unrecorded_effort=NaN,r=>r.metrics.schema_version=2,r=>r.metrics.foot_load_peak_N.extra=Infinity,r=>r.contact_onsets[0].config={schema_version:2},r=>r.metrics.frames={x:1,y:0,z:0},r=>r.metrics.foot_load_peak_N.footR=NaN]){
    const report=structuredClone(source);mutate(report);await assert.rejects(()=>validateTargetRun(report));
  }
});
test('target reader rejects wrong study/model/frames, missing measurements, invalid peaks/terminal and nonfinite known fields',async()=>{
  for(const mutate of [r=>r.report_kind='motor-model-run-v1',r=>r.config.study_kind='motor-model-study',r=>r.config.reference_experiment.actuation.model='AccelerationBased',r=>r.config.reference_experiment.rig.bodies[0].rotation.x=.1,r=>r.config.coordinate_contract='euler',r=>r.measurement.config={},r=>delete r.measurement,r=>delete r.metrics.anchor_peak_m,r=>r.metrics.tracking_peak_rad=NaN,r=>r.metrics.foot_load_peak_N.footL=Infinity,r=>r.measurement.checkpoints[0].bodies[0].position.x=NaN,r=>r.measurement.physics_timing.mean=Infinity,r=>r.steps=NaN,r=>r.first_terminal.standing_time=Infinity,r=>r.end.motor_tracking[0].error_rad=NaN,r=>r.measurement.motor_commands_timing.count=0,r=>r.metrics.both_feet_loaded_fraction=1,r=>r.end.step=186,r=>r.contact_onsets.reverse()]){
    const report=structuredClone(source);mutate(report);await assert.rejects(()=>validateTargetRun(report));
  }
  await validateTargetRun(source);
});

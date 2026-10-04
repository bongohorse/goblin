import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateModelRun} from '../scripts/motor-model48.js';
const read=name=>JSON.parse(fs.readFileSync('docs/research/standing-lab/model-ab48/'+name+'.json'));
test('study reader rejects missing/corrupt comparison payload and first terminal',async()=>{
  const reference=read('AccelerationBased-1-numbers-normal-1');await validateModelRun(reference);
  for(const mutate of [r=>delete r.end,r=>delete r.metrics,r=>r.metrics.tracking_peak_rad=-1,r=>r.metrics.drift_peak_m=null,r=>r.metrics.both_feet_loaded_fraction=1,r=>r.end.step--,r=>r.end.drift_m=0,r=>r.end.foot_loads.footL=999,r=>r.end.motor_tracking.pop(),r=>r.first_terminal.standing_time=60,r=>r.contact_onsets[0].body='unknown',r=>r.contact_onsets.reverse()]){
    const r=structuredClone(reference);mutate(r);await assert.rejects(()=>validateModelRun(r));
  }
});
test('diagnostic reader checks horizon, invalid cause and first-contact chronology',async()=>{
  const reference=read('AccelerationBased-1-numbers-diagnostic-1');await validateModelRun(reference);
  for(const mutate of [r=>{r.end_reason='invalid_simulation';r.invalid=null;},r=>r.steps=3599,r=>r.first_terminal.failure_step=74,r=>r.first_terminal.failure_bodies=['head'],r=>r.end.joints.pop(),r=>r.end.pelvis_orientation.w=0,r=>r.metrics.anchor_peak_m=0,r=>r.end.motor_tracking[0].target=1]){
    const r=structuredClone(reference);mutate(r);await assert.rejects(()=>validateModelRun(r));
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {runCase} from '../scripts/motor-rig-cause.js';
const loaded={parts:['pelvis','torso','upperLegL','lowerLegL','footL'],joints:['spine','hipL','kneeL','ankleL'],cap:20,gravity:true,floor:true};
test('loaded five-body native chain reproduces a real limit breach independent of self-contact or angle oracle',()=>{
  const result=runCase({...loaded,id:'regression-no-self',noSelf:true});
  assert.equal(result.steps,70);assert.equal(result.termination.invalid,'constraint_error:kneeL');
  assert.ok(result.max_violation_rad>.054&&result.max_violation_rad<.055);
  assert.ok(result.max_oracle_difference_rad<1e-12);
  assert.equal(result.first_limit_crossing.step,51);
  const last=result.failure_window.at(-1),knee=last.joints.find(j=>j.id==='kneeL');
  assert.ok(knee.oracle.angle<-.104);assert.ok(knee.oracle.engine_angle<-.104);
  assert.ok(last.contacts.length>0);assert.ok(last.contacts.every(c=>c.a==='floor'&&c.b==='footL'));
});
test('isolated load-path counterfactuals bound the diagnosis without changing passive definitions',()=>{
  for(const variant of [{floor:false},{motors:'off'},{motors:'revolute'},{solver:32}]){
    const result=runCase({...loaded,...variant,id:'counterfactual'});
    assert.equal(result.steps,180);assert.ok(result.max_violation_rad<.05);
    assert.deepEqual(result.termination,{diagnostic_horizon:180});
  }
});

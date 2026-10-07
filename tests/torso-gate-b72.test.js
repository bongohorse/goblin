import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {derive,validate} from '../scripts/torso-gate-b72-budget.mjs';
import {validateAttribution} from '../scripts/torso-gate-b72-reader.mjs';
const p='docs/research/standing-lab/gate-b72/',c=JSON.parse(fs.readFileSync(p+'config.json')),r=JSON.parse(fs.readFileSync(p+'attribution.json'));
test('independent analytic controls and requirement sensitivity, not endpoint fit',()=>{assert.equal(validate().pass,true);const a=derive(c),b=derive({...c,tracking_angle_rad:c.tracking_angle_rad/2});assert.equal(b.coherent_bias_screen.torque_Nm,a.coherent_bias_screen.torque_Nm/2);assert.equal(a.engine_envelope,null);assert.equal(a.screen_inertia_kg_m2,a.torso_inertia_kg_m2[0]);});
test('stored fixed attribution reader and corruption discrimination',()=>{assert.equal(validateAttribution(r,c).valid,true);for(const mutate of [x=>x.cases.pop(),x=>x.cases[0].runs.pop(),x=>x.cases[0].runs[0].physical_H_error+=1e-6,x=>x.cases[0].runs[0].post[0].angular_velocity.x+=.01,x=>x.cases[1].runs[0].accumulators[1].x=0,x=>x.cases[0].runs[0].convergence[0].error.angular=1]){const bad=structuredClone(r);mutate(bad);assert.throws(()=>validateAttribution(bad,c));}});

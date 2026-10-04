import Ajv from 'ajv';
import schema from '../docs/research/standing-lab/model-result.schema.json' with {type:'json'};
import {canonical} from '../src/labs/standing/config.js';
import {rotationDistance} from '../src/labs/standing/math.js';
import {termination} from '../src/labs/standing/measurement.js';

// Reuse the exported measurement types; this reader adds cross-field checks,
// not a second simulation or new acceptance thresholds.
const ajv=new Ajv({strict:true}),telemetry=schema.properties.telemetry.anyOf[0].properties;
const endProperties={step:{type:'integer',minimum:0},drift_m:telemetry.drift,...Object.fromEntries(['foot_loads','pelvis_orientation','torso_orientation','motor_tracking','joints','contacts'].map(k=>[k,telemetry[k]]))};
const endValidator=ajv.compile({type:'object',additionalProperties:false,required:Object.keys(endProperties),properties:endProperties});
const terminalKeys=['termination_reason','failure_reason','failure_bodies','failure_body','failure_step','standing_time','invalid_detail'];
const terminalValidator=ajv.compile({type:'object',additionalProperties:false,required:terminalKeys,properties:Object.fromEntries(terminalKeys.map(k=>[k,schema.properties[k]]))});
const nonnegative=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const requireCheck=(condition,message)=>{if(!condition)throw Error('Invalid model payload: '+message);};
export function validateModelPayload(r){
  const rig=r.config.rig,m=r.metrics,e=r.end;
  requireCheck(!!m&&!!e&&endValidator(e)&&e.step===r.steps,'missing or wrong-step end measurements');
  const finite=value=>{if(typeof value==='number')return Number.isFinite(value);if(value&&typeof value==='object')return Object.values(value).every(finite);return true;};
  requireCheck(finite(e),'nonfinite end measurements');
  const peaks=['drift_peak_m','tracking_peak_rad','anchor_peak_m','limit_peak_rad','axis_peak'];
  requireCheck(peaks.every(k=>nonnegative(m[k]))&&['footL','footR'].every(k=>nonnegative(m.foot_load_peak_N?.[k])),'missing/nonfinite/negative peaks');
  requireCheck(Number.isInteger(m.both_feet_loaded_steps)&&m.both_feet_loaded_steps>=0&&m.both_feet_loaded_steps<=r.steps&&m.both_feet_loaded_fraction===(r.steps?m.both_feet_loaded_steps/r.steps:null),'support fraction');
  requireCheck(nonnegative(e.drift_m)&&m.drift_peak_m>=e.drift_m&&m.tracking_peak_rad>=Math.max(...e.motor_tracking.map(t=>t.error_rad))&&m.anchor_peak_m>=Math.max(...e.joints.map(j=>j.anchor_error))&&m.limit_peak_rad>=Math.max(...e.joints.map(j=>j.limit_violation??0))&&m.axis_peak>=Math.max(...e.joints.map(j=>j.axis_error??0)),'peak/end contradiction');
  requireCheck(['footL','footR'].every(k=>m.foot_load_peak_N[k]>=e.foot_loads[k]),'foot peak/end contradiction');
  for(const key of ['pelvis_orientation','torso_orientation'])requireCheck(Math.abs(Math.hypot(...Object.values(e[key]))-1)<=1e-4,'nonunit orientation');
  const jointIds=rig.joints.map(j=>j.id).sort();
  requireCheck(canonical(e.joints.map(j=>j.id).sort())===canonical(jointIds)&&canonical(e.motor_tracking.map(j=>j.joint_id).sort())===canonical(jointIds),'joint taxonomy');
  for(const t of e.motor_tracking){const j=rig.joints.find(j=>j.id===t.joint_id),o=e.joints.find(o=>o.id===j.id),target=r.config.actuation.targets.find(a=>a.id===j.id).target;
    requireCheck(t.kind===j.type&&canonical(t.target)===canonical(target)&&canonical(t.limits)===canonical(j.limits)&&t.configured_axis_cap_Nm===r.config.actuation.max_torque_Nm,'tracking config');
    if(j.type==='revolute')requireCheck(typeof t.actual==='number'&&typeof o.angle==='number'&&Math.abs(t.actual-o.angle)<=1e-8&&typeof o.limit_violation==='number'&&Math.abs(o.limit_violation-Math.max(0,j.limits[0]-t.actual,t.actual-j.limits[1]))<=1e-8,'hinge observation');
    else requireCheck(t.actual&&typeof t.actual==='object'&&Math.abs(Math.hypot(...Object.values(t.actual))-1)<=1e-4,'tracking quaternion');
    requireCheck(nonnegative(o.anchor_error)&&nonnegative(t.error_rad)&&Math.abs(t.error_rad-(j.type==='revolute'?Math.abs(target-t.actual):rotationDistance(target,t.actual)))<=1e-8,'tracking error');
  }
  for(const c of e.contacts){const body=rig.bodies.find(b=>b.id===c.body_id);requireCheck(body&&c.collider_id===body.collider_id&&c.distance<=0&&nonnegative(c.normal_impulse)&&typeof c.normal_load==='number','contact taxonomy/load');}
  requireCheck(e.foot_loads.status==='measured'&&['footL','footR'].every(k=>Math.abs(e.foot_loads[k]-e.contacts.filter(c=>c.body_id===k).reduce((sum,c)=>sum+c.normal_load,0))<=1e-8),'foot contact sum');
  requireCheck(Array.isArray(r.contact_onsets),'missing contact chronology');let previous=0;const seen=new Set();
  for(const c of r.contact_onsets){requireCheck(Number.isInteger(c.step)&&c.step>=1&&c.step<=r.steps&&c.step>=previous&&rig.bodies.some(b=>b.id===c.body)&&!seen.has(c.step+':'+c.body),'contact chronology');previous=c.step;seen.add(c.step+':'+c.body);}
  requireCheck(terminalValidator(r.first_terminal),'missing/invalid first terminal');
  const first=r.contact_onsets.find(c=>rig.bodies.find(b=>b.id===c.body).body_class!=='foot');
  if(first&&r.first_terminal.termination_reason!=='invalid_simulation'){const ids=r.contact_onsets.filter(c=>c.step===first.step&&rig.bodies.find(b=>b.id===c.body).body_class!=='foot').map(c=>({body_id:c.body}));requireCheck(canonical(r.first_terminal)===canonical(termination(ids,rig,first.step)),'first-contact terminal');}
  else requireCheck(['timeout','invalid_simulation'].includes(r.first_terminal.termination_reason)&&(!first||first.step===r.steps),'first terminal without contact or invalid precedence');
  if(r.mode==='normal'){
    requireCheck(canonical(r.first_terminal)===canonical(Object.fromEntries(terminalKeys.map(k=>[k,r.result[k]]))),'outer/inner first terminal');
    if(r.result.telemetry){const t=r.result.telemetry;requireCheck(e.drift_m===t.drift&&['foot_loads','pelvis_orientation','torso_orientation','motor_tracking','joints','contacts'].every(k=>canonical(e[k])===canonical(t[k])),'outer/inner end measurements');}
  }else {
    requireCheck(r.end_reason==='diagnostic_horizon'?r.steps===rig.max_steps&&r.invalid===null:r.end_reason==='invalid_simulation'&&typeof r.invalid==='string'&&r.invalid.length>0,'diagnostic horizon/invalid cause');
    if(r.first_terminal.termination_reason==='invalid_simulation')requireCheck(canonical(r.first_terminal)===canonical(termination([],rig,r.steps,r.invalid)),'invalid continuation');
    if(r.first_terminal.termination_reason==='timeout')requireCheck(canonical(r.first_terminal)===canonical(termination([],rig,r.steps)),'timeout terminal');
  }
  if(r.invalid===null)requireCheck(m.anchor_peak_m<=.08&&m.limit_peak_rad<=.05,'valid run exceeds existing guards');
}

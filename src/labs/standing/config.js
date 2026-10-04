import Ajv from 'ajv';
import baseline from '../../../docs/research/standing-lab/baseline-config.json' with {type:'json'};
import configSchema from '../../../docs/research/standing-lab/config.schema.json' with {type:'json'};
import resultSchema from '../../../docs/research/standing-lab/result.schema.json' with {type:'json'};
import motorResultSchema from '../../../docs/research/standing-lab/motor-result.schema.json' with {type:'json'};
import {validateMotorExperiment} from './motor-config.js';
import {freeze,norm,sub,add,rotate,vec,rotationDistance,multiply,conjugate} from './math.js';
const ajv=new Ajv({allErrors:true,strict:true});
const configValidator=ajv.compile(configSchema),resultValidator=ajv.compile(resultSchema);
const motorResultValidator=ajv.compile(motorResultSchema);
export const BASELINE=freeze(baseline);
export function validateConfig(input){
  if(!configValidator(input))throw Error('Invalid config: '+ajv.errorsText(configValidator.errors));
  const config=structuredClone(input),ids=new Set(config.bodies.map(b=>b.id));
  if(ids.size!==15||new Set(config.bodies.map(b=>b.collider_id)).size!==15||new Set(config.joints.map(j=>j.id)).size!==14)throw Error('Duplicate IDs');
  for(const b of config.bodies){const reference=BASELINE.bodies.find(r=>r.id===b.id);if(!reference||b.collider_id!==reference.collider_id||b.body_class!==reference.body_class)throw Error('Unknown body/collider taxonomy');}
  for(const j of config.joints){const reference=BASELINE.joints.find(r=>r.id===j.id);if(!reference||j.parent!==reference.parent||j.child!==reference.child||j.type!==reference.type)throw Error('Unknown joint topology');}
  if(config.bodies.filter(b=>b.body_class==='foot').map(b=>b.id).sort().join()!=='footL,footR')throw Error('Foot taxonomy');
  if(!['pelvis','torso','head'].every(id=>ids.has(id)))throw Error('Missing trunk');
  if(Object.values(config.floor.half).some(n=>n<=0)||config.floor.friction<0||config.floor.restitution<0||config.floor.restitution>1)throw Error('Invalid floor');
  for(const b of config.bodies){
    if(Math.abs(Math.hypot(...Object.values(b.rotation))-1)>1e-6)throw Error('Nonunit quaternion');
    if(b.shape.type==='cuboid'&&Object.values(b.shape.half).some(x=>x<=0))throw Error('Invalid cuboid');
    if(b.friction<0||b.linearDamping<0||b.angularDamping<0||b.restitution<0||b.restitution>1)throw Error('Invalid material/damping');
  }
  const byId=new Map(config.bodies.map(b=>[b.id,b]));const pairs=new Set();
  for(const j of config.joints){
    if(!ids.has(j.parent)||!ids.has(j.child)||j.parent===j.child)throw Error('Joint taxonomy');
    const pair=[j.parent,j.child].sort().join(':');if(pairs.has(pair))throw Error('Duplicate joint pair');pairs.add(pair);
    if(j.type==='revolute'&&(!j.limits||j.limits[0]>0||j.limits[1]<0||norm(sub(j.axis,vec(1)))>1e-8))throw Error('Hinge contract');
    if(j.type==='spherical'&&j.limits!==null)throw Error('Unsupported spherical limits');
    const a=byId.get(j.parent),b=byId.get(j.child);
    if(norm(sub(add(a.position,rotate(j.anchorA,a.rotation)),j.position))>1e-6||norm(sub(add(b.position,rotate(j.anchorB,b.rotation)),j.position))>1e-6)throw Error('Initial anchor conflict');
  }
  const reached=new Set(['pelvis']);for(let pass=0;pass<15;pass++)for(const j of config.joints){if(reached.has(j.parent))reached.add(j.child);if(reached.has(j.child))reached.add(j.parent);}
  if(reached.size!==15)throw Error('Disconnected rig');
  return freeze(config);
}
export function validateResult(result){
  const motor=result?.schema_version===2,validator=motor?motorResultValidator:resultValidator;
  if(!validator(result))throw Error('Invalid result: '+ajv.errorsText(validator.errors));
  if(motor)validateMotorExperiment(result.config);else validateConfig(result.config);
  const rig=motor?result.config.rig:result.config;
  if(result.fixed_dt!==rig.fixed_dt||canonical(result.solver_config)!==canonical(result.config.solver_config)||result.rig_id!==rig.rig_id||result.simulation_steps>rig.max_steps||Math.abs(result.observed_time-result.simulation_steps*result.fixed_dt)>1e-12)throw Error('Inconsistent result config/time');
  const ids=[...new Set(result.failure_bodies)].sort();
  if(canonical(ids)!==canonical(result.failure_bodies)||ids.some(id=>!rig.bodies.some(b=>b.id===id&&b.body_class==='non_foot')))throw Error('Inconsistent failure taxonomy');
  const reason=result.termination_reason;
  if(['non_foot_contact','invalid_start'].includes(reason)){
    if(!ids.length||result.failure_body!==ids[0]||result.failure_step!==result.simulation_steps||result.standing_time!==result.observed_time||result.failure_reason!==(reason==='invalid_start'?'invalid_start_contact':'non_foot_floor_contact')||(reason==='invalid_start'&&result.simulation_steps!==0))throw Error('Inconsistent contact termination');
  }else if(reason==='timeout'){
    if(result.simulation_steps!==rig.max_steps||ids.length||result.failure_body!==null||result.failure_step!==null||result.failure_reason!==null||result.standing_time!==result.observed_time)throw Error('Inconsistent timeout');
  }else if(result.standing_time!==null||ids.length||result.failure_body!==null)throw Error('Invalid/incomplete result cannot claim standing time');
  if(reason==='invalid_simulation'&&(!result.invalid_detail||result.failure_reason!=='invalid_simulation'))throw Error('Missing invalid cause');
  if(!/^config:sha256:[a-f0-9]{64}$/.test(result.config_id)||result.experiment_id!==(motor?'native-force-solver32-v2:':'passive-v1:')+result.config_id.slice(14))throw Error('Invalid config identity');
  const bodyIds=rig.bodies.map(b=>b.id).sort(),jointIds=rig.joints.map(j=>j.id).sort();
  const steps=result.checkpoints.map(c=>c.step);
  if(!steps.length||steps[0]!==0||steps.some((s,i)=>s>result.simulation_steps||(i>0&&s<=steps[i-1])))throw Error('Invalid checkpoint steps');
  const scheduled=[0,1,10,30,60];
  if(canonical(result.unreached_checkpoints)!==canonical(scheduled.filter(s=>!steps.includes(s))))throw Error('Inconsistent unreached checkpoints');
  for(const c of result.checkpoints){
    if(canonical(c.bodies.map(b=>b.id).sort())!==canonical(bodyIds)||c.bodies.some(b=>Math.abs(Math.hypot(...Object.values(b.rotation))-1)>1e-4))throw Error('Invalid checkpoint bodies');
    for(const contact of c.contacts){const b=rig.bodies.find(b=>b.id===contact.body_id);if(!b||b.collider_id!==contact.collider_id||contact.distance>0||(c.step===0?(contact.normal_load!==null||contact.normal_impulse!==null):(contact.normal_load===null||contact.normal_impulse===null||contact.normal_impulse<0)))throw Error('Invalid checkpoint contact');}
  }
  if(reason!=='invalid_simulation'){
    if(!result.telemetry||canonical(result.telemetry.joints.map(j=>j.id).sort())!==canonical(jointIds))throw Error('Missing telemetry');
    if(scheduled.filter(s=>s<=result.simulation_steps).some(s=>!steps.includes(s)))throw Error('Missing scheduled checkpoint');
    if(reason!=='incomplete'&&!steps.includes(result.simulation_steps))throw Error('Missing terminal checkpoint');
  }
  if(motor&&result.telemetry){
    const tracking=result.telemetry.motor_tracking;
    if(result.motor_commands_timing.count!==result.simulation_steps)throw Error('Motor command count mismatch');
    const latest=result.checkpoints.find(c=>c.step===result.simulation_steps);
    if(canonical(tracking.map(t=>t.joint_id).sort())!==canonical(jointIds))throw Error('Motor tracking taxonomy');
    for(const t of tracking){const j=rig.joints.find(j=>j.id===t.joint_id),target=result.config.actuation.targets.find(a=>a.id===t.joint_id).target;
      if(t.kind!==j.type||canonical(t.target)!==canonical(target)||canonical(t.limits)!==canonical(j.limits)||t.configured_axis_cap_Nm!==result.config.actuation.max_torque_Nm)throw Error('Motor tracking config mismatch');
      if(j.type==='revolute'){const observation=result.telemetry.joints.find(o=>o.id===j.id);if(typeof t.actual!=='number'||typeof observation.angle!=='number'||Math.abs(t.actual)>Math.PI||Math.abs(t.actual-observation.angle)>1e-8)throw Error('Motor hinge actual');
        if(typeof observation.limit_violation!=='number'||Math.abs(observation.limit_violation-Math.max(0,j.limits[0]-t.actual,t.actual-j.limits[1]))>1e-8)throw Error('Motor hinge limit error');
      }
      else {if(typeof t.actual!=='object'||Math.abs(Math.hypot(...Object.values(t.actual))-1)>1e-4)throw Error('Motor quaternion actual');
        // Frozen neutral rig has identity spherical bind frames. Verify recorded
        // tracking independently against the same-step body snapshot when present.
        if(latest){const a=latest.bodies.find(b=>b.id===j.parent),b=latest.bodies.find(b=>b.id===j.child);if(rotationDistance(t.actual,multiply(conjugate(a.rotation),b.rotation))>1e-8)throw Error('Motor actual/checkpoint mismatch');}
      }
      const error=j.type==='revolute'?Math.abs(target-t.actual):rotationDistance(target,t.actual);
      if(Math.abs(t.error_rad-error)>1e-8)throw Error('Motor tracking error mismatch');
    }
  }
  return result;
}
// Hash integrity requires Web Crypto; synchronous comparisons still enforce semantic completeness.
export async function validateResultProvenance(result){
  validateResult(result);const identity=await configIdentity(result.config);
  if(result.config_id!==identity.config_id||result.experiment_id!==identity.experiment_id)throw Error('Config hash mismatch');
  return result;
}
export function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
export async function configIdentity(config){const hash=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(config)));const hex=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');return {config_id:'config:sha256:'+hex,experiment_id:(config.schema_version===2?'native-force-solver32-v2:':'passive-v1:')+hex};}

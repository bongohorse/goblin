import {rotationDistance,norm,sub,freeze} from './math.js';
// Gate A tolerances; never inferred from results.
export const TOLERANCES=freeze({step:0,time:1e-12,position:1e-6,rotation:1e-6,linear_velocity:1e-6,angular_velocity:1e-6,contact_point:1e-6,contact_load:1e-5});
export function compareResults(reference,candidate){
  const errors=[],max={position:0,rotation:0,linear_velocity:0,angular_velocity:0,contact_point:0,contact_load:0};
  for(const key of ['config_id','experiment_id','termination_reason','failure_reason','failure_body','failure_step','simulation_steps'])if(reference[key]!==candidate[key])errors.push(key);
  for(const key of ['failure_bodies','unreached_checkpoints'])if(JSON.stringify(reference[key])!==JSON.stringify(candidate[key]))errors.push(key);
  if(reference.standing_time===null||candidate.standing_time===null){if(reference.standing_time!==candidate.standing_time)errors.push('standing_time');}else if(Math.abs(reference.standing_time-candidate.standing_time)>TOLERANCES.time)errors.push('standing_time');
  if(Math.abs(reference.observed_time-candidate.observed_time)>TOLERANCES.time)errors.push('observed_time');
  if(reference.checkpoints.length!==candidate.checkpoints.length)errors.push('checkpoint_count');
  for(const a of reference.checkpoints){
    const b=candidate.checkpoints.find(c=>c.step===a.step);if(!b){errors.push('missing_checkpoint:'+a.step);continue;}
    if(a.bodies.length!==b.bodies.length)errors.push('body_count:'+a.step);
    for(const body of a.bodies){const other=b.bodies.find(p=>p.id===body.id);if(!other){errors.push('missing_body:'+body.id);continue;}
      max.rotation=Math.max(max.rotation,rotationDistance(body.rotation,other.rotation));
      for(const key of ['position','linear_velocity','angular_velocity'])max[key]=Math.max(max[key],norm(sub(body[key],other[key])));
    }
    if(a.contacts.length!==b.contacts.length)errors.push('contact_count:'+a.step);
    for(let i=0;i<a.contacts.length;i++){const x=a.contacts[i],y=b.contacts[i];if(!y)continue;
      if(x.body_id!==y.body_id||x.collider_id!==y.collider_id)errors.push('contact_id:'+a.step);
      max.contact_point=Math.max(max.contact_point,norm(sub(x.point,y.point)),norm(sub(x.normal,y.normal)),Math.abs(x.distance-y.distance));
      for(const field of ['normal_load','normal_impulse']){if(x[field]===null||y[field]===null){if(x[field]!==y[field])errors.push('missing_load:'+a.step);}else max.contact_load=Math.max(max.contact_load,Math.abs(x[field]-y[field]));}
    }
  }
  for(const [key,value] of Object.entries(max))if(!Number.isFinite(value)||value>TOLERANCES[key])errors.push('tolerance:'+key);
  // Invalid numerical runs are never a passed repeatability gate.
  if(['invalid_simulation','incomplete','invalid_start'].includes(reference.termination_reason)||['invalid_simulation','incomplete','invalid_start'].includes(candidate.termination_reason))errors.push('invalid_run');
  return {pass:errors.length===0,errors,max_deviation:max};
}

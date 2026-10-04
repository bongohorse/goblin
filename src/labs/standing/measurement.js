import {vec,add,sub,scale,cross,point,jointObservation} from './math.js';

// floor is always requested first; flipped describes Rapier's internal manifold order.
export function floorContacts(world,floor,entries,initial=false){
  const contacts=[];
  for(const {spec,collider} of entries){
    if(initial){
      const c=collider.contactCollider(floor,0);
      if(c&&c.distance<=0)contacts.push({body_id:spec.id,collider_id:spec.collider_id,point:{...c.point1},normal:{...c.normal2},distance:c.distance,normal_impulse:null,normal_load:null});
    }else world.contactPair(floor,collider,(m,flipped)=>{
      const normal=scale(m.normal(),flipped?-1:1);
      for(let i=0;i<m.numContacts();i++){
        const distance=m.contactDist(i);if(distance>0)continue;
        const local=flipped?m.localContactPoint1(i):m.localContactPoint2(i);
        const impulse=m.contactImpulse(i);
        if(!local||!Number.isFinite(distance)||!Number.isFinite(impulse)||impulse<0||!Object.values(normal).every(Number.isFinite))throw Error('Invalid contact measurement');
        const q=collider.rotation(),p=collider.translation();
        // Collider-local points, not body-local; body mass centre may be offset.
        const worldPoint=point({rotation:()=>q,translation:()=>p},local);
        contacts.push({body_id:spec.id,collider_id:spec.collider_id,point:worldPoint,normal,distance,normal_impulse:impulse,normal_load:impulse/world.timestep*normal.y});
      }
    });
  }
  return contacts.sort((a,b)=>a.body_id.localeCompare(b.body_id)||a.point.x-b.point.x||a.point.y-b.point.y||a.point.z-b.point.z);
}

export function centreOfMass(entries){
  let mass=0,com=vec(),velocity=vec();
  for(const {body} of entries){const m=body.mass(),c=body.worldCom();mass+=m;com=add(com,scale(c,m));const v=add(body.linvel(),cross(body.angvel(),sub(c,body.translation())));velocity=add(velocity,scale(v,m));}
  if(!Number.isFinite(mass)||mass<=0)throw Error('Unavailable COM');
  return {com:scale(com,1/mass),com_velocity:scale(velocity,1/mass)};
}

export function observe(sim,initial=false){
  const entries=[...sim.bodies.values()],centre=centreOfMass(entries),contacts=floorContacts(sim.world,sim.floor,entries,initial);
  const origin=sim.initialCom??centre.com;
  const loads={status:initial?'unmeasured':'measured',footL:initial?null:0,footR:initial?null:0};
  if(!initial)for(const c of contacts)if(c.body_id==='footL'||c.body_id==='footR')loads[c.body_id]+=c.normal_load;
  return {...centre,drift:Math.hypot(centre.com.x-origin.x,centre.com.z-origin.z),pelvis_orientation:{...sim.bodies.get('pelvis').body.rotation()},torso_orientation:{...sim.bodies.get('torso').body.rotation()},contacts,foot_loads:loads,joints:[...sim.joints.values()].map(jointObservation),motor_tracking:'not_applicable',motor_saturation:'not_applicable'};
}

export function termination(contacts,config,step,invalid=null){
  if(invalid)return {termination_reason:'invalid_simulation',failure_reason:'invalid_simulation',failure_bodies:[],failure_body:null,failure_step:step,standing_time:null,invalid_detail:invalid};
  const nonFoot=new Set(config.bodies.filter(b=>b.body_class!=='foot').map(b=>b.id));
  const ids=[...new Set(contacts.filter(c=>nonFoot.has(c.body_id)).map(c=>c.body_id))].sort();
  if(ids.length)return {termination_reason:step===0?'invalid_start':'non_foot_contact',failure_reason:step===0?'invalid_start_contact':'non_foot_floor_contact',failure_bodies:ids,failure_body:ids[0],failure_step:step,standing_time:step*config.fixed_dt,invalid_detail:step===0?'Non-foot floor contact in initial pose':null};
  if(step>=config.max_steps)return {termination_reason:'timeout',failure_reason:null,failure_bodies:[],failure_body:null,failure_step:null,standing_time:step*config.fixed_dt,invalid_detail:null};
  return null;
}

export function timingStats(samples){
  if(!samples.length)return {count:0,min:null,mean:null,p95:null,max:null};
  const sorted=[...samples].sort((a,b)=>a-b);
  return {count:sorted.length,min:sorted[0],mean:samples.reduce((a,b)=>a+b,0)/samples.length,p95:sorted[Math.ceil(sorted.length*.95)-1],max:sorted.at(-1)};
}

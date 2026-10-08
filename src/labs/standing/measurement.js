import {vec,add,scale,point,jointObservation,rotate,conjugate} from './math.js';

export const MEASUREMENT_VERSION='current-geometry-interval-support-v2';
const sorted=contacts=>contacts.sort((a,b)=>a.body_id.localeCompare(b.body_id)||a.point.x-b.point.x||a.point.y-b.point.y||a.point.z-b.point.z);
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const subtract=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const posePoint=(collider,local)=>point({rotation:()=>collider.rotation(),translation:()=>collider.translation()},local);
function finiteContact(value){if(typeof value==='number'&&!Number.isFinite(value))throw Error('Invalid contact measurement');if(value&&typeof value==='object')Object.values(value).forEach(finiteContact);}

function topPlaneGeometry(floor,collider){
  const unit=q=>{const n=Math.hypot(q.x,q.y,q.z,q.w);return {x:q.x/n,y:q.y/n,z:q.z/n,w:q.w/n};};
  const fq=unit(floor.rotation()),q=unit(collider.rotation()),up=rotate({x:0,y:1,z:0},fq),n=rotate(up,conjugate(q)),shape=collider.shapeType();
  let local;
  if(shape===0)local=scale(n,-collider.radius());
  else if(shape===2){local=scale(n,-collider.radius());local.y-=Math.sign(n.y)*collider.halfHeight();}
  else if(shape===1){const h=collider.halfExtents();local={x:-Math.sign(n.x)*h.x,y:-Math.sign(n.y)*h.y,z:-Math.sign(n.z)*h.z};}
  else throw Error('Unsupported observer shape');
  const bodyPoint=add(collider.translation(),rotate(local,q)),floorCentre=floor.translation(),half=floor.halfExtents(),distance=dot(subtract(bodyPoint,floorCentre),up)-half.y,floorPoint=add(bodyPoint,scale(up,-distance));
  // Authored large static floor; reject edge/below-floor ambiguity rather than invent contact.
  const centreLocal=rotate(subtract(collider.translation(),floorCentre),conjugate(fq)),bound=shape===1?Math.hypot(...Object.values(collider.halfExtents())):shape===2?collider.halfHeight()+collider.radius():collider.radius();
  if(Math.abs(centreLocal.x)+bound>=half.x||Math.abs(centreLocal.z)+bound>=half.z)throw Error('Observer floor-edge domain');
  const centreHeight=dot(subtract(collider.translation(),floorCentre),up),extent=centreHeight-(distance+half.y);
  if(centreHeight+extent < -half.y)return null;
  return {distance,body_point:bodyPoint,floor_point:floorPoint,normal:up};
}

// Static flat floor only. Query uses CURRENT collider poses, never cached contactDist.
// Impulses belong to the LAST COMPLETED step; do not filter them by POST touching.
export function floorObservation(world,floor,entries,initial=false){
  const bodies=[],contacts=[];
  for(const {spec,collider} of entries){
    const query=collider.contactCollider(floor,0);
    const query_geometry=query?{distance:query.distance,body_point:{...query.point1},floor_point:{...query.point2},normal:{...query.normal2}}:null;
    const plane=topPlaneGeometry(floor,collider),geometry=plane&&plane.distance<=0?plane:null;
    const touching=geometry!==null&&geometry.distance<=0,candidates=[],solver_contacts=[];
    let normalImpulse=0,verticalImpulse=0;
    if(!initial)world.contactPair(floor,collider,(m,flipped)=>{
      const normal=scale({...m.normal()},flipped?-1:1);
      for(let i=0;i<m.numContacts();i++){
        const localBody={...(flipped?m.localContactPoint1(i):m.localContactPoint2(i))},localFloor={...(flipped?m.localContactPoint2(i):m.localContactPoint1(i))},bodyPoint=posePoint(collider,localBody),floorPoint=posePoint(floor,localFloor),impulse=m.contactImpulse(i);
        if(impulse<0)throw Error('Invalid contact impulse');
        candidates.push({cached_distance:m.contactDist(i),local_body:localBody,local_floor:localFloor,current_body_point:bodyPoint,current_floor_point:floorPoint,current_anchor_gap:dot(subtract(bodyPoint,floorPoint),normal),interval_normal:normal,interval_normal_impulse:impulse});
        normalImpulse+=impulse;verticalImpulse+=impulse*normal.y;
      }
      for(let i=0;i<m.numSolverContacts();i++)solver_contacts.push({cached_distance:m.solverContactDist(i),current_midpoint:{...m.solverContactPoint(i)}});
    });
    const row={body_id:spec.id,collider_id:spec.collider_id??'collider:'+spec.id,current_geometry:geometry,query_geometry,current_touching:touching,candidates,solver_contacts,interval_normal_impulse:initial?null:normalImpulse,interval_vertical_mean_load:initial?null:verticalImpulse/world.timestep};
    finiteContact(row);bodies.push(row);
    if(touching)contacts.push({body_id:row.body_id,collider_id:row.collider_id,point:geometry.body_point,normal:geometry.normal,distance:geometry.distance,normal_impulse:row.interval_normal_impulse,normal_load:row.interval_vertical_mean_load});
  }
  return {measurement_version:MEASUREMENT_VERSION,geometry_time:'current_pose',impulse_time:initial?'unmeasured':'last_completed_step',dt:world.timestep,bodies,contacts:sorted(contacts)};
}
export function floorContacts(world,floor,entries,initial=false){return floorObservation(world,floor,entries,initial).contacts;}

export function centreOfMass(entries){
  let mass=0,com=vec(),velocity=vec();
  // Rapier linvel is already the velocity at worldCom, including offset mass centres.
  for(const {body} of entries){const m=body.mass(),c=body.worldCom();mass+=m;com=add(com,scale(c,m));velocity=add(velocity,scale(body.linvel(),m));}
  if(!Number.isFinite(mass)||mass<=0)throw Error('Unavailable COM');
  return {com:scale(com,1/mass),com_velocity:scale(velocity,1/mass)};
}

export function observe(sim,initial=false){
  const entries=[...sim.bodies.values()],centre=centreOfMass(entries),floor_observation=floorObservation(sim.world,sim.floor,entries,initial),contacts=floor_observation.contacts;
  const origin=sim.initialCom??centre.com;
  const loads={status:initial?'unmeasured':'measured',footL:initial?null:0,footR:initial?null:0};
  if(!initial)for(const b of floor_observation.bodies)if(b.body_id==='footL'||b.body_id==='footR')loads[b.body_id]=b.interval_vertical_mean_load;
  return {...centre,floor_observation,drift:Math.hypot(centre.com.x-origin.x,centre.com.z-origin.z),pelvis_orientation:{...sim.bodies.get('pelvis').body.rotation()},torso_orientation:{...sim.bodies.get('torso').body.rotation()},contacts,foot_loads:loads,joints:[...sim.joints.values()].map(jointObservation),motor_tracking:'not_applicable',motor_saturation:'not_applicable'};
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

// Stored-only independent horizontal-plane geometry and interval-impulse audit.
// No Rapier, runner, model or runtime observer imports.
import assert from 'node:assert/strict';
const V=o=>[o.x,o.y,o.z],dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]);
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<=t,'floor redundancy '+a+' vs '+b);
const vector=(a,b,t=1e-6)=>a.forEach((x,i)=>near(x,b[i],t));
function matrix(q){const n=Math.hypot(q.x,q.y,q.z,q.w),x=q.x/n,y=q.y/n,z=q.z/n,w=q.w/n;assert.ok(n>0);return [[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]];}
const mv=(m,v)=>m.map(r=>dot(r,v));
export function independentPlane(body,floor){
 assert.deepEqual(floor.rotation,{x:0,y:0,z:0,w:1});const M=matrix(body.collider_rotation),n=M[1],s=body.observed_shape,p=V(body.collider_position),local=s.type==='ball'?n.map(x=>-s.radius*x):s.type==='capsule'?n.map((x,i)=>-s.radius*x-(i===1?Math.sign(x)*s.half:0)):n.map((x,i)=>-Math.sign(x)*V(s.half)[i]);
 const witness=add(p,mv(M,local)),top=floor.position.y+floor.half.y,gap=witness[1]-top,extent=p[1]-witness[1];
 // A top-plane observer is valid only inside this fixed floor footprint.
 const bound=s.type==='cuboid'?Math.hypot(...V(s.half)):s.type==='capsule'?s.half+s.radius:s.radius;
 assert.ok(Math.abs(p[0]-floor.position.x)+bound<floor.half.x&&Math.abs(p[2]-floor.position.z)+bound<floor.half.z,'observer floor-edge domain');
 if(p[1]+extent<floor.position.y-floor.half.y)return null;
 return {gap,witness,floorPoint:[witness[0],top,witness[2]]};
}
export function checkFloorState(s){
 const o=s.floor_observation,floor=s.settings.floor;assert.equal(o.measurement_version,'current-geometry-interval-support-v2');assert.equal(o.geometry_time,'current_pose');assert.equal(o.impulse_time,s.step===0?'unmeasured':'last_completed_step');assert.equal(o.dt,s.settings.dt);assert.deepEqual(o.bodies.map(b=>b.body_id),s.bodies.map(b=>b.id));assert.deepEqual(o.contacts,s.floor_contacts);
 const rebuilt=[];
 for(const b of s.bodies){const r=o.bodies.find(r=>r.body_id===b.id),g=independentPlane(b,floor),touch=!!g&&g.gap<=0;assert.equal(r.collider_id,'collider:'+b.id);assert.equal(r.current_touching,touch);assert.equal(r.current_geometry!==null,touch);
  if(touch){near(r.current_geometry.distance,g.gap,1e-12);vector(V(r.current_geometry.body_point),g.witness,1e-12);vector(V(r.current_geometry.floor_point),g.floorPoint,1e-12);assert.deepEqual(r.current_geometry.normal,{x:0,y:1,z:0});rebuilt.push({body_id:b.id,collider_id:r.collider_id,point:r.current_geometry.body_point,normal:r.current_geometry.normal,distance:r.current_geometry.distance,normal_impulse:r.interval_normal_impulse,normal_load:r.interval_vertical_mean_load});}
  if(r.query_geometry){const q=r.query_geometry;assert.ok(q.body_point.y>=g.gap+floor.position.y+floor.half.y-1e-6);near(q.floor_point.y,floor.position.y+floor.half.y);near(dot(sub(V(q.body_point),V(q.floor_point)),V(q.normal)),q.distance);}
  const expected=[];for(const m of s.floor_manifolds.filter(m=>m.body_id===b.id))for(const c of m.contacts)expected.push({cached_distance:c.distance,local_body:m.flipped?c.local1:c.local2,local_floor:m.flipped?c.local2:c.local1,normal:V(m.normal).map(x=>x*(m.flipped?-1:1)),impulse:c.impulse});assert.equal(r.candidates.length,expected.length);let impulse=0,vertical=0;
  r.candidates.forEach((c,i)=>{const e=expected[i];assert.equal(c.cached_distance,e.cached_distance);assert.deepEqual(c.local_body,e.local_body);assert.deepEqual(c.local_floor,e.local_floor);vector(V(c.interval_normal),e.normal,0);assert.equal(c.interval_normal_impulse,e.impulse);assert.ok(e.impulse>=0);const bp=add(V(b.collider_position),mv(matrix(b.collider_rotation),V(c.local_body))),fp=add(V(floor.position),V(c.local_floor));vector(V(c.current_body_point),bp);vector(V(c.current_floor_point),fp);near(c.current_anchor_gap,dot(sub(bp,fp),e.normal));impulse+=e.impulse;vertical+=e.impulse*e.normal[1];});
  if(s.step===0){assert.equal(r.interval_normal_impulse,null);assert.equal(r.interval_vertical_mean_load,null);assert.equal(r.candidates.length,0);assert.equal(r.solver_contacts.length,0);}else{near(r.interval_normal_impulse,impulse,1e-12);near(r.interval_vertical_mean_load,vertical/s.settings.dt,1e-10);}
 }
 rebuilt.sort((a,b)=>a.body_id.localeCompare(b.body_id));assert.deepEqual(rebuilt,s.floor_contacts);
}

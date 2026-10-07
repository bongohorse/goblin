// Independent matrix/impulse oracle: Three.js math, not controller quaternion/vector helpers.
import {Matrix3,Matrix4,Quaternion,Vector3} from 'three';
export const V=v=>new Vector3(v.x,v.y,v.z);
export const Q=q=>new Quaternion(q.x,q.y,q.z,q.w).normalize();
export const record=v=>({x:v.x,y:v.y,z:v.z});
export const axis=(x,y,z,a)=>new Quaternion().setFromAxisAngle(new Vector3(x,y,z),a);
const diag=i=>new Matrix3().set(i.x,0,0,0,i.y,0,0,0,i.z);
export function tensor(q,frame,i){const r=new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromQuaternion(Q(q).multiply(Q(frame))));return r.clone().multiply(diag(i)).multiply(r.clone().transpose());}
export function capsule(s){const {mass:m,half:h,radius:r}=s,mc=m*2*h/(2*h+4*r/3),ms=m-mc,t=mc*(r*r/4+h*h/3)+ms*(.4*r*r+h*h+.75*h*r);return {x:t,y:.5*mc*r*r+.4*ms*r*r,z:t};}
const skew=r=>new Matrix3().set(0,-r.z,r.y,r.z,0,-r.x,-r.y,r.x,0);
export function constrained(a,b,tau,dt){
  const ia=tensor(a.rotation,a.principal_frame,a.inertia).invert(),ib=tensor(b.rotation,b.principal_frame,b.inertia).invert(),ra=V(a.anchor).applyQuaternion(Q(a.rotation)),rb=V(b.anchor).applyQuaternion(Q(b.rotation));
  const wa=V(tau).applyMatrix3(ia).multiplyScalar(dt),wb=V(tau).negate().applyMatrix3(ib).multiplyScalar(dt);
  const k=new Matrix3().identity().multiplyScalar(1/a.mass+1/b.mass);
  for(const [r,i] of [[ra,ia],[rb,ib]]){const m=skew(r).multiply(i).multiply(skew(r));k.elements=k.elements.map((v,j)=>v-m.elements[j]);}
  const j=wa.clone().cross(ra).sub(wb.clone().cross(rb)).applyMatrix3(k.invert()).negate();
  return {torso_angular:record(wa.add(ra.clone().cross(j).applyMatrix3(ia))),partner_angular:record(wb.sub(rb.clone().cross(j).applyMatrix3(ib))),torso_linear:record(j.clone().divideScalar(a.mass)),partner_linear:record(j.clone().multiplyScalar(-1/b.mass)),constraint_impulse_Ns:record(j)};
}
export function momentum(state,frames=state){return state.reduce((sum,s,j)=>sum.add(V(s.angular_velocity).applyMatrix3(tensor(frames[j].rotation,frames[j].principal_frame,frames[j].inertia))).add(V(frames[j].world_com).cross(V(s.linear_velocity).multiplyScalar(s.mass))),new Vector3());}
export function rotationBound(pre,post){return pre.reduce((sum,a,j)=>sum+2*Math.max(a.inertia.x,a.inertia.y,a.inertia.z)*Math.sin(Math.min(Math.PI/2,Q(a.rotation).angleTo(Q(post[j].rotation))))*V(post[j].angular_velocity).length(),0);}
export function tiltOracle(q){const u=new Vector3(0,1,0).applyMatrix4(new Matrix4().makeRotationFromQuaternion(Q(q)));return Math.acos(Math.max(-1,Math.min(1,u.y)));}

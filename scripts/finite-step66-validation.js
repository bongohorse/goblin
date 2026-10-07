import {Quaternion,Vector3} from 'three';
import {integrate,initialState,decode,derivative,invariants,difference,av,aq,ov,add,sub,mul,cross,dot,length,rotate,inertia,normalize,oq} from './finite-step66-reference.js';
export const RESOLUTIONS=[8,16,32,64,128];
export const REF_LIMITS={velocity:1e-10,rotation:1e-10,position:1e-11,conservation:1e-10,anchor:1e-10,analytic:1e-11};
const zero={x:0,y:0,z:0};
function convergence(bodies,tau,T,connected){const runs=RESOLUTIONS.map(n=>integrate(bodies,tau,T,n,connected)),pairs=runs.slice(1).map((r,j)=>({coarse:RESOLUTIONS[j],fine:r.n,...difference(r.bodies,runs[j].bodies)}));const c=pairs.at(-1);return {runs,pairs,pass:c.angular<=REF_LIMITS.velocity&&c.linear<=REF_LIMITS.velocity&&c.rotation<=REF_LIMITS.rotation&&c.position<=REF_LIMITS.position};}
export function validateReference(seed,T){
  const cases=[];
  for(const kind of ['static','isotropic','principal-axis','free-gyro','connected-static','connected-moving']){
    const b=structuredClone(seed),connected=kind.startsWith('connected');for(const s of b){s.rotation=oq(normalize(aq(s.rotation)));s.angular_velocity={...zero};s.linear_velocity={...zero};}
    let tau=[[0,0,0],[0,0,0]],expected=null;
    if(kind==='isotropic'){for(const s of b){s.inertia={x:.04,y:.04,z:.04};s.principal_frame={x:0,y:0,z:0,w:1};}b[0].angular_velocity={x:.2,y:0,z:0};tau[0]=[.15,0,0];const q=new Quaternion(b[0].rotation.x,b[0].rotation.y,b[0].rotation.z,b[0].rotation.w).normalize(),angle=.2*T+.5*.15/.04*T*T;const endq=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),angle).multiply(q);expected=structuredClone(b);expected[0].rotation={x:endq.x,y:endq.y,z:endq.z,w:endq.w};expected[0].angular_velocity={x:.2+.15/.04*T,y:0,z:0};}
    if(kind==='principal-axis'){const q=new Quaternion(b[0].rotation.x,b[0].rotation.y,b[0].rotation.z,b[0].rotation.w).normalize(),frame=new Quaternion(b[0].principal_frame.x,b[0].principal_frame.y,b[0].principal_frame.z,b[0].principal_frame.w).normalize(),axis=new Vector3(0,1,0).applyQuaternion(q.clone().multiply(frame));tau[0]=axis.clone().multiplyScalar(.15).toArray();const omega=axis.clone().multiplyScalar(.15/b[0].inertia.y*T),angle=.5*.15/b[0].inertia.y*T*T,endq=new Quaternion().setFromAxisAngle(axis,angle).multiply(q);expected=structuredClone(b);expected[0].rotation={x:endq.x,y:endq.y,z:endq.z,w:endq.w};expected[0].angular_velocity={x:omega.x,y:omega.y,z:omega.z};}
    if(kind==='free-gyro'){b[0].angular_velocity={x:.3,y:-.4,z:.2};b[1].angular_velocity={x:-.1,y:.2,z:.15};}
    if(kind==='connected-moving'){b[0].angular_velocity={x:.3,y:-.2,z:.1};b[1].angular_velocity={x:-.1,y:.2,z:.15};const r=b.map(s=>rotate(aq(s.rotation),av(s.anchor))),d=sub(cross(av(b[1].angular_velocity),r[1]),cross(av(b[0].angular_velocity),r[0]));b[0].linear_velocity=ov(mul(d,b[1].mass/(b[0].mass+b[1].mass)));b[1].linear_velocity=ov(mul(d,-b[0].mass/(b[0].mass+b[1].mass)));tau=[[.1,-.03,.06],[-.1,.03,-.06]];}
    const initial=decode(initialState(b,connected),b),start=invariants(initial),c=convergence(b,tau,T,connected),end=c.runs.at(-1),inv=invariants(end.bodies),expectedH=mul(add(tau[0],tau[1]),T),momentum_error=length(sub(sub(inv.H,start.H),expectedH)),energy_work_error=Math.abs(inv.E-start.E-end.work_J);
    const dy=derivative(initialState(b,connected),b,tau,connected),acc=b.map((s,j)=>{const k=13*j,q=aq(initial[j].rotation),r=rotate(q,av(s.anchor)),w=av(s.angular_velocity);return add(add(dy.slice(k+3,k+6),cross(dy.slice(k+10,k+13),r)),cross(w,cross(w,r)));}),constraint_acceleration_error=connected?length(sub(acc[0],acc[1])):0;
    const analytic=expected?difference(end.bodies,expected):kind==='static'||kind==='connected-static'?difference(end.bodies,initial):null;
    const pass=c.pass&&momentum_error<=REF_LIMITS.conservation&&energy_work_error<=REF_LIMITS.conservation&&(!connected||(inv.anchor_gap_m<=REF_LIMITS.anchor&&inv.anchor_speed_m_s<=REF_LIMITS.anchor&&constraint_acceleration_error<=REF_LIMITS.conservation))&&(!analytic||Object.values(analytic).every(v=>v<=REF_LIMITS.analytic));
    cases.push({kind,T,connected,initial,torques:tau,convergence:c.pairs,end,initial_invariants:start,end_invariants:inv,momentum_error,energy_work_error,constraint_acceleration_error,analytic,pass});
  }
  return {method:'independent-double-newton-euler-rk4-v1',limits:REF_LIMITS,resolutions:RESOLUTIONS,cases,pass:cases.every(c=>c.pass)};
}
export function referenceForCase(original,T){const tau=av(original.requested_world_Nm);return convergence(original.pre,[tau,original.missing_reaction?[0,0,0]:mul(tau,-1)],T,original.connected);}

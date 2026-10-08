// Frozen Issue83 mechanics. Pure: no Rapier import or world allocation.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {encodeTorque,exactWithinCap} from './review-actuation74.mjs';
export const PLAN_HEAD='adb784c17b8bf03a027c2300f57ee6d17456500c';
export const PLAN=JSON.parse(fs.readFileSync(new URL('../docs/research/standing-lab/fullrig83/plan.json',import.meta.url)));
export const RIG=JSON.parse(fs.readFileSync(new URL('../docs/research/standing-lab/baseline-config.json',import.meta.url)));
export const hash=b=>createHash('sha256').update(b).digest('hex');
export const v=o=>[o.x,o.y,o.z],obj=a=>({x:a[0],y:a[1],z:a[2]});
export const plus=(a,b)=>a.map((x,i)=>x+b[i]),minus=(a,b)=>a.map((x,i)=>x-b[i]),times=(a,k)=>a.map(x=>x*k),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),norm=a=>Math.hypot(...a),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const mul=(a,b)=>({x:a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,y:a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,z:a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,w:a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z});
export const axis=(a,t)=>({x:a==='X'?Math.sin(t/2):0,y:a==='Y'?Math.sin(t/2):0,z:a==='Z'?Math.sin(t/2):0,w:Math.cos(t/2)});
export function rot(a,q){const n=Math.hypot(q.x,q.y,q.z,q.w);q={x:q.x/n,y:q.y/n,z:q.z/n,w:q.w/n};const u=[q.x,q.y,q.z],t=times(cross(u,a),2);return plus(a,plus(times(t,q.w),cross(u,t)));}
export function startRotation(caseId){const c=PLAN.cases.find(c=>c.id===caseId);if(!c)throw Error('Unknown start');return mul(axis('Y',c.yaw),c.axis?axis(c.axis,c.tilt):{x:0,y:0,z:0,w:1});}
export function initialBody(spec,caseId){const q=startRotation(caseId),p=PLAN.initial_pivot_m;return {position:obj(plus(p,rot(minus(v(spec.position),p),q))),rotation:mul(q,spec.rotation)};}
export function law(q,omega,fault=null){const u=rot([0,1,0],q),c=cross(u,[0,1,0]),s=norm(c),theta=Math.atan2(s,u[1]),e=s?times(c,theta/s):[0,0,0],wperp=minus(omega,times(u,dot(u,omega)));if(theta>PLAN.controller.domain_rad)throw Error('torso_domain');const raw=minus(times(e,PLAN.controller.kp_Nm_per_rad*(fault==='wrong-sign'?-1:1)),times(wperp,PLAN.controller.kd_Nm_s_per_rad));const n=norm(raw),C=PLAN.controller.cap_Nm;let bounded=n>C?times(raw,C/n):raw.slice();while(norm(bounded)>C||!exactWithinCap(bounded,C))bounded=bounded.map(x=>x*(1-Number.EPSILON));const encoded=encodeTorque(bounded,C);return {up:u,theta,error:e,wperp,raw,bounded,encoded,pelvis:fault==='missing-reaction'?[0,0,0]:encoded.map(x=>x===0?0:-x),cap_ratio:n/C,encoding_delta:minus(encoded,bounded),encoded_axial:dot(encoded,u)};}
export function shapeInertia(spec){const m=spec.mass,s=spec.shape;if(s.type==='ball')return [1,1,1].map(()=>2*m*s.radius*s.radius/5);if(s.type==='cuboid'){const a=v(s.half);return a.map((_,i)=>m*(a[(i+1)%3]**2+a[(i+2)%3]**2)/3);}const r=s.radius,h=s.half,mc=m*2*h/(2*h+4*r/3),ms=m-mc,x=mc*(r*r/4+h*h/3)+ms*(2*r*r/5+h*h+3*h*r/4),y=mc*r*r/2+2*ms*r*r/5;return [x,y,x];}
export function positiveCommandFault(pre,torso,pelvis){const expected=law(pre.rotation,v(pre.angular_velocity));if(JSON.stringify(torso)!==JSON.stringify(expected.encoded))return 'torso_command';if(JSON.stringify(pelvis)!==JSON.stringify(expected.pelvis))return 'pelvis_reaction';return null;}
export function frozenConfig(){return {schema_version:1,namespace:'fullrig-torso-pelvis-ab-v1',plan_head:PLAN_HEAD,plan:PLAN,rig:RIG,phase_version:'immutable-pre-wake-clear-native-add-readback-step-post-clear-v1',encoding_version:'bounded-toward-zero-f32-v1',native_effort:null,engine_precision:'indeterminate_not_certified',standing_approval:false};}

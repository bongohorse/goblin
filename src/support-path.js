import {Quaternion,Vector3,Euler,Matrix4} from 'three';
import {worldAnchor,rotateVector} from './goblin-rig.js';
import {armIK} from './contact-getup.js';
const inverse=q=>({x:-q.x,y:-q.y,z:-q.z,w:q.w});
const rx=x=>({x:Math.sin(x/2),y:0,z:0,w:Math.cos(x/2)});
const add=(...vs)=>vs.reduce((p,v)=>({x:p.x+v.x,y:p.y+v.y,z:p.z+v.z}),{x:0,y:0,z:0});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
export function captureSupports(rig){return {
 hands:Object.fromEntries(['L','R'].map(s=>[s,{...rig.byId.get('hand'+s).body.translation()}])),
 feet:Object.fromEntries(['L','R'].map(s=>{const e=rig.byId.get('foot'+s);return [s,{position:{...e.body.translation()},rotation:{...e.body.rotation()},ankle:worldAnchor(e.body,rig.joints.get('ankle'+s).spec.anchorB)}];})),
};}
export function supportPose(rig,supports,pose,reserve=.04){
 if(![...Object.values(pose.position),pose.pitch,pose.spine,pose.neck,pose.yaw??0,pose.roll??0].every(Number.isFinite))return {feasible:false,reasons:['non-finite-pose'],motors:{},limbs:{},pose};
 const rotation=new Quaternion().setFromEuler(new Euler(pose.pitch,pose.yaw||0,pose.roll||0,'XYZ')),torsoRotation=rotation.clone().multiply(new Quaternion().copy(rx(pose.spine))),headRotation=torsoRotation.clone().multiply(new Quaternion().copy(rx(pose.neck)));
 const torso=add(pose.position,rotateVector({x:0,y:.2,z:0},rotation),rotateVector({x:0,y:.15,z:0},torsoRotation));
 const head=add(torso,rotateVector({x:0,y:.34,z:0},torsoRotation),rotateVector({x:0,y:.47,z:0},headRotation));
 const motors={spine:pose.spine,neck:pose.neck},limbs={},reasons=[];
 if(Math.abs(pose.spine)>.3||Math.abs(pose.neck)>.45)reasons.push('central-joint-limit');
 for(const s of ['L','R']){
  const hip=add(pose.position,rotateVector(rig.joints.get('hip'+s).spec.anchorA,rotation));
  const local=rotateVector(sub(supports.feet[s].ankle,hip),inverse(rotation));
  const reach=Math.hypot(local.x,local.y,local.z);
  if(reach<1e-6||!Number.isFinite(reach)){reasons.push('degenerate-leg-'+s);continue;}
  const direction=new Vector3(local.x,local.y,local.z).normalize();
  const r=Math.max(Math.sqrt(.32+.32*Math.cos(2.3)),Math.min(.798,reach)),along=r/2,height=Math.sqrt(Math.max(0,.16-along*along));
  const footX=rotateVector(rotateVector({x:1,y:0,z:0},supports.feet[s].rotation),inverse(rotation));
  const bendDirection=new Vector3().crossVectors(direction,new Vector3(footX.x,footX.y,footX.z));
  if(bendDirection.lengthSq()<1e-8){reasons.push('degenerate-plane-'+s);continue;}bendDirection.normalize();
  const kneePoint=direction.clone().multiplyScalar(along).addScaledVector(bendDirection,height);
  const upper=kneePoint.clone().divideScalar(.4),lower=direction.clone().multiplyScalar(r).sub(kneePoint).divideScalar(.4),bend=Math.acos(Math.max(-1,Math.min(1,upper.dot(lower))));
  const y=upper.clone().negate(),z=lower.clone().addScaledVector(upper,-Math.cos(bend)).divideScalar(-Math.sin(bend)),x=new Vector3().crossVectors(y,z).normalize();
  const hipRotation=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x,y,z));
  const lowerRotation=rotation.clone().multiply(hipRotation).multiply(new Quaternion().copy(rx(bend))),relative=lowerRotation.clone().invert().multiply(new Quaternion().copy(supports.feet[s].rotation));
  const rawAnkle=2*Math.atan2(relative.x,relative.w),ankle=Math.atan2(Math.sin(rawAnkle),Math.cos(rawAnkle));
  limbs['foot'+s]={reach,maxReach:.8-reserve,minReach:Math.sqrt(.32+.32*Math.cos(2.3)),lateral:local.x,ankle,orientationResidual:Math.hypot(relative.y,relative.z)*2};
  if(reach>.8-reserve||reach<limbs['foot'+s].minReach-1e-5||Math.abs(ankle)>.4+1e-5)reasons.push('leg-'+s);
  if(limbs['foot'+s].orientationResidual>.02)reasons.push('foot-orientation-'+s);
  motors['hip'+s]={x:hipRotation.x,y:hipRotation.y,z:hipRotation.z,w:hipRotation.w};motors['knee'+s]=bend;motors['ankle'+s]=ankle;
  const shoulder=add(torso,rotateVector(rig.joints.get('shoulder'+s).spec.anchorA,torsoRotation));
  const arm=armIK(rotateVector(sub(supports.hands[s],shoulder),inverse(torsoRotation)),s==='L'?1:-1);
  limbs['hand'+s]={reach:arm.requested,maxReach:.79-reserve,minReach:Math.sqrt(.36**2+.43**2+2*.36*.43*Math.cos(2.35))+.005};
  if(arm.requested>.79-reserve||arm.requested<limbs['hand'+s].minReach)reasons.push('arm-'+s);
  motors['shoulder'+s]=arm.rotation;motors['elbow'+s]=arm.bend;motors['wrist'+s]=0;
 }
 const pelvisBottom=pose.position.y-.09*Math.abs(rotateVector({x:0,y:1,z:0},rotation).y)-.2,torsoBottom=torso.y-.15*Math.abs(rotateVector({x:0,y:1,z:0},torsoRotation).y)-.24;
 if(pelvisBottom<.005||torsoBottom<.005)reasons.push('central-floor');
 if(Object.values(motors).flatMap(v=>typeof v==='number'?[v]:Object.values(v)).some(v=>!Number.isFinite(v)))reasons.push('non-finite-chain');
 return {feasible:reasons.length===0,reasons,limbs,motors,pose,torso,head,headClearance:head.y-.48};
}

// Necessary sampled kinematic check; it is not a contact/friction/wrench proof.
export function checkedSupportMove(rig,supports,from,to){
 for(const pose of [from,to]){const p=supportPose(rig,supports,pose);if(!p.feasible)return p;}
 const distance=Math.hypot(...['x','y','z'].map(k=>to.position[k]-from.position[k]));
 const angular=Math.max(...['pitch','yaw','roll','spine','neck'].map(k=>Math.abs((to[k]||0)-(from[k]||0))));
 const n=Math.max(1,Math.ceil(distance/.005),Math.ceil(angular/.02));
 for(let i=0;i<=n;i++){const t=i/n,pose={position:{}};for(const k of ['x','y','z'])pose.position[k]=from.position[k]+t*(to.position[k]-from.position[k]);for(const k of ['pitch','yaw','roll','spine','neck'])pose[k]=(from[k]||0)+t*((to[k]||0)-(from[k]||0));
  const p=supportPose(rig,supports,pose);if(!p.feasible)return {...p,failedFraction:t};
 }return supportPose(rig,supports,to);
}

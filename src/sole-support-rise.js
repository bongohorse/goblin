import {Quaternion,Vector3,Euler} from 'three';
import {ContactGetup} from './contact-getup.js';
import {captureSupports,supportPose} from './support-path.js';
import {observeGetup} from './getup-observation.js';
import {worldAnchor} from './goblin-rig.js';
import {plannedBodies,plannedSelfContacts} from './pose-audit.js';
const sides=['L','R'],distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const quaternion=q=>({x:q.x,y:q.y,z:q.z,w:q.w});
// Minimal sole-roll feasibility prototype. No standing/integration/recovery path.
export class SoleSupportRise extends ContactGetup {
 constructor(R,world,rig,floor){
  super(R,world,rig,floor);this.phase='sole-roll';this.progress=0;this.dwell=0;
  this.supports=captureSupports(rig);this.initialSupports=structuredClone(this.supports);
  const s=observeGetup(world,rig,floor),root=rig.byId.get('pelvis').body,e=new Euler().setFromQuaternion(new Quaternion().copy(root.rotation()).normalize(),'XYZ');
  this.pose={position:{...root.translation()},pitch:e.x,yaw:e.y,roll:e.z,spine:Math.max(-.3,Math.min(.3,s.angles.spine.x)),neck:Math.max(-.45,Math.min(.45,s.angles.neck.x))};this.pose.position.y+=.002;
  this.edges={};
  for(const side of sides){const entry=rig.byId.get('foot'+side),contacts=s.contacts.filter(c=>c.id==='foot'+side&&c.force>.5),points=contacts.flatMap(c=>c.points);
   if(!points.length){this.stop('no-loaded-foot-edge');return;}
   const point=points.reduce((p,v)=>({x:p.x+v.x/points.length,y:p.y+v.y/points.length,z:p.z+v.z/points.length}),{x:0,y:0,z:0}),q=new Quaternion().copy(entry.body.rotation()).normalize();
   const local=new Vector3(point.x-entry.body.translation().x,point.y-entry.body.translation().y,point.z-entry.body.translation().z).applyQuaternion(q.clone().invert());
   const forward=new Vector3(0,0,1).applyQuaternion(q),flat=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.atan2(forward.x,forward.z));
   this.edges[side]={point,local:{x:local.x,y:local.y,z:local.z},initial:quaternion(q),flat:quaternion(flat)};
  }
  this.planning=supportPose(rig,this.supports,this.pose);
  if(!this.planning.feasible)this.stop('no-common-entry');
  else if(plannedSelfContacts(rig,plannedBodies(rig,this.pose,this.planning.motors)).length)this.stop('self-contact-entry');
 }
 rolledSupports(progress){const supports=structuredClone(this.initialSupports);
  for(const side of sides){const edge=this.edges[side],q=new Quaternion().copy(edge.initial).slerp(new Quaternion().copy(edge.flat),progress),offset=new Vector3(edge.local.x,edge.local.y,edge.local.z).applyQuaternion(q),foot=supports.feet[side];
   foot.rotation=quaternion(q);foot.position={x:edge.point.x-offset.x,y:edge.point.y-offset.y,z:edge.point.z-offset.z};
   const ankle=new Vector3(...Object.values(this.rig.joints.get('ankle'+side).spec.anchorB)).applyQuaternion(q);foot.ankle={x:foot.position.x+ankle.x,y:foot.position.y+ankle.y,z:foot.position.z+ankle.z};
  }return supports;
 }
 plan(progress){const supports=this.rolledSupports(progress),candidates=[];this.rejectedPlans=[];
  // Small bounded necessary-geometry search, not a force/solver parameter search.
  // Foot targets roll on captured edges; hand targets remain unchanged in this first mechanism.
  for(const dy of [-.01,0,.01])for(const dz of [-.015,0,.015])for(const dp of [-.025,0,.025])for(const ds of [-.025,0,.025]){
   const pose=structuredClone(this.pose);pose.position.y+=dy;pose.position.z+=dz;pose.pitch+=dp;
   // Coordinate the existing spine/neck hinges; preserve the head sum-angle initially.
   pose.spine+=ds;pose.neck-=ds;
   const p=supportPose(this.rig,supports,pose);if(!p.feasible||p.head.y<.478)continue;
   const collisions=plannedSelfContacts(this.rig,plannedBodies(this.rig,pose,p.motors));
   if(collisions.length){this.rejectedPlans.push({pose,collisions});continue;}
   // Check the central path with intermediate rolled foot poses too.
   let valid=true;for(const t of [.25,.5,.75]){const middle=structuredClone(this.pose);for(const k of ['x','y','z'])middle.position[k]+=t*(pose.position[k]-middle.position[k]);for(const k of ['pitch','spine','neck'])middle[k]+=t*(pose[k]-middle[k]);const planned=supportPose(this.rig,this.rolledSupports(this.progress+t*(progress-this.progress)),middle);if(!planned.feasible||plannedSelfContacts(this.rig,plannedBodies(this.rig,middle,planned.motors)).length){valid=false;break;}}
   if(valid)candidates.push({...p,supports,score:distance(pose.position,this.pose.position)+Math.abs(dp)*.15+Math.abs(ds)*.15});
  }
  candidates.sort((a,b)=>a.score-b.score);return candidates[0];
 }
 step(dt,intent={}){
  if(this.disposed)return;
  if(intent.held||intent.hit||intent.blocked){this.stop('interrupted');return;}
  if(intent.paused){if(!this.paused)this.disableActuation();this.paused=true;return;}
  if(this.paused){this.enableBudget();this.paused=false;}
  this.elapsed+=dt;const s=observeGetup(this.world,this.rig,this.floor,dt),load=id=>s.contacts.filter(c=>c.id===id).reduce((n,c)=>n+c.force,0);
  const feet=sides.map(side=>{const body=this.rig.byId.get('foot'+side).body,goal=this.supports.feet[side];return {normal:load('foot'+side),angle:new Quaternion().copy(body.rotation()).angleTo(new Quaternion().copy(goal.rotation)),edgeSlip:distance(worldAnchor(body,this.edges[side].local),this.edges[side].point)};});
  const root=this.rig.byId.get('pelvis').body;
  this.feedback={feet,head:load('head'),hands:sides.map(side=>load('hand'+side)),com:s.com,velocity:s.velocity,rootError:distance(root.translation(),this.pose.position),headHeight:this.rig.byId.get('head').body.translation().y};
  const supporting=feet.every(f=>f.normal>.1*s.weight&&f.edgeSlip<.05),tracking=feet.every(f=>f.angle<.08)&&this.feedback.rootError<.08;
  if(this.phase==='sole-roll'&&supporting&&tracking&&Math.hypot(...Object.values(s.velocity))<.2&&this.progress<1){const progress=Math.min(1,this.progress+dt*.25),target=this.plan(progress);if(target){this.progress=progress;this.pose=target.pose;this.supports=target.supports;this.planning=target;}else{this.stop('no-common-roll-path');return;}}
  for(const [id,goal] of Object.entries(this.planning.motors))this.motor(id,goal,['spine','neck','wristL','wristR','ankleL','ankleR'].includes(id)?12:20);
  this.lost=supporting?0:(this.lost||0)+dt;if(this.lost>.2){this.stop('roll-support-loss');return;}
  this.stall=tracking?0:(this.stall||0)+dt;if(this.stall>1){this.stop('roll-tracking-stall');return;}
  // Preserve the prior head-free/quiet-support requirements. A sole alone is not success.
  const flat=sides.every(side=>new Vector3(0,1,0).applyQuaternion(new Quaternion().copy(this.rig.byId.get('foot'+side).body.rotation())).y>.98);
  const stable=flat&&s.margin>.02&&this.feedback.head<.05*s.weight&&this.feedback.headHeight>.53&&feet.every(f=>f.normal>.15*s.weight)&&this.feedback.hands.every(f=>f>.02*s.weight)&&feet.reduce((n,f)=>n+f.normal,0)+this.feedback.hands.reduce((n,f)=>n+f,0)>.8*s.weight&&Math.hypot(...Object.values(s.velocity))<.12&&s.maxSpeed<.25&&s.maxAngularSpeed<.7;
  this.dwell=stable?this.dwell+dt:0;if(this.dwell>=1&&this.phase==='sole-roll'){this.phase='head-free-sole-intermediate';this.transitions.push({time:this.elapsed,phase:this.phase});}
  if(this.elapsed>6){this.stop('sole-roll-timeout');return;}
  this.flush(dt);
 }
}

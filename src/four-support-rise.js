import {ContactGetup} from './contact-getup.js';
import {captureSupports,supportPose,checkedSupportMove} from './support-path.js';
import {observeGetup} from './getup-observation.js';
import {Euler,Quaternion} from 'three';
const pitch=q=>Math.atan2(2*(q.w*q.x+q.y*q.z),1-2*(q.x*q.x+q.y*q.y));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export class FourSupportRise extends ContactGetup {
 constructor(R,world,rig,floor){
  super(R,world,rig,floor);this.phase='four-support';this.supports=captureSupports(rig);this.progress=0;this.dwell=0;
  const body=rig.byId.get('pelvis').body,s=observeGetup(world,rig,floor),euler=new Euler().setFromQuaternion(new Quaternion().copy(body.rotation()).normalize(),'XYZ');
  this.start={position:{...body.translation()},pitch:euler.x,yaw:euler.y,roll:euler.z,spine:Math.max(-.3,Math.min(.3,s.angles.spine.x)),neck:Math.max(-.45,Math.min(.45,s.angles.neck.x))};
  this.start.position.y+=.002;
  this.goal={position:{x:this.start.position.x,y:.69,z:.025},pitch:-1.5,spine:.3,neck:.4};
  this.path=Array.from({length:41},(_,i)=>this.poseAt(i/40));
  this.preflight=this.path.map(p=>supportPose(rig,this.supports,p));
  const entry=this.preflight.findIndex(p=>p.feasible);this.entry=entry;
  if(entry<0||distance(this.start.position,this.path[entry].position)>.02||Math.abs(this.start.pitch-this.path[entry].pitch)>.12||this.preflight.slice(entry).some(p=>!p.feasible))this.stop('no-common-path');
  else {this.progress=entry/40;this.acceptedPose=this.poseAt(this.progress);}
 }
 poseAt(t){const mix=(a,b,u)=>a+(b-a)*u;const intermediate={position:{x:this.start.position.x,y:.75,z:.025},pitch:-1.8,spine:.3,neck:.4};
 const a=t<=.5?this.start:intermediate,b=t<=.5?intermediate:this.goal,u=t<=.5?t*2:(t-.5)*2;
 return {position:Object.fromEntries(['x','y','z'].map(k=>[k,mix(a.position[k],b.position[k],u)])),pitch:mix(a.pitch,b.pitch,u),yaw:this.start.yaw,roll:this.start.roll,spine:mix(a.spine,b.spine,u),neck:mix(a.neck,b.neck,u)};}
 step(dt,intent={}){
  if(this.disposed)return;
  if(intent.held||intent.hit||intent.blocked){this.stop(intent.held?'held':intent.hit?'hit':'blocked');return;}
  if(intent.paused){if(!this.paused)this.disableActuation();this.paused=true;return;}
  if(this.paused){this.enableBudget();this.paused=false;}
  this.elapsed+=dt;const s=observeGetup(this.world,this.rig,this.floor,dt);this.observation=s;
  const load=id=>s.contacts.filter(c=>c.id===id).reduce((n,c)=>n+c.force,0),feet=['L','R'].map(side=>load('foot'+side)),hands=['L','R'].map(side=>load('hand'+side));
  const pelvis=this.rig.byId.get('pelvis').body;
  this.feedback={root:{...pelvis.translation()},rootPitch:pitch(pelvis.rotation()),feet,hands,head:load('head'),speed:Math.hypot(s.velocity.x,s.velocity.y,s.velocity.z),margin:s.margin};
  const heldPose=this.poseAt(this.progress);heldPose.position.z+=this.loadOffset||0;const current=supportPose(this.rig,this.supports,heldPose);
  this.feedback.trackingDistance=distance(pelvis.translation(),current.pose.position);this.feedback.trackingAngle=Math.abs(pitch(pelvis.rotation())-current.pose.pitch);
  this.feedback.supportSlip=Object.fromEntries(['L','R'].map(side=>[side,distance(this.rig.byId.get('hand'+side).body.translation(),this.supports.hands[side])]));
  const previousProgress=this.progress;
  const tracking=distance(pelvis.translation(),current.pose.position)<.06&&Math.abs(pitch(pelvis.rotation())-current.pose.pitch)<.12;
  const carrying=feet.every(f=>f>.1*s.weight)&&hands.every(f=>f>.02*s.weight)&&s.margin>.02;
  if(tracking&&carrying&&this.feedback.speed<.2&&(this.progress<.5||this.phase==='head-free'))this.progress=Math.min(1,this.progress+dt*.25);
  const candidate=this.poseAt(this.progress),nominal=this.poseAt(this.progress);
  const bias={...(this.bias||{y:0,z:0,pitch:0})};
  for(const k of ['y','z'])bias[k]=Math.max(-.08,Math.min(.08,bias[k]+dt*.5*(nominal.position[k]-pelvis.translation()[k])));
  bias.pitch=Math.max(-.18,Math.min(.18,bias.pitch+dt*.5*(nominal.pitch-pitch(pelvis.rotation()))));
  candidate.position.y+=bias.y;candidate.position.z+=bias.z;candidate.pitch+=bias.pitch;
  candidate.neck=.4; // independently unload the head; still checked with the whole pose
  const offset=Math.max(-.05,Math.min(.05,(this.loadOffset||0)+dt*.03*(.4*s.weight-feet[0]-feet[1])/(.4*s.weight)));
  candidate.position.z+=offset;
  let target=checkedSupportMove(this.rig,this.supports,this.acceptedPose,candidate);
  if(target.feasible){this.loadOffset=offset;this.bias=bias;this.acceptedPose=structuredClone(candidate);}
  else{this.rejectedCorrection=target.reasons;this.progress=previousProgress;target=supportPose(this.rig,this.supports,this.acceptedPose);}
  this.planning=target;
  if(!target.feasible){this.stop('no-common-path');return;}
  for(const id of this.motors.keys())this.motor(id,0,12);
  for(const [id,goal] of Object.entries(target.motors))this.motor(id,goal,['spine','neck','wristL','wristR'].includes(id)?12:20);
  // Four-point path uses native joint reaction only; a free support torque rolls edge-supported feet.
  const headFree=load('head')<.05*s.weight&&this.rig.byId.get('head').body.translation().y>.53;
  this.dwell=headFree&&carrying&&feet.every(f=>f>.15*s.weight)&&feet.reduce((a,b)=>a+b,0)+hands.reduce((a,b)=>a+b,0)>.8*s.weight&&this.feedback.speed<.12&&s.maxSpeed<.25&&s.maxAngularSpeed<.7?this.dwell+dt:0;
  if(this.dwell>=1&&this.phase==='four-support'){this.phase='head-free';this.transitions.push({time:this.elapsed,phase:this.phase,feedback:structuredClone(this.feedback)});}
  this.slipTime=Object.values(this.feedback.supportSlip).some(d=>d>.05)?(this.slipTime||0)+dt:0;
  if(this.slipTime>.2){this.stop('hand-support-slip');return;}
  this.stall=tracking&&carrying?0:(this.stall||0)+dt;
  if(this.stall>2){this.stop('support-or-tracking-stall');return;}
  if(this.elapsed>10){this.stop('four-support-timeout');return;}
  this.flush(dt);
 }
}

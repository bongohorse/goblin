import R from '@dimforge/rapier3d-compat';
import {Quaternion,Vector3,Euler} from 'three';
import {createGoblinRig,worldAnchor} from '../src/goblin-rig.js';
import {ContactGetup,armIK} from '../src/contact-getup.js';
import {jointRotation,observeGetup} from '../src/getup-observation.js';
import {FourSupportRise} from '../src/four-support-rise.js';
import {fallenCase} from './getup-fixture.js';
import {writeFileSync} from 'node:fs';
await R.init();
const dt=1/60,q=b=>new Quaternion().copy(b.rotation()).normalize();
export function motorCalibration(wrong=false){
 const world=new R.World({x:0,y:0,z:0}),rig=createGoblinRig(R,world);let c;
 try{
  // Diagnostic isolation only: no gravity or contacts. Not an acceptance fixture.
  for(const {body,collider} of rig.byId.values()){collider.setSensor(true);body.setLinearDamping(0);body.setAngularDamping(0);}
  c=new ContactGetup(R,world,rig,null);
  const goals={spine:.15,neck:-.2,kneeL:.8,kneeR:.8,ankleL:-.2,ankleR:-.2,wristL:0,wristR:0},armTargets={};
  for(const side of ['L','R']){
   const target={x:side==='L'?.3:-.3,y:-.45,z:-.2},a=armIK(target,side==='L'?1:-1);
   armTargets[side]=target;goals['shoulder'+side]=a.rotation;goals['elbow'+side]=a.bend;
   goals['hip'+side]=new Quaternion().setFromEuler(new Euler(.5,side==='L'?.2:-.2,-.2));
  }
  for(let i=0;i<600;i++){for(const [id,goal] of Object.entries(goals)){const target=wrong&&id.startsWith('shoulder')?new Quaternion().copy(goal).invert():goal;c.motor(id,target,20);}c.flush(dt);world.step();}
  const errors={};for(const [id,goal] of Object.entries(goals)){const {spec}=rig.joints.get(id),a=rig.byId.get(spec.parent).body,b=rig.byId.get(spec.child).body;errors[id]=typeof goal==='number'?Math.abs(jointRotation(rig,spec).x-goal):q(a).invert().multiply(q(b)).angleTo(new Quaternion().copy(goal));}
  const hands={};for(const side of ['L','R']){const torso=rig.byId.get('torso').body,shoulder=worldAnchor(torso,rig.joints.get('shoulder'+side).spec.anchorA),hand=rig.byId.get('hand'+side).body.translation();const local=new Vector3(hand.x-shoulder.x,hand.y-shoulder.y,hand.z-shoulder.z).applyQuaternion(q(torso).invert());hands[side]={requested:armTargets[side],actual:{x:local.x,y:local.y,z:local.z},error:local.distanceTo(new Vector3(...Object.values(armTargets[side])))};}
  return {wrong,errors,hands,frames:Object.fromEntries([...c.motors].map(([id,m])=>[id,{frame1:{...m.joint.frameX1()},frame2:{...m.joint.frameX2()}}]))};
 }finally{c?.stop('teardown');world.free();}
}
export function motorCap(){
 const world=new R.World({x:0,y:0,z:0});try{world.timestep=dt;const a=world.createRigidBody(R.RigidBodyDesc.dynamic()),b=world.createRigidBody(R.RigidBodyDesc.dynamic());for(const body of [a,b])world.createCollider(R.ColliderDesc.ball(.1).setMass(1),body);
  const original=world.createImpulseJoint(R.JointData.spherical({x:0,y:0,z:0},{x:0,y:0,z:0}),a,b,true);original.setContactsEnabled(false);const joint=new R.SphericalImpulseJoint(world.impulseJoints.raw,world.bodies,original.handle);joint.setFrameX1(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),1));
  // Saturate the tiny diagnostic motor, without increasing its torque cap.
  for(const axis of [R.JointAxis.AngX,R.JointAxis.AngY,R.JointAxis.AngZ]){joint.configureMotorModel(axis,R.MotorModel.ForceBased);joint.configureMotor(axis,0,0,10000,0);joint.setMotorMaxForce(axis,2);}world.step();
  const inertia=a.principalInertia().x;return {cap:2,measuredChildTorque:b.angvel().x*inertia/dt,measuredParentTorque:a.angvel().x*inertia/dt,angularResidual:a.angvel().x+b.angvel().x};
 }finally{world.free();}
}
export function contactCalibration(){
 const world=new R.World({x:0,y:-9.81,z:0});try{
  world.timestep=dt;const floor=world.createCollider(R.ColliderDesc.cuboid(2,.2,2).setTranslation(0,-.2,0).setFriction(.9)),body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,.11,0)),collider=world.createCollider(R.ColliderDesc.cuboid(.1,.1,.1).setMass(1).setFriction(.7),body);
  for(let i=0;i<180;i++)world.step();body.addForce({x:2,y:0,z:0},true);
  for(let i=0;i<120;i++)world.step();const before={...body.linvel()};world.step();const after={...body.linvel()};
  const read=(a,b)=>{const readings=[];world.contactPair(a,b,(m,flipped)=>{let normal=0,tangent=0;for(let i=0;i<m.numContacts();i++){normal+=m.contactImpulse(i)/dt;tangent+=Math.hypot(m.contactTangentImpulseX(i),m.contactTangentImpulseY(i))/dt;}readings.push({normal,tangent,normalY:m.normal().y,flipped});});return readings;};
  return {force:{x:2,y:0,z:0},before,after,inferredFrictionX:body.mass()*(after.x-before.x)/dt-2,readings:read(collider,floor),reversed:read(floor,collider),combineRules:[collider.frictionCombineRule(),floor.frictionCombineRule()]};
 }finally{world.free();}
}
export function bridgeCounterfactual(friction=.7){
 const f=fallenCase(R,-1);let c;try{
  // Change friction AFTER the same true fall: it cannot change the initial pose.
  for(const {collider,spec} of f.rig.byId.values())collider.setFriction(friction===.7?spec.friction:friction);
  if(friction!==.7)f.floor.setFriction(friction);
  c=new FourSupportRise(R,f.world,f.rig,f.floor);const trace=[];
  for(let i=0;i<120&&!c.disposed;i++){for(const {body} of f.rig.byId.values())body.resetTorques(false);const pre=observeGetup(f.world,f.rig,f.floor);c.step(dt);const commands=Object.fromEntries([...c.motors].map(([id,m])=>[id,{target:m.command?.target,applied:m.current,cap:m.command?.force}]));f.world.step();const post=observeGetup(f.world,f.rig,f.floor);if(i%6===5||c.disposed)trace.push({step:i+1,pre,commands:structuredClone(commands),post,planned:c.planning,feedback:c.feedback});}
  return {friction,phase:c.phase,time:c.elapsed,trace};
 }finally{c?.stop('teardown');f.world.free();}
}
if(process.argv[1]?.endsWith('controller-foundations.mjs')){const result={calibration:motorCalibration(),wrong:motorCalibration(true),cap:motorCap(),contact:contactCalibration(),bridge:[bridgeCounterfactual(),bridgeCounterfactual(2)]};if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2));console.log(JSON.stringify({calibration:result.calibration,wrong:{errors:result.wrong.errors,hands:result.wrong.hands},cap:result.cap,contact:result.contact,bridge:result.bridge.map(r=>({friction:r.friction,phase:r.phase,time:r.time,feedback:r.trace.at(-1).feedback}))},null,2));}

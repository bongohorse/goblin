import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Quaternion,Vector3,Euler} from 'three';
import {fallenCase} from './getup-fixture.js';
import {ContactGetup,armIK,planarIK} from '../src/contact-getup.js';
import {observeGetup,supportHull,supportMargin} from '../src/getup-observation.js';
import {ContactGrab} from '../src/grab.js';
await R.init();
const dt=1/60;
const quat=q=>new Quaternion().copy(q).normalize();
const length=v=>Math.hypot(v.x,v.y,v.z);

test('support geometry rejects a line and COM outside a loaded polygon',()=>{
 const points=[{x:-1,z:-1},{x:1,z:1},{x:-1,z:1},{x:1,z:-1},{x:0,z:0}];
 assert.equal(supportHull(points).length,4);
 assert.ok(Math.abs(supportMargin({x:0,z:0},supportHull(points))-1)<1e-6);
 assert.ok(supportMargin({x:1.2,z:0},supportHull(points))<0);
 assert.equal(supportMargin({x:0,z:0},supportHull([{x:-1,z:0},{x:1,z:0},{x:0,z:0}])),-Infinity);
});
test('IK reaches rotated-body hand targets without an inward elbow branch; singular directions stay finite',()=>{
 for(const side of [-1,1])for(const target of [{x:side*.3,y:-.5,z:.2},{x:side*.25,y:.1,z:-.6},{x:side*.6,y:0,z:0},{x:0,y:0,z:0}]){
  const arm=armIK(target,side),q=quat(arm.rotation);
  const upper=new Vector3(0,-.36,0).applyQuaternion(q);
  const lower=new Vector3(0,-.43,0).applyAxisAngle(new Vector3(1,0,0),arm.bend).applyQuaternion(q);
  assert.ok([...Object.values(arm.rotation),arm.bend].every(Number.isFinite));
  assert.ok(arm.bend>=-2.35-1e-6&&arm.bend<=.05);
  if(length(target)>.27){
   const parent=new Quaternion().setFromEuler(new Euler(.8,-.7,.4));
   assert.ok(upper.add(lower).applyQuaternion(parent).distanceTo(new Vector3(target.x,target.y,target.z).applyQuaternion(parent))<1e-6);
  }
 }
 const leg=planarIK(-.12,.05,.4,.4,1,2.3);
 assert.ok(leg.bend<=2.3);
 const y=-.4*Math.cos(leg.base)-.4*Math.cos(leg.base+leg.bend),z=-.4*Math.sin(leg.base)-.4*Math.sin(leg.base+leg.bend);
 assert.ok(Math.abs(Math.atan2(z,y)-Math.atan2(.05,-.12))<1e-6,'reach clamp preserves requested direction');
});
test('Rapier 0.21 combined spherical orientation converges using a joint frame, not independent quaternion twists',()=>{
 const w=new R.World({x:0,y:0,z:0});try{
  const a=w.createRigidBody(R.RigidBodyDesc.dynamic()),b=w.createRigidBody(R.RigidBodyDesc.dynamic());
  for(const body of [a,b]){w.createCollider(R.ColliderDesc.ball(.1).setMass(1),body);body.setAdditionalSolverIterations(16);}
  const original=w.createImpulseJoint(R.JointData.spherical({x:0,y:0,z:0},{x:0,y:0,z:0}),a,b,true);original.setContactsEnabled(false);
  const joint=new R.SphericalImpulseJoint(w.impulseJoints.raw,w.bodies,original.handle),goal=new Quaternion().setFromEuler(new Euler(2.3,0,-.9,'ZYX'));
  joint.setFrameX1(goal);
  for(const axis of [R.JointAxis.AngX,R.JointAxis.AngY,R.JointAxis.AngZ]){joint.configureMotorModel(axis,R.MotorModel.ForceBased);joint.configureMotor(axis,0,0,10,2);joint.setMotorMaxForce(axis,5);}
  for(let i=0;i<600;i++)w.step();
  const actual=quat(a.rotation()).invert().multiply(quat(b.rotation()));
  assert.ok(goal.angleTo(actual)<.05,`orientation error ${goal.angleTo(actual)}`);
  assert.equal(w.impulseJoints.len(),1);
 }finally{w.free();}
});
test('original dynamic falls are reproducible; head support cannot count as quiet foot-supported stand',()=>{
 for(const direction of [-1,1]){
  const {world,rig,floor}=fallenCase(R,direction);try{
   const s=observeGetup(world,rig,floor);assert.equal(s.pose,direction<0?'back':'belly');
   assert.ok(s.margin>0&&s.footMargin<-.2);assert.equal(s.standing,false);
   assert.ok(s.footForce<s.weight*.7);assert.ok(Math.abs(s.weight-88.8786)<.001);
   assert.ok(Math.abs(s.com.z-(direction<0?-.1971236962:.5505216286))<1e-5);
  }finally{world.free();}
 }
});
test('corrected arms remove the failed head collision without claiming a get-up; unsafe foot transfer aborts and releases its budget',()=>{
 const {world,rig,floor}=fallenCase(R,-1);let c;try{
  c=new ContactGetup(R,world,rig,floor);let maxArmHead=0,stands=0,plantedGoals;
  for(let i=0;i<360;i++){
   for(const {body} of rig.byId.values())body.resetTorques(false);
   c.step(dt);world.step();const s=observeGetup(world,rig,floor);
   if(i>=60&&!c.disposed)maxArmHead=Math.max(maxArmHead,...s.selfContacts.filter(x=>x.a==='head').map(x=>x.force));
   stands+=Number(s.standing);
   if(c.handGoals){plantedGoals??=structuredClone(c.handGoals);assert.deepEqual(c.handGoals,plantedGoals);}
   if(i===119)for(const side of ['L','R']){const p=rig.byId.get('hand'+side).body.translation(),goal=plantedGoals[side];assert.ok(Math.hypot(p.x-goal.x,p.y-goal.y,p.z-goal.z)<.05,'real planted hand remains within 5 cm while torso moves');}
  }
  assert.ok(maxArmHead<5,`head/arm load ${maxArmHead} N`);
  assert.equal(stands,0);assert.equal(c.phase,'unreachable-support-target');assert.equal(c.disposed,true);
  assert.equal(c.footStep.phase,'await-support');assert.ok(c.infeasibleTime>.5);
  const planted=c.transitions.find(t=>t.phase==='transfer').time;assert.ok(planted>0);
  const goals=structuredClone(c.handGoals);c.step(dt);assert.deepEqual(c.handGoals,goals,'abort never restarts planted goals');
  for(const {body} of rig.byId.values()){assert.equal(body.additionalSolverIterations(),0);assert.equal(length(body.userTorque()),0);}
 }finally{c?.stop('teardown');world.free();}
});
test('pause freezes phases; held/hit/blocked/reset/teardown leave no torque or altered frame/budget; G2 handoff restores the real baseline',()=>{
 const {world,rig,floor}=fallenCase(R,-1);try{
  const body=rig.byId.get('handL').body;body.setAdditionalSolverIterations(3);
  const bodies=world.bodies.len(),joints=world.impulseJoints.len();
  for(let cycle=0;cycle<20;cycle++){
   const originals=new Map([...rig.joints].map(([id,{joint}])=>[id,{...joint.frameX1()}]));
   const c=new ContactGetup(R,world,rig,floor);c.step(dt);
   const time=c.elapsed;c.step(dt,{paused:true});c.step(1,{paused:true});assert.equal(c.elapsed,time);
   assert.equal(body.additionalSolverIterations(),3);c.step(dt);assert.equal(body.additionalSolverIterations(),19);
   const reason=['held','hit','blocked','reset','teardown'][cycle%5];
   const before=[...rig.byId.values()].map(({body:b})=>({...b.linvel()}));
   if(['held','hit','blocked'].includes(reason))c.step(dt,{[reason]:true});else c.stop(reason);
   assert.equal(c.disposed,true);c.stop('again');
   for(const [i,{body:b}] of [...rig.byId.values()].entries()){assert.equal(length(b.userTorque()),0);assert.deepEqual({...b.linvel()},before[i]);}
   for(const [id,{joint}] of rig.joints)assert.deepEqual({...joint.frameX1()},originals.get(id));
   assert.equal(body.additionalSolverIterations(),3);
   const grab=new ContactGrab(world,R);grab.begin(body,body.translation(),0,9.06);assert.equal(body.additionalSolverIterations(),7);grab.cancel('reset');assert.equal(body.additionalSolverIterations(),3);
   assert.equal(world.bodies.len(),bodies);assert.equal(world.impulseJoints.len(),joints);
  }
 }finally{world.free();}
});

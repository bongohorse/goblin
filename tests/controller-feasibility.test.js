import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import R from '@dimforge/rapier3d-compat';
import {Quaternion,Vector3} from 'three';
import {motorCalibration,motorCap,contactCalibration} from './controller-foundations.mjs';
import {fallenCase} from './getup-fixture.js';
import {SoleSupportRise} from '../src/sole-support-rise.js';
import {ContactGetup} from '../src/contact-getup.js';
import {plannedBodies,plannedSelfContacts,actualSelfContacts} from '../src/pose-audit.js';
import {jointErrors} from './sole-support-experiment.mjs';
import {ContactGrab} from '../src/grab.js';
await R.init();const dt=1/60;
const blocked=JSON.parse(readFileSync(new URL('./fixtures/g3-blocked-pose.json',import.meta.url)));

test('real motor/IK calibration converges; deliberately inverted shoulder frames fail the same pose assertion',()=>{
 const check=result=>{for(const error of Object.values(result.errors))assert.ok(error<.005);for(const hand of Object.values(result.hands))assert.ok(hand.error<.005);};
 check(motorCalibration());assert.throws(()=>check(motorCalibration(true)),assert.AssertionError);
});
test('saturated force-based angular motor respects its torque cap and equal opposite reaction',()=>{
 const result=motorCap();assert.ok(Math.abs(result.measuredChildTorque-2)<1e-4);assert.ok(Math.abs(result.measuredParentTorque+2)<1e-4);assert.equal(result.angularResidual,0);
});
test('normal impulse/dt matches weight with either collider order; zero legacy tangent readback is not zero friction',()=>{
 const c=contactCalibration();assert.deepEqual(c.combineRules,[R.CoefficientCombineRule.Average,R.CoefficientCombineRule.Average]);
 assert.ok(Math.abs(c.readings[0].normal-9.81)<.01);assert.ok(Math.abs(c.reversed[0].normal-9.81)<.01);assert.notEqual(c.readings[0].flipped,c.reversed[0].flipped);assert.ok(Math.abs(c.inferredFrictionX+2)<.01);
 // A physically stationary body balances 2 N horizontally. Tangential readback
 // must be treated as unavailable if it cannot recover that known force.
 assert.ok(c.readings[0].tangent<.01||Math.abs(c.readings[0].tangent-2)<.05);
});
test('the reach-valid blocked target is collision-invalid; actual internal contact persists without gravity/floor and disappears only in sensor diagnostic',()=>{
 const f=fallenCase(R,-1);let c;try{
  const target=plannedBodies(f.rig,blocked.pose,blocked.motors),collision=plannedSelfContacts(f.rig,target);
  assert.ok(collision.some(p=>p.a==='torso'&&p.b==='upperLegL'&&p.penetration>.015));assert.ok(collision.some(p=>p.a==='torso'&&p.b==='upperLegR'&&p.penetration>.015));
  f.world.gravity={x:0,y:0,z:0};f.floor.setSensor(true);c=new ContactGetup(R,f.world,f.rig,f.floor);
  const step=()=>{for(const [id,goal] of Object.entries(blocked.motors))c.motor(id,goal,['spine','neck','wristL','wristR','ankleL','ankleR'].includes(id)?12:20);c.flush(dt);f.world.step();};
  for(let i=0;i<600;i++)step();assert.ok(Math.max(...Object.values(jointErrors(f.rig,blocked.motors)))>.1);assert.ok(actualSelfContacts(f.world,f.rig).some(p=>p.a==='torso'&&p.b.startsWith('upperLeg')&&p.force>10));
  for(const {collider} of f.rig.byId.values())collider.setSensor(true);for(let i=0;i<600;i++)step();assert.ok(Math.max(...Object.values(jointErrors(f.rig,blocked.motors)))<.005);
 }finally{c?.stop('teardown');f.world.free();}
});
test('sole-roll goals retain a real toe-edge and normalized rotations; native motion rolls feet while collision-guarded targets never count as head-free',()=>{
 const f=fallenCase(R,-1);let c;try{
  c=new SoleSupportRise(R,f.world,f.rig,f.floor);
  for(const progress of [0,.25,.5,1])for(const side of ['L','R']){const feet=c.rolledSupports(progress).feet[side],edge=c.edges[side],q=new Quaternion().copy(feet.rotation),p=new Vector3(edge.local.x,edge.local.y,edge.local.z).applyQuaternion(q).add(new Vector3(...Object.values(feet.position)));assert.ok(Math.abs(q.length()-1)<1e-6);assert.ok(p.distanceTo(new Vector3(...Object.values(edge.point)))<1e-6);}
  const start=f.rig.byId.get('footL').body.rotation(),initialPitch=2*Math.atan2(start.x,start.w);let lastActive;
  for(let i=0;i<200&&!c.disposed;i++){for(const {body} of f.rig.byId.values())body.resetTorques(false);c.step(dt);if(!c.disposed)lastActive=structuredClone(c.feedback);assert.equal(plannedSelfContacts(f.rig,plannedBodies(f.rig,c.pose,c.planning.motors)).length,0);f.world.step();}
  const end=f.rig.byId.get('footL').body.rotation(),actualPitch=2*Math.atan2(end.x,end.w);assert.ok(initialPitch-actualPitch>.15,'actual roll, not target-only bookkeeping');assert.equal(c.phase,'roll-support-loss');assert.equal(c.dwell,0);assert.ok(c.progress>.3&&c.progress<.5);assert.ok(lastActive.feet.every(p=>p.edgeSlip<.02));assert.ok(c.feedback.head>5);assert.ok(c.feedback.feet.some(p=>p.normal<8.89));
 }finally{c?.stop('teardown');f.world.free();}
});
test('prototype pause/abort restore original frames, torque and nonzero solver baseline before G2 handoff',()=>{
 const f=fallenCase(R,-1);let c;try{
  const hand=f.rig.byId.get('handL').body;hand.setAdditionalSolverIterations(3);const frames=new Map([...f.rig.joints].map(([id,{joint}])=>[id,{...joint.frameX1()}]));c=new SoleSupportRise(R,f.world,f.rig,f.floor);c.step(dt);const progress=c.progress,time=c.elapsed;c.step(1,{paused:true});assert.equal(c.progress,progress);assert.equal(c.elapsed,time);assert.equal(hand.additionalSolverIterations(),3);c.step(dt);assert.equal(hand.additionalSolverIterations(),19);c.step(dt,{hit:true});assert.ok(c.disposed);
  for(const [id,{joint}] of f.rig.joints)assert.deepEqual({...joint.frameX1()},frames.get(id));for(const {body} of f.rig.byId.values())assert.deepEqual({...body.userTorque()},{x:0,y:0,z:0});assert.equal(hand.additionalSolverIterations(),3);const grab=new ContactGrab(f.world,R);grab.begin(hand,hand.translation(),0,9.06);assert.equal(hand.additionalSolverIterations(),7);grab.cancel('reset');assert.equal(hand.additionalSolverIterations(),3);assert.equal(f.world.bodies.len(),15);assert.equal(f.world.impulseJoints.len(),14);
 }finally{c?.stop('teardown');f.world.free();}
});

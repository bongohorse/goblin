import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {ContactGrab,GRAB_LIMITS,pickBody} from '../src/grab.js';
import {createGoblinRig} from '../src/goblin-rig.js';
await RAPIER.init();
const length=v=>Math.hypot(v.x,v.y,v.z);
const v=p=>new THREE.Vector3(p.x,p.y,p.z);
function fixture(mass=1){
  const world=new RAPIER.World({x:0,y:0,z:0});world.timestep=1/60;
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic());
  world.createCollider(RAPIER.ColliderDesc.cuboid(.3,.3,.3).setMass(mass),body);
  return {world,body,grab:new ContactGrab(world,RAPIER)};
}
test('local anchor follows actual body rotation; off-centre pulling rotates while tracking the point',()=>{
  const {world,body,grab}=fixture();try{
    body.setTranslation({x:1,y:2,z:3},true);body.setRotation({x:0,y:0,z:Math.SQRT1_2,w:Math.SQRT1_2},true);
    grab.begin(body,{x:1,y:2.3,z:3},0);
    assert.ok(v(grab.diagnostics.local).distanceTo(new THREE.Vector3(.3,0,0))<1e-6);
    body.setRotation({x:0,y:0,z:0,w:1},true);
    assert.ok(grab.anchor().distanceTo(new THREE.Vector3(1.3,2,3))<1e-6);
    grab.move({x:1.3,y:2.5,z:3},.1);
    let maxAngular=0,maxForce=0;
    for(let j=0;j<180;j++){grab.step(1/60,.1+j/60);world.step();maxAngular=Math.max(maxAngular,length(body.angvel()));maxForce=Math.max(maxForce,grab.diagnostics.forceLimit);}
    assert.ok(maxAngular>.5,'point impulse must produce real torque');
    assert.ok(grab.anchor().distanceTo(new THREE.Vector3(1.3,2.5,3))<.03,'selected point settles at target');
    assert.ok(maxForce<=GRAB_LIMITS.force+1e-6);
    assert.deepEqual({...body.userForce()},{x:0,y:0,z:0});assert.deepEqual({...body.userTorque()},{x:0,y:0,z:0});
  }finally{world.free();}
});
function trajectory(rate,mass=1,fast=true){
  const {world,body,grab}=fixture(mass);try{
    grab.begin(body,{x:0,y:0,z:.3},0);let next=1/rate,maxForce=0,maxSpeed=0;
    const duration=fast?.2:2,travel=fast?1.2:.4;
    for(let j=1;j<=Math.ceil(duration*60);j++){
      const now=j/60;
      while(next<=Math.min(now,duration)+1e-9){grab.move({x:travel*next/duration,y:0,z:.3},next);next+=1/rate;}
      grab.step(1/60,now);world.step();maxForce=Math.max(maxForce,grab.diagnostics.forceLimit);maxSpeed=Math.max(maxSpeed,length(body.linvel()));
    }
    const before=length(body.linvel());grab.release(duration);
    return {before,speed:length(body.linvel()),threw:grab.lastRelease.threw,maxForce,maxSpeed,position:{...body.translation()}};
  }finally{world.free();}
}
test('timed input at 30/60/144/240Hz produces bounded comparable throws; slow release differs',()=>{
  const results=[30,60,144,240].map(rate=>({rate,...trajectory(rate)}));console.log({throws:results});
  for(const r of results){assert.equal(r.threw,true);assert.ok(r.speed>3&&r.speed<=10);assert.ok(r.maxForce<=120+1e-6);assert.ok(r.maxSpeed<=10.1);}
  assert.ok(Math.max(...results.map(r=>r.speed))-Math.min(...results.map(r=>r.speed))<.6,'event rate does not set throw strength');
  const slow=trajectory(60,1,false);assert.equal(slow.threw,false);assert.ok(slow.speed<1);assert.ok(results[1].speed>slow.speed*4);
});
test('release corrects existing motion, heavy props get less speed, stale gestures and abort never throw',()=>{
  const light=trajectory(60,.2),heavy=trajectory(60,4);assert.ok(light.speed>heavy.speed*1.4);
  const {world,body,grab}=fixture();try{
    grab.begin(body,{x:0,y:0,z:0},0);grab.move({x:.6,y:0,z:0},.1);grab.move({x:.7,y:0,z:0},.12);
    const desired=grab.pointerVelocity(.12);body.setLinvel(desired,true);grab.release(.12);
    assert.ok(v(body.linvel()).distanceTo(desired)<1e-5,'release must not double existing velocity');
    grab.begin(body,{x:0,y:0,z:0},0);grab.move({x:1,y:0,z:0},.1);const before={...body.linvel()};grab.release(.3);
    assert.equal(grab.lastRelease.threw,false);assert.deepEqual({...body.linvel()},before);
    for(const reason of ['pointercancel','lostpointercapture','pause','reset','tool','removed']){
      grab.begin(body,body.translation(),0);grab.move({x:1,y:1,z:1},.05);const linear={...body.linvel()},angular={...body.angvel()};grab.cancel(reason);
      assert.equal(grab.active,false);assert.equal(grab.lastRelease.threw,false);assert.deepEqual({...body.linvel()},linear);assert.deepEqual({...body.angvel()},angular);
    }
  }finally{world.free();}
});
test('duplicate release preserves recent movement, while the grip never overwrites collision velocities',()=>{
  const {world,body,grab}=fixture(.18);try{
    grab.begin(body,{x:0,y:0,z:.3},0);grab.move({x:.2,y:0,z:.3},.03);
    const before=grab.pointerVelocity(.03).length();grab.move({x:.2,y:0,z:.3},.045,true);
    assert.ok(Math.abs(grab.pointerVelocity(.045).length()-before)<1e-9,'pointerup is not a zero-motion sample');
    grab.release(.045);assert.equal(grab.lastRelease.threw,true);
    grab.begin(body,body.translation(),1);grab.move({x:10000,y:10000,z:10000},1.001);
    assert.ok(v(grab.diagnostics.target).distanceTo(v(body.translation()))<=3+1e-6);
    body.setLinvel({x:100,y:0,z:0},true);body.setAngvel({x:0,y:100,z:0},true);
    grab.step(1/60,1.001);assert.ok(grab.diagnostics.forceLimit<=120+1e-6);
    assert.deepEqual({...body.linvel()},{x:100,y:0,z:0});assert.deepEqual({...body.angvel()},{x:0,y:100,z:0});
    grab.cancel();assert.equal(grab.diagnostics.connections,0);
  }finally{world.free();}
});
test('20 real articulated grab/reset cycles remain bounded, retain no constraint/force, and tolerate body removal',()=>{
  const world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=1/60;
  world.createCollider(RAPIER.ColliderDesc.cuboid(6,.2,6).setTranslation(0,-.2,0));
  const rig=createGoblinRig(RAPIER,world),grab=new ContactGrab(world,RAPIER),ids=['head','handL','lowerArmR','torso','upperLegL','footR'];
  try{
    let maxForce=0,maxSpeed=0,maxGap=0,maxHoldError=0;
    const loadMass=[...rig.byId.values()].reduce((m,e)=>m+e.body.mass(),0);
    for(let cycle=0;cycle<20;cycle++){
      rig.reset();const body=rig.byId.get(ids[cycle%ids.length]).body,point=v(body.translation()).add(new THREE.Vector3(.05,.02,.08));
      grab.begin(body,point,0,loadMass);
      for(let j=1;j<=240;j++){
        const t=j/60;grab.move(point.clone().add(new THREE.Vector3(Math.min(t,.5),.3,0)),t);grab.step(1/60,t);world.step();
        maxForce=Math.max(maxForce,grab.diagnostics.forceLimit);maxSpeed=Math.max(maxSpeed,length(body.linvel()));
        for(const {spec} of rig.joints.values()){
          const a=rig.byId.get(spec.parent).body,b=rig.byId.get(spec.child).body;
          const anchor=(rb,p)=>v(p).applyQuaternion(new THREE.Quaternion(...Object.values(rb.rotation()))).add(v(rb.translation()));
          maxGap=Math.max(maxGap,anchor(a,spec.anchorA).distanceTo(anchor(b,spec.anchorB)));
        }
      }
      const error=grab.anchor().distanceTo(v(grab.diagnostics.target));maxHoldError=Math.max(maxHoldError,error);
      assert.ok(error<.12,`${ids[cycle%ids.length]} holds the loaded point: ${error}m`);
      grab.cancel('reset');rig.reset();assert.equal(grab.diagnostics.connections,0);assert.equal(world.bodies.len(),15);assert.equal(world.impulseJoints.len(),14);
      assert.equal(body.additionalSolverIterations(),0,'temporary island solver effort restored');
      for(const {body} of rig.byId.values())for(const field of [body.linvel(),body.angvel(),body.userForce(),body.userTorque()])assert.equal(length(field),0);
    }
    console.log({grabCycles:{maxForce,maxSpeed,maxGap,maxHoldError}});assert.ok(maxForce<=120+1e-6);assert.ok(maxSpeed<=11);assert.ok(maxGap<.15);
    const body=rig.byId.get('head').body;grab.begin(body,body.translation(),0);world.removeRigidBody(body);grab.step(1/60,.1);assert.equal(grab.active,false);assert.equal(grab.lastRelease.threw,false);
    assert.equal(world.bodies.len(),14,'removed object leaves no grip anchor body');assert.equal(world.impulseJoints.len(),13,'removed object leaves no grip joint');
  }finally{world.free();}
});
test('collider picking uses semantic body handles and restored collider poses before next step',()=>{
  const {world,body}=fixture();try{
    body.setTranslation({x:4,y:0,z:0},true);world.step();
    body.setTranslation({x:0,y:0,z:0},true);world.propagateModifiedBodyPositionsToColliders();
    const hit=pickBody(RAPIER,world,[body.handle],{x:0,y:0,z:5},{x:0,y:0,z:-1});
    assert.equal(hit.body.handle,body.handle);assert.ok(Math.abs(hit.hit.point.z-.3)<1e-6);
  }finally{world.free();}
});

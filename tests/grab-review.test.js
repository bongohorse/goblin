import {test} from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import {ContactGrab} from '../src/grab.js';
await RAPIER.init();
const v=p=>new THREE.Vector3(p.x,p.y,p.z);
function fixture(mass=1){
  const world=new RAPIER.World({x:0,y:0,z:0});world.timestep=1/60;
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic());
  world.createCollider(RAPIER.ColliderDesc.cuboid(.3,.3,.3).setMass(mass),body);
  return {world,body,grab:new ContactGrab(world,RAPIER)};
}

test('the real spring motor bounds the resultant impulse, including diagonal targets and rotated bodies',()=>{
  for(const mass of [.18,1,4])for(const target of [{x:3,y:0,z:0},{x:2,y:2,z:2}]){
    const {world,body,grab}=fixture(mass);try{
      body.setRotation({x:.5,y:.5,z:.5,w:.5},true);grab.begin(body,body.translation(),0);
      grab.move(target,.01);let maxForce=0,maxDrive=0;
      for(let j=0;j<180;j++){
        const before=v(body.linvel());grab.step(1/60);world.step();
        // No gravity, other colliders, damping or authored motion: momentum
        // change measures the actual engine spring impulse, not a diagnostic cap.
        const force=v(body.linvel()).sub(before).length()*mass*60;
        maxForce=Math.max(maxForce,force);maxDrive=Math.max(maxDrive,v(grab.connection.anchorBody.linvel()).length());
        assert.ok(force<=Math.min(120,mass*80)+.002,`actual ${mass}kg force ${force}N`);
      }
      assert.ok(maxForce>mass*10,'test must actually load the force limit');
      assert.ok(maxDrive<=Math.min(10,8/Math.sqrt(Math.max(1,mass)))+.0001);
      grab.cancel();assert.equal(world.bodies.len(),1);assert.equal(world.impulseJoints.len(),0);
    }finally{world.free();}
  }
});

test('grabbing a high-speed collision does not erase contact momentum or overwrite its spin',()=>{
  const {world,body,grab}=fixture();try{
    body.setTranslation({x:-.29,y:0,z:0},true);body.setLinvel({x:30,y:0,z:0},true);body.setAngvel({x:0,y:25,z:0},true);
    const other=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(.29,0,0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(.3,.3,.3).setMass(1).setRestitution(1),other);
    grab.begin(body,body.translation(),0);grab.step(1/60);world.step();
    const momentum=v(body.linvel()).add(v(other.linvel()));
    assert.ok(momentum.distanceTo(new THREE.Vector3(30,0,0))<=80/60+.002,'only bounded external grip impulse may change total momentum');
    assert.ok(v(other.linvel()).length()>10,'real high-speed collision happened');
    // Contacts may legitimately change spin. Test uncontacted spin separately,
    // rather than mistaking collision friction for a velocity overwrite.
    grab.cancel();const before={linear:{...body.linvel()},angular:{...body.angvel()}};
    assert.deepEqual({...body.linvel()},before.linear);assert.deepEqual({...body.angvel()},before.angular);
  }finally{world.free();}
  const free=fixture();try{
    free.body.setAngvel({x:0,y:25,z:0},true);free.grab.begin(free.body,free.body.translation(),0);free.grab.step(1/60);free.world.step();
    assert.ok(Math.abs(free.body.angvel().y-25)<.001,'centre grab applies no torque and must not clip existing spin');
  }finally{free.world.free();}
});

test('release preserves transverse/contact movement and spin, and never boosts an already faster throw',()=>{
  const {world,body,grab}=fixture();try{
    const gesture=()=>{grab.begin(body,body.translation(),0);grab.move(v(body.translation()).add(new THREE.Vector3(.6,0,0)),.1);};
    gesture();body.setLinvel({x:1,y:-3,z:2},true);body.setAngvel({x:4,y:5,z:6},true);grab.release(.1);
    assert.ok(body.linvel().x>5);assert.equal(body.linvel().y,-3);assert.equal(body.linvel().z,2);assert.deepEqual({...body.angvel()},{x:4,y:5,z:6});
    assert.equal(world.bodies.len(),1);assert.equal(world.impulseJoints.len(),0);
    gesture();body.setLinvel({x:9,y:-2,z:0},true);grab.release(.1);assert.deepEqual({...body.linvel()},{x:9,y:-2,z:0});
    gesture();body.setLinvel({x:20,y:-3,z:0},true);grab.release(.1);assert.deepEqual({...body.linvel()},{x:20,y:-3,z:0});
  }finally{world.free();}
});

test('stationary movement samples suppress a throw before the stale window, unlike a duplicate pointerup',()=>{
  for(const rate of [30,60,144,240]){
    const {world,body,grab}=fixture();try{
      grab.begin(body,body.translation(),0);
      for(let t=1/rate;t<=.2+1e-9;t+=1/rate)grab.move({x:6*t,y:0,z:0},t);
      const stop=grab.connection.lastSample,target=grab.diagnostics.target;
      for(let t=stop+1/rate;t<stop+.09;t+=1/rate)grab.move(target,t);
      grab.move(target,stop+.09,true);grab.release(stop+.09);
      assert.equal(grab.lastRelease.threw,false,`${rate}Hz stopped before release`);
      assert.equal(world.bodies.len(),1);assert.equal(world.impulseJoints.len(),0);
    }finally{world.free();}
  }
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import {createGoblinRig,RIG_PARTS,RIG_JOINTS,worldAnchor} from '../src/goblin-rig.js';
await RAPIER.init();
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
function fixture(){const world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=1/60;
  world.createCollider(RAPIER.ColliderDesc.cuboid(6,.2,6).setTranslation(0,-.2,0).setFriction(.9));
  return {world,rig:createGoblinRig(RAPIER,world)};
}
test('rig contract has bijective body/collider/bone IDs, independent hands/feet and coincident bind anchors',()=>{
  const {world,rig}=fixture();try{
    assert.equal(rig.byId.size,15);assert.equal(new Set(RIG_PARTS.map(p=>p.bone)).size,15);
    assert.deepEqual([...rig.byId.keys()].sort(),['pelvis','torso','head','upperArmL','lowerArmL','handL','upperArmR','lowerArmR','handR','upperLegL','lowerLegL','footL','upperLegR','lowerLegR','footR'].sort());
    for(const id of ['handL','handR','footL','footR'])assert.ok(rig.byId.has(id));
    for(const entry of rig.byId.values()){
      assert.equal(rig.byBody.get(entry.body.handle),entry);assert.equal(rig.byCollider.get(entry.collider.handle),entry);
      assert.equal(entry.collider.parent().handle,entry.body.handle);assert.equal(entry.spec.bone,entry.spec.id);
      assert.ok(Math.abs(entry.body.mass()-entry.spec.mass)<1e-6,'actual collider-derived mass');
    }
    for(const s of RIG_JOINTS)assert.ok(distance(worldAnchor(rig.byId.get(s.parent).body,s.anchorA),worldAnchor(rig.byId.get(s.child).body,s.anchorB))<1e-6,s.id);
    assert.equal(rig.joints.size,14);
    for(const {spec,joint} of rig.joints.values()){
      assert.equal(joint.body1().handle,rig.byId.get(spec.parent).body.handle);
      assert.equal(joint.body2().handle,rig.byId.get(spec.child).body.handle);
      for(const [body,anchor] of [[joint.body1(),joint.anchor1()],[joint.body2(),joint.anchor2()]]){
        const q=body.rotation(),p=body.translation();
        const point=new THREE.Vector3(anchor.x,anchor.y,anchor.z).applyQuaternion(new THREE.Quaternion(q.x,q.y,q.z,q.w)).add(new THREE.Vector3(p.x,p.y,p.z));
        assert.ok(point.distanceTo(new THREE.Vector3(spec.position.x,spec.position.y,spec.position.z))<1e-6,'actual joint anchor, independent Three.js transform');
      }
    }
    for(const id of ['kneeL','kneeR','elbowL','elbowR']){
      const {spec,joint}=rig.joints.get(id);assert.equal(joint.limitsEnabled(),true);
      assert.ok(Math.abs(joint.limitsMin()-spec.limits[0])<1e-6);assert.ok(Math.abs(joint.limitsMax()-spec.limits[1])<1e-6);
    }
    const total=RIG_PARTS.reduce((sum,p)=>sum+p.mass,0);
    assert.ok(Math.abs(total-9.06)<1e-6);
    assert.ok(Math.abs(RIG_PARTS.reduce((sum,p)=>sum+p.mass*p.position.x,0))<1e-6,'symmetric COM');
  }finally{world.free();}
});
test('repeated deterministic falls/impacts stay bounded and settle; reset and disposal clear physics resources',()=>{
  const {world,rig}=fixture();try{
    let maxGap=0,maxSpeed=0,settledSpeed=0,settledAngularSpeed=0;
    for(let cycle=0;cycle<12;cycle++){
      rig.reset();
      for(const {body,spec} of rig.byId.values())body.setTranslation({...spec.position,y:spec.position.y+cycle%3},true);
      rig.byId.get(cycle%2?'head':'handL').body.applyImpulse({x:(cycle%2?1:-1)*1.5,y:.4,z:1.2},true);
      for(let step=0;step<900;step++){
        world.step();
        for(const {body} of rig.byId.values()){
          const p=body.translation(),vel=body.linvel();assert.ok(Number.isFinite(p.x+p.y+p.z));assert.ok(Math.abs(p.x)<15&&p.y>-.5&&p.y<12&&Math.abs(p.z)<15);
          maxSpeed=Math.max(maxSpeed,Math.hypot(vel.x,vel.y,vel.z));
          const q=body.rotation(),angular=body.angvel();assert.ok(Number.isFinite(q.x+q.y+q.z+q.w+angular.x+angular.y+angular.z));
          assert.ok(Math.abs(Math.hypot(q.x,q.y,q.z,q.w)-1)<1e-4);
          if(step>840){settledSpeed=Math.max(settledSpeed,Math.hypot(vel.x,vel.y,vel.z));settledAngularSpeed=Math.max(settledAngularSpeed,Math.hypot(angular.x,angular.y,angular.z));}
        }
        for(const s of RIG_JOINTS)maxGap=Math.max(maxGap,distance(worldAnchor(rig.byId.get(s.parent).body,s.anchorA),worldAnchor(rig.byId.get(s.child).body,s.anchorB)));
      }
    }
    console.log({maxGap,maxSpeed,settledSpeed,settledAngularSpeed});
    assert.ok(maxGap<.08,'joint anchor separation <8cm during impacts');assert.ok(maxSpeed<25,'bounded impact speed');assert.ok(settledSpeed<.12,'no strong persistent jitter after 14s');
    assert.ok(settledAngularSpeed<.15,'no persistent rotational jitter after 14s');
    // Seed every reset field: resting bodies alone would make zero-force assertions vacuous.
    for(const {body} of rig.byId.values()){
      body.addForce({x:3,y:2,z:1},true);body.addTorque({x:1,y:2,z:3},true);
      body.setLinvel({x:1,y:2,z:3},true);body.setAngvel({x:3,y:2,z:1},true);
      body.setRotation({x:0,y:Math.sin(.4),z:0,w:Math.cos(.4)},true);
    }
    rig.reset();for(const {body,collider,spec} of rig.byId.values()){
      assert.ok(distance(body.translation(),spec.position)<1e-6);
      const rest=spec.rotation,current=body.rotation();
      assert.ok(new THREE.Quaternion(current.x,current.y,current.z,current.w).normalize().angleTo(new THREE.Quaternion(rest.x,rest.y,rest.z,rest.w).normalize())<1e-6,'bind rotation restored');
      assert.ok(distance(collider.translation(),body.translation())<1e-6,'collider agrees immediately after reset, even before next physics step');
      const bq=body.rotation(),cq=collider.rotation();
      assert.ok(new THREE.Quaternion(bq.x,bq.y,bq.z,bq.w).normalize().angleTo(new THREE.Quaternion(cq.x,cq.y,cq.z,cq.w).normalize())<1e-6);
      for(const vector of [body.linvel(),body.angvel(),body.userForce(),body.userTorque()])assert.deepEqual({...vector},{x:0,y:0,z:0});
    }
    rig.dispose();assert.equal(world.bodies.len(),0);assert.equal(world.impulseJoints.len(),0);assert.equal(world.colliders.len(),1);assert.equal(rig.byBody.size,0);assert.equal(rig.byCollider.size,0);
  }finally{world.free();}
});
test('actual knees and elbows flex in the promised direction and enforce asymmetric stops',()=>{
  const expected={kneeL:[-.05,2.3],kneeR:[-.05,2.3],elbowL:[-2.35,.05],elbowR:[-2.35,.05]};
  const measured=[];
  for(const [id,limits] of Object.entries(expected))for(const sign of [-1,1]){
    const world=new RAPIER.World({x:0,y:0,z:0});world.timestep=1/60;
    try{
      const rig=createGoblinRig(RAPIER,world),{joint,spec}=rig.joints.get(id),parent=joint.body1(),child=joint.body2();
      for(const {body} of rig.byId.values())if(body.handle!==parent.handle&&body.handle!==child.handle)world.removeRigidBody(body);
      parent.setBodyType(RAPIER.RigidBodyType.Fixed,true);
      const pq=parent.rotation(),parentQ=new THREE.Quaternion(pq.x,pq.y,pq.z,pq.w).normalize();
      // Independent anatomical axis from the contract, deliberately not spec.axis.
      const axis=new THREE.Vector3(1,0,0).applyQuaternion(parentQ).multiplyScalar(sign*.15);
      child.applyTorqueImpulse({x:axis.x,y:axis.y,z:axis.z},true);
      let maxZDisplacement=0;
      for(let i=0;i<360;i++){
        world.step();const cq=child.rotation(),relative=parentQ.clone().invert().multiply(new THREE.Quaternion(cq.x,cq.y,cq.z,cq.w).normalize());
        assert.ok(Math.abs(relative.y)<.025&&Math.abs(relative.z)<.025,`${id}: no out-of-plane rotation`);
        maxZDisplacement=Math.max(maxZDisplacement,sign>0?-child.translation().z:child.translation().z);
      }
      const cq=child.rotation(),relative=parentQ.clone().invert().multiply(new THREE.Quaternion(cq.x,cq.y,cq.z,cq.w).normalize());
      const angle=2*Math.atan2(relative.x,relative.w);measured.push({id,sign,angle});
      assert.ok(angle>=limits[0]-.025&&angle<=limits[1]+.025,`${id} actual angle ${angle} respects stops`);
      if((id.startsWith('knee')&&sign>0)||(id.startsWith('elbow')&&sign<0)){
        assert.ok(Math.abs(angle)>.5,`${id}: useful flexion remains possible`);assert.ok(maxZDisplacement>.1,`${id}: sagittal flexion`);
      }else assert.ok(Math.abs(angle)<.08,`${id}: hyperextension is blocked`);
      assert.ok(distance(worldAnchor(parent,spec.anchorA),worldAnchor(child,spec.anchorB))<.005);
    }finally{world.free();}
  }console.log({hingeAngles:measured});
});
test('nonadjacent self contacts remain enabled; adjacent partner contacts are disabled',()=>{
  const {world,rig}=fixture();try{
    for(const {joint} of rig.joints.values())assert.equal(joint.contactsEnabled(),false);
    const hand=rig.byId.get('handL');
    hand.body.setTranslation(rig.byId.get('head').body.translation(),true);
    world.step();let contacts=0;
    world.contactPair(hand.collider,rig.byId.get('head').collider,m=>contacts+=m.numContacts());
    assert.ok(contacts>0,'hand/head self collision survives adjacent filtering');
  }finally{world.free();}
});
function fastContact(speed,ccd){
  const world=new RAPIER.World({x:0,y:0,z:0});world.timestep=1/60;
  try{
    world.createCollider(RAPIER.ColliderDesc.cuboid(2,.2,2).setTranslation(0,-.2,0));
    const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0,1.5,0).setLinvel(0,-speed,0).setCcdEnabled(ccd));
    world.createCollider(RAPIER.ColliderDesc.ball(.115).setMass(.18),body);
    for(let i=0;i<20;i++)world.step();return body.translation().y;
  }finally{world.free();}
}
test('fast small extremity contacts at 10/35/60m/s do not tunnel through the arena floor, with or without CCD',()=>{
  for(const speed of [10,35,60])for(const ccd of [false,true])assert.ok(fastContact(speed,ccd)>.09,`${speed}m/s CCD=${ccd}`);
});
test('hammer-strength extremes and fast projectiles keep articulated anchors bounded',()=>{
  const {world,rig}=fixture();try{
    let maxGap=0,tailSpeed=0,tailAngularSpeed=0;
    for(const [index,id] of ['head','handL','handR','footL','footR','pelvis'].entries()){
      rig.reset();
      rig.byId.get(id).body.applyImpulseAtPoint({x:index%2?6.2:-6.2,y:2,z:3},{...rig.byId.get(id).body.translation(),y:rig.byId.get(id).body.translation().y+.1},true);
      const ball=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0,2.3,2).setLinvel(0,0,-10));
      world.createCollider(RAPIER.ColliderDesc.ball(.16).setDensity(1.4),ball);
      for(let step=0;step<1200;step++){
        world.step();
        for(const s of RIG_JOINTS)maxGap=Math.max(maxGap,distance(worldAnchor(rig.byId.get(s.parent).body,s.anchorA),worldAnchor(rig.byId.get(s.child).body,s.anchorB)));
        for(const {body} of rig.byId.values()){
          assert.ok(Number.isFinite(body.translation().x+body.translation().y+body.translation().z));
          assert.ok(body.translation().y>-.5&&body.translation().y<20);
          const q=body.rotation(),a=body.angvel();assert.ok(Number.isFinite(q.x+q.y+q.z+q.w+a.x+a.y+a.z));
          if(step>1140){const p=body.linvel();tailSpeed=Math.max(tailSpeed,Math.hypot(p.x,p.y,p.z));tailAngularSpeed=Math.max(tailAngularSpeed,Math.hypot(a.x,a.y,a.z));}
        }
      }world.removeRigidBody(ball);
    }
    console.log({hammerMaxGap:maxGap,hammerTailSpeed:tailSpeed,hammerTailAngularSpeed:tailAngularSpeed});assert.ok(maxGap<.10);assert.ok(tailSpeed<.12);assert.ok(tailAngularSpeed<.15);
  }finally{world.free();}
});
test('10m/s direct and glancing projectiles generate real head contact manifolds',()=>{
  for(const x of [0,.5]){
    const {world,rig}=fixture();try{
      const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,2.3,2).setLinvel(0,0,-10));
      const collider=world.createCollider(RAPIER.ColliderDesc.ball(.16).setDensity(1.4),body);
      let contacts=0;for(let i=0;i<30;i++){world.step();world.contactPair(collider,rig.byId.get('head').collider,m=>contacts+=m.numContacts());}
      assert.ok(contacts>0,`head contact at lateral offset ${x}`);
    }finally{world.free();}
  }
});

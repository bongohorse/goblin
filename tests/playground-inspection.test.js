import test from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import {createUprightRun} from '../src/gameplay/upright-run.js';
import {readInspection,jointSegments} from '../src/gameplay/playground-inspection.js';
import {colliderOutline} from '../src/gameplay/playground-inspection-view.js';
import {assertFinite} from '../src/labs/standing/feedback.js';
await R.init();

test('inspection reads native geometry/units and labels missing load/event/drift without a physics write',()=>{
  const {sim,session}=createUprightRun({reaction:'B'},{record:false,audit:false});
  try{
    const before=sim.snapshot(),data=readInspection(sim,'footL');assertFinite(data);
    assert.equal(data.body_id,'footL');assert.equal(data.step,0);assert.ok(Math.abs(data.floor_gap.value-.02)<1e-6);
    assert.equal(data.floor_gap.quality,'geometry');assert.equal(data.floor_relation,'separated');
    for(const key of ['foot_load','first_contact_time','drift']){assert.equal(data[key].value,null);assert.equal(data[key].quality,'unavailable');}
    assert.deepEqual(data.pose.position.value,{...sim.rig.byId.get('footL').body.translation()});
    assert.equal(data.linear_velocity.unit,'m/s');assert.equal(data.angular_velocity.unit,'rad/s');
    assert.equal(data.joints[0].id,'ankleL');assert.equal(data.joints[0].motor.cap.unit,'Nm');assert.equal(data.joints[0].motor.solver_torque.value,null);
    const shoulder=readInspection(sim,'upperArmL').joints.find(j=>j.id==='shoulderL');assert.equal(shoulder.angle.value,null);assert.equal(shoulder.limits.value,null);
    const head=readInspection(sim,'head');assert.equal(head.floor_gap.value,null);assert.equal(readInspection(sim,'missing'),null);
    const vertices=jointSegments(sim.rig);assert.equal(vertices.length,14*30);assert.ok(vertices.every(Number.isFinite));
    assert.deepEqual(sim.snapshot(),before);data.pose.position.value.y=100;assert.notEqual(sim.rig.byId.get('footL').body.translation().y,100);
  }finally{session.dispose();}
});

for(const variant of ['B','T1','R1'])test(variant+': repeated readouts/lines/collider outlines leave exact native motion unchanged',()=>{
  const options=variant==='B'?{reaction:'B'}:{reaction:'T1',returnProfile:variant==='R1'?'R1':'legacy'};
  const baseline=createUprightRun(options,{record:false,audit:false}),candidate=createUprightRun(options,{record:false,audit:false});
  try{
    for(let step=0;step<140;step++){
      if(step===20||step===85){baseline.sim.push(step===85);candidate.sim.push(step===85);}
      baseline.session.singleStep();candidate.session.singleStep();
      const before=candidate.sim.snapshot();
      for(const id of ['pelvis','head','footL'])assertFinite(readInspection(candidate.sim,id));
      jointSegments(candidate.sim.rig);
      if(step%30===0)for(const {collider} of candidate.sim.rig.byId.values())assert.ok(colliderOutline(collider).every(Number.isFinite));
      assert.deepEqual(candidate.sim.snapshot(),before);assert.deepEqual(candidate.sim.snapshot(),baseline.sim.snapshot());
    }
    const d=readInspection(candidate.sim,'pelvis');assert.equal(d.run.assist_enabled,false);assert.equal(d.joints[0].motor.enabled,false);assert.equal(d.joints[0].motor.cap.value,0);assert.equal(d.assist.support.value,0);
    assert.equal(candidate.session.trace.length,0);assert.equal(candidate.session.events.length,0);
  }finally{baseline.session.dispose();candidate.session.dispose();}
});

test('collider outlines use actual native ball/capsule/cuboid sizes independently of render meshes',()=>{
  const world=new R.World({x:0,y:0,z:0});
  try{
    for(const [desc,expected] of [[R.ColliderDesc.ball(.7),[.7,.7,.7]],[R.ColliderDesc.capsule(.3,.2),[.2,.5,.2]],[R.ColliderDesc.cuboid(.1,.2,.4),[.1,.2,.4]]]){
      const collider=world.createCollider(desc),values=colliderOutline(collider),g=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(values,3));g.computeBoundingBox();
      const actual=g.boundingBox.max.toArray();for(let i=0;i<3;i++)assert.ok(Math.abs(actual[i]-expected[i])<1e-6);assert.equal(values.length%6,0);g.dispose();
    }
  }finally{world.free();}
});

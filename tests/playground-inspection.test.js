import test from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import {createUprightRun} from '../src/gameplay/upright-run.js';
import {readInspection,jointSegments,readJointGeometry,anchorGapClass,formatGap} from '../src/gameplay/playground-inspection.js';
import {jointObservation} from '../src/labs/standing/math.js';
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
      const sample=readJointGeometry(candidate.sim);
      for(const id of candidate.sim.rig.byId.keys()){
        const d=readInspection(candidate.sim,id,sample);
        for(const j of d.joints){assert.equal(j.anchor_gap.step,d.step);assert.equal(j.anchor_gap.value,sample.joints.find(s=>s.id===j.id).anchor_gap.value);}
      }
      if(step%30===0)for(const {collider} of candidate.sim.rig.byId.values())assert.ok(colliderOutline(collider).every(Number.isFinite));
      assert.deepEqual(candidate.sim.snapshot(),before);assert.deepEqual(candidate.sim.snapshot(),baseline.sim.snapshot());
    }
    const d=readInspection(candidate.sim,'pelvis');assert.equal(d.run.assist_enabled,false);assert.equal(d.joints[0].motor.enabled,false);assert.equal(d.joints[0].motor.cap.value,0);assert.equal(d.assist.support.value,0);
    assert.equal(candidate.session.trace.length,0);assert.equal(candidate.session.events.length,0);
  }finally{baseline.session.dispose();candidate.session.dispose();}
});

test('D1 uses exact metres-to-mm thresholds; tiny positive, zero and unavailable stay distinct',()=>{
  for(const [mm,label] of [[0,'≤1 mm'],[.001,'≤1 mm'],[1,'≤1 mm'],[1.001,'1–5 mm'],[5,'1–5 mm'],[5.001,'5–20 mm'],[20,'5–20 mm'],[20.001,'>20 mm'],[30,'>20 mm']]){
    const c=anchorGapClass(mm/1000);assert.equal(c.label,label);assert.ok(Math.abs(c.mm-mm)<1e-12);
  }
  assert.equal(formatGap(0),'0.000 mm');assert.equal(formatGap(.00000001),'<0.001 mm');
  for(const v of [null,undefined,NaN,Infinity,-.01]){assert.equal(anchorGapClass(v).mm,null);assert.equal(formatGap(v),'N/A');}
});

test('D1 maps unequal adjacent joints and every segment to their own geometry range and inspector value',()=>{
  const {sim,session}=createUprightRun({reaction:'B'},{record:false,audit:false});
  try{
    for(const [id,offset] of [['shoulderL',.003],['elbowL',.025]]){
      const j=sim.rig.joints.get(id).joint,a=j.anchor2();j.setAnchor2({x:a.x+offset,y:a.y,z:a.z});
    }
    const before=sim.snapshot(),sample=readJointGeometry(sim);
    assert.equal(sample.joints.length,14);assert.equal(sample.vertices.length,420);
    for(const [index,j] of sample.joints.entries()){
      assert.equal(j.start,index*10);assert.equal(j.count,10);
      assert.deepEqual(sample.vertices.slice(j.start*3+6,j.start*3+12),[...Object.values(j.anchors.a),...Object.values(j.anchors.b)]);
      assert.ok(Math.abs(j.anchor_gap.value-jointObservation(sim.entries.find(e=>e.spec.id===j.id)).anchor_error)<1e-12);
    }
    assert.equal(sample.joints.find(j=>j.id==='shoulderL').level.label,'1–5 mm');assert.equal(sample.joints.find(j=>j.id==='elbowL').level.label,'>20 mm');
    assertFinite(sample);assert.deepEqual(JSON.parse(JSON.stringify(sample)),sample);
    for(const id of sim.rig.byId.keys())for(const j of readInspection(sim,id,sample).joints)assert.deepEqual(j.anchor_gap,sample.joints.find(s=>s.id===j.id).anchor_gap);
    assert.deepEqual(sim.snapshot(),before);
    // Removed joint and non-finite source are labelled unavailable, never green or NaN GPU vertices.
    const removed=sim.rig.joints.get('elbowL');sim.rig.joints.delete('elbowL');
    const missing=readJointGeometry(sim),m=missing.joints.find(j=>j.id==='elbowL');assert.equal(m.level.label,'N/A');assert.equal(m.anchor_gap.value,null);
    assert.equal(readInspection(sim,'lowerArmL',missing).joints.find(j=>j.id==='elbowL').anchor_gap.value,null);
    sim.rig.joints.set('elbowL',removed);
    const joint=sim.rig.joints.get('neck').joint,anchor=joint.anchor1.bind(joint);joint.anchor1=()=>({x:NaN,y:1,z:0});
    const invalid=readJointGeometry(sim);joint.anchor1=anchor;
    assert.equal(invalid.joints.find(j=>j.id==='neck').level.label,'N/A');assert.ok(invalid.vertices.every(Number.isFinite));
    session.singleStep();assert.throws(()=>readInspection(sim,'head',sample),/same|share/);
  }finally{session.dispose();}
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

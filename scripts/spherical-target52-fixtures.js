import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Quaternion,Matrix4,Vector3} from 'three';
import {sphericalMotorView,commandMotor,IDENTITY,MOTOR_AXES} from '../src/labs/standing/motors.js';
import {vec,scale,add,sub,norm,rotate,multiply,conjugate,rotationDistance} from '../src/labs/standing/math.js';
import {REPRESENTATIONS,nativeTargets,commandFixed} from './spherical-target52-contract.js';
const axis=(k,a)=>({...scale({...vec(),[k]:1},Math.sin(a/2)),w:Math.cos(a/2)});
const quat=q=>new Quaternion(q.x,q.y,q.z,q.w);
const matrix=q=>new Matrix4().makeRotationFromQuaternion(quat(q));
const worlds=[{world:IDENTITY,f1:IDENTITY,f2:IDENTITY},
  {world:multiply(axis('y',.7),axis('z',-.4)),f1:multiply(axis('x',.4),axis('z',.2)),f2:multiply(axis('z',-.5),axis('y',.3))}];
const targets=[IDENTITY,...['x','y','z'].flatMap(k=>[axis(k,.3),axis(k,-.3)]),multiply(axis('x',.3),axis('y',-.25)),multiply(axis('z',-.35),multiply(axis('y',.2),axis('x',-.15)))];
function fixture(frames){
  const world=new R.World(vec());world.timestep=1/60;world.integrationParameters.numSolverIterations=32;
  const a=world.createRigidBody(R.RigidBodyDesc.dynamic().setRotation(frames.world).setCanSleep(false));
  // Independent Three.js initialization: B=P*F1*inverse(F2) gives neutral attachments.
  const initial=quat(frames.world).multiply(quat(frames.f1)).multiply(quat(frames.f2).invert());
  const b=world.createRigidBody(R.RigidBodyDesc.dynamic().setRotation(initial).setCanSleep(false));
  world.createCollider(R.ColliderDesc.ball(.4).setMass(1),a);world.createCollider(R.ColliderDesc.ball(.4).setMass(2),b);
  const descriptor=R.JointData.spherical(vec(),vec()),created=world.createImpulseJoint(descriptor,a,b,true);
  const joint=sphericalMotorView(world,created,descriptor);joint.setContactsEnabled(false);joint.setFrameX1(frames.f1);joint.setFrameX2(frames.f2);
  return {world,a,b,joint,frames};
}
const relative=f=>multiply(conjugate(multiply(f.a.rotation(),f.frames.f1)),multiply(f.b.rotation(),f.frames.f2));
const momentum=b=>scale(b.angvel(),b.principalInertia().x);
function command(f,representation,target,cap){
  const gains={stiffness:100,damping:12,max_torque_Nm:cap};
  if(representation==='moving-frame')commandMotor(f.joint,'spherical',target,gains,f.frames.f1);
  else commandFixed(f.joint,target,gains);
}
function matrixError(f,target){
  const actual=matrix(f.b.rotation()).multiply(matrix(f.frames.f2));
  const expected=matrix(f.a.rotation()).multiply(matrix(f.frames.f1)).multiply(matrix(target));
  return Math.hypot(...actual.elements.map((v,i)=>v-expected.elements[i]));
}
export function verifyTargetFixtures(){
  const report={schema_version:1,report_kind:'spherical-target-fixtures-v1',tracking:[],cap_reaction:[],negative:[],paired:[]};
  for(const [frame_index,frames] of worlds.entries())for(const cap of [20,1])for(const [target_index,target] of targets.entries()){
    const runs=[];
    for(const representation of REPRESENTATIONS)for(const q_sign of [1,-1]){
      const signed=Object.fromEntries(Object.entries(target).map(([k,v])=>[k,v*q_sign]));
      const f=fixture(frames),trace=[];try{
        command(f,representation,signed,cap);
        const commanded_frame={...f.joint.frameX1()};
        for(let step=1;step<=240;step++){f.world.step();trace.push({relative:relative(f),a_velocity:{...f.a.angvel()},b_velocity:{...f.b.angvel()}});}
        const error=rotationDistance(relative(f),target),velocity=norm(sub(f.b.angvel(),f.a.angvel())),matrix_error=matrixError(f,target);
        assert.ok(error<.01&&velocity<.01&&matrix_error<.01,JSON.stringify({representation,cap,frame_index,target_index,error,velocity,matrix_error}));
        if(representation==='fixed-native')assert.ok(rotationDistance(f.joint.frameX1(),frames.f1)<1e-6&&rotationDistance(f.joint.frameX2(),frames.f2)<1e-6);
        const row={frame_index,frames,cap,target_index,target:signed,representation,q_sign,native_targets:representation==='fixed-native'?nativeTargets(signed):[0,0,0],commanded_frame,error_rad:error,relative_speed_rad_s:velocity,matrix_error,actual:relative(f)};
        report.tracking.push(row);runs.push({...row,trace});
      }finally{f.world.free();}
    }
    const sameSign=REPRESENTATIONS.map(representation=>{
      const a=runs.find(r=>r.representation===representation&&r.q_sign===1),b=runs.find(r=>r.representation===representation&&r.q_sign===-1);
      const angle=Math.max(...a.trace.map((s,i)=>rotationDistance(s.relative,b.trace[i].relative)));
      const velocity=Math.max(...a.trace.map((s,i)=>norm(sub(s.a_velocity,b.trace[i].a_velocity))),...a.trace.map((s,i)=>norm(sub(s.b_velocity,b.trace[i].b_velocity))));
      assert.ok(angle<1e-5&&velocity<1e-4);return {representation,max_q_sign_angle_rad:angle,max_q_sign_velocity_rad_s:velocity};
    });
    const [moving,fixed]=runs.filter(r=>r.q_sign===1),max_angle=Math.max(...moving.trace.map((s,i)=>rotationDistance(s.relative,fixed.trace[i].relative))),max_velocity=Math.max(...moving.trace.map((s,i)=>norm(sub(s.a_velocity,fixed.trace[i].a_velocity))));
    if(target_index===0)assert.ok(max_angle<1e-5&&max_velocity<1e-4);
    report.paired.push({frame_index,cap,target_index,max_trajectory_angle_difference_rad:max_angle,max_parent_velocity_difference_rad_s:max_velocity,q_sign_comparisons:sameSign});
  }
  for(const representation of REPRESENTATIONS)for(const cap of [.05,1,20])for(const sign of [-1,1]){
    const f=fixture({world:axis('y',.7),f1:IDENTITY,f2:IDENTITY});try{
      command(f,representation,targets[7],cap);
      const frame=multiply(f.a.rotation(),f.joint.frameX1());
      // Diagnostic velocity saturation, not a position-tracking or Standing run.
      for(const motor_axis of MOTOR_AXES)f.joint.configureMotor(motor_axis,0,sign*100,100,12);
      f.world.step();const effort=rotate(scale(momentum(f.b),1/f.world.timestep),conjugate(frame)),residual=norm(add(momentum(f.a),momentum(f.b))),ratio=norm(f.a.angvel())/norm(f.b.angvel());
      for(const k of ['x','y','z'])assert.ok(Math.abs(effort[k]-sign*cap)<=Math.max(1e-4,cap*1e-5));assert.ok(residual<1e-6&&Math.abs(ratio-2)<1e-4,JSON.stringify({representation,cap,sign,residual,ratio,effort,ia:f.a.principalInertia(),ib:f.b.principalInertia(),qa:f.a.rotation(),qb:f.b.rotation()}));
      report.cap_reaction.push({representation,cap,sign,pre_step_motor_frame:frame,effort_Nm:effort,momentum_residual:residual,angular_speed_ratio:ratio});
    }finally{f.world.free();}
  }
  for(const representation of REPRESENTATIONS)for(const mode of ['off','wrong-sign','wrong-axis']){
    const f=fixture(worlds[1]);try{
      if(mode!=='off')command(f,representation,mode==='wrong-sign'?axis('x',-.3):axis('y',.3),20);
      for(let step=0;step<240;step++)f.world.step();const error=rotationDistance(relative(f),axis('x',.3));assert.ok(error>.15);
      report.negative.push({representation,mode,intended:axis('x',.3),error_rad:error});
    }finally{f.world.free();}
  }
  // Preserve the pilot's strict-tolerance miss, rather than erase it by loosening
  // the bound. The dedicated cap rows use common body frames as in the reference
  // effort oracle; arbitrary bind-frame tracking is verified separately above.
  const probe=fixture(worlds[1]);try{
    command(probe,'fixed-native',targets[7],20);
    for(const a of MOTOR_AXES)probe.joint.configureMotor(a,0,100,100,12);
    probe.world.step();const residual=norm(add(momentum(probe.a),momentum(probe.b)));
    report.counterreaction_resolution_probe={representation:'fixed-native',frames:worlds[1],cap:20,sign:1,momentum_residual:residual,strict_1e_6_pass:residual<1e-6,
      classification:'Strict momentum-oracle miss with rotated bodies; cause not diagnosed; not a passing cap/reaction fixture'};
  }finally{probe.world.free();}
  // Algebraic coordinate oracle, independent of project Hamilton-product helpers.
  report.mapping_oracle=targets.map(target=>{
    const coordinates=nativeTargets(target),xyz=coordinates.map(a=>Math.sin(a/2)),reconstructed=new Quaternion(...xyz,Math.sqrt(Math.max(0,1-xyz.reduce((s,v)=>s+v*v,0))));
    const matrix_delta=matrix(target).elements.map((v,i)=>v-new Matrix4().makeRotationFromQuaternion(reconstructed).elements[i]);
    const error=Math.hypot(...matrix_delta);assert.ok(error<1e-12);return {target,coordinates,matrix_error:error};
  });
  // Keep imported independent oracle version identifiable in the harness.
  assert.ok(new Vector3(1,0,0).applyQuaternion(quat(axis('z',Math.PI/2))).distanceTo(new Vector3(0,1,0))<1e-12);
  return report;
}

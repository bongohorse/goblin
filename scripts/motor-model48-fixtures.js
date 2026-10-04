import fs from 'node:fs';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {initRapier} from '../src/labs/standing/simulation.js';
import {commandMotor,sphericalMotorView,IDENTITY,MOTOR_AXES} from '../src/labs/standing/motors.js';
import {vec,scale,add,sub,norm,rotate,conjugate,multiply,rotationDistance} from '../src/labs/standing/math.js';
import {standingBuild} from './standing-provenance.js';
export const CALIBRATED={stiffness:2343.75,damping:281.25};
const qaxis=(axis,angle)=>({...scale(axis,Math.sin(angle/2)),w:Math.cos(angle/2)});
function fixture(type,base=IDENTITY,massScale=1){
  const world=new R.World(vec());world.timestep=1/60;world.integrationParameters.numSolverIterations=32;
  const a=world.createRigidBody(R.RigidBodyDesc.dynamic().setRotation(base).setCanSleep(false)),b=world.createRigidBody(R.RigidBodyDesc.dynamic().setRotation(base).setCanSleep(false));
  world.createCollider(R.ColliderDesc.ball(.4).setMass(massScale),a);world.createCollider(R.ColliderDesc.ball(.4).setMass(2*massScale),b);
  const descriptor=type==='spherical'?R.JointData.spherical(vec(),vec()):R.JointData.revolute(vec(),vec(),vec(1));
  const created=world.createImpulseJoint(descriptor,a,b,true),joint=type==='spherical'?sphericalMotorView(world,created,descriptor):created;
  joint.setContactsEnabled(false);if(type==='revolute')joint.setLimits(-.35,.7);
  return {world,a,b,joint,type};
}
const relative=f=>multiply(conjugate(f.a.rotation()),f.b.rotation());
const momentum=b=>scale(b.angvel(),b.principalInertia().x);
export function verifyModelFixtures(){
  const report={fixture:'centred isotropic dynamic1/2kg spheres r.4, no gravity/contact/damping, Solver32',cap_rows:[],tracking_rows:[],calibration:[],mass_scaling:[]};
  for(const model of ['ForceBased','AccelerationBased']){
    for(const type of ['revolute','spherical'])for(const cap of [.05,1,20])for(const sign of [-1,1]){
      const f=fixture(type,qaxis(vec(0,1),.7));try{
        if(type==='spherical')for(const axis of MOTOR_AXES){f.joint.configureMotorModel(axis,R.MotorModel[model]);f.joint.setMotorMaxForce(axis,cap);f.joint.configureMotor(axis,0,sign*100,100,12);}
        else {f.joint.configureMotorModel(R.MotorModel[model]);f.joint.setMotorMaxForce(cap);f.joint.configureMotor(0,sign*100,100,12);}
        const frame=multiply(f.a.rotation(),f.joint.frameX1());f.world.step();
        const effort=rotate(scale(momentum(f.b),1/f.world.timestep),conjugate(frame)),residual=norm(add(momentum(f.a),momentum(f.b)));
        for(const axis of type==='revolute'?['x']:['x','y','z'])assert.ok(Math.abs(effort[axis]-sign*cap)<=Math.max(1e-4,cap*1e-5),JSON.stringify({model,type,cap,effort}));
        assert.ok(residual<1e-6);assert.ok(Math.abs(norm(f.a.angvel())/norm(f.b.angvel())-2)<1e-4);
        report.cap_rows.push({model,type,cap,sign,effort_Nm:effort,total_effort_Nm:norm(effort),momentum_residual:residual});
      }finally{f.world.free();}
    }
    for(const type of ['revolute','spherical'])for(const base of [IDENTITY,qaxis(vec(0,1),.7)]){
      const targets=type==='revolute'?[.25,-.25]:[...['x','y','z'].flatMap(k=>[.3,-.3].map(angle=>qaxis({...vec(),[k]:1},angle))),multiply(qaxis(vec(1),.3),qaxis(vec(0,1),-.25))];
      for(const target of targets){const f=fixture(type,base);try{
        commandMotor(f.joint,type,target,{model,stiffness:100,damping:12,max_torque_Nm:20});for(let i=0;i<240;i++)f.world.step();
        const error=rotationDistance(relative(f),type==='revolute'?qaxis(vec(1),target):target);assert.ok(error<.01);
        report.tracking_rows.push({model,type,target,base,error_rad:error});
      }finally{f.world.free();}}
    }
    for(const type of ['revolute','spherical'])for(const mode of ['off','wrong-sign','wrong-axis']){
      if(type==='revolute'&&mode==='wrong-axis')continue;const f=fixture(type);try{
        const intended=type==='revolute'?.25:qaxis(vec(1),.3),wrong=type==='revolute'?-.25:qaxis(mode==='wrong-axis'?vec(0,1):vec(1),mode==='wrong-axis'?.3:-.3);
        if(mode!=='off')commandMotor(f.joint,type,wrong,{model,stiffness:100,damping:12,max_torque_Nm:20});for(let i=0;i<240;i++)f.world.step();
        assert.ok(rotationDistance(relative(f),type==='revolute'?qaxis(vec(1),intended):intended)>.15);
      }finally{f.world.free();}
    }
    const missing=fixture('spherical');try{for(const axis of MOTOR_AXES){missing.joint.configureMotorModel(axis,R.MotorModel[model]);missing.joint.configureMotor(axis,0,100,100,12);}missing.world.step();assert.ok(norm(momentum(missing.b))/missing.world.timestep>20,'uncapped response exceeds intended20');}finally{missing.world.free();}
  }
  for(const type of ['revolute','spherical'])for(const cap of [20,1]){
    const f=fixture(type),a=fixture(type),target=type==='revolute'?.25:multiply(qaxis(vec(1),.3),qaxis(vec(0,1),-.25));
    let maxAngle=0,maxVelocity=0;try{
      commandMotor(f.joint,type,target,{model:'ForceBased',stiffness:100,damping:12,max_torque_Nm:cap});commandMotor(a.joint,type,target,{model:'AccelerationBased',...CALIBRATED,max_torque_Nm:cap});
      for(let i=0;i<240;i++){f.world.step();a.world.step();maxAngle=Math.max(maxAngle,rotationDistance(relative(f),relative(a)));maxVelocity=Math.max(maxVelocity,norm(sub(f.b.angvel(),a.b.angvel())),norm(sub(f.a.angvel(),a.a.angvel())));}
      assert.ok(maxAngle<=1e-5&&maxVelocity<=1e-4,JSON.stringify({type,cap,maxAngle,maxVelocity}));report.calibration.push({type,cap,max_angle_difference_rad:maxAngle,max_velocity_difference_rad_s:maxVelocity});
    }finally{f.world.free();a.world.free();}
  }
  for(const model of ['ForceBased','AccelerationBased']){
    const rows=[],first=[];for(const massScale of [1,2]){const f=fixture('revolute',IDENTITY,massScale);try{commandMotor(f.joint,'revolute',.25,{model,stiffness:100,damping:12,max_torque_Nm:Number.MAX_VALUE});for(let i=0;i<10;i++){f.world.step();if(i===0)first.push(relative(f));}rows.push(relative(f));}finally{f.world.free();}}
    const difference=rotationDistance(...first);assert.ok(model==='AccelerationBased'?difference<1e-5:difference>.001,JSON.stringify({model,difference,first}));report.mass_scaling.push({model,first_step_orientations:first,first_step_difference_rad:difference,step10_orientations:rows,step10_difference_rad:rotationDistance(...rows)});
  }
  return report;
}
if(process.argv[1]?.endsWith('motor-model48-fixtures.js')){await initRapier();const report={...standingBuild(),...verifyModelFixtures()};fs.writeFileSync(process.env.GOBLIN_MODEL_FIXTURE_OUTPUT??'../.standing-tools/model48-fixtures.json',JSON.stringify(report)+'\n');console.log(JSON.stringify({cap_rows:report.cap_rows.length,tracking_rows:report.tracking_rows.length,calibration:report.calibration,mass_scaling:report.mass_scaling}));}

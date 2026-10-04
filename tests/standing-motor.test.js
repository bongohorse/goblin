import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {initRapier} from '../src/labs/standing/simulation.js';
import {sphericalMotorView,commandMotor,IDENTITY} from '../src/labs/standing/motors.js';
import {vec,multiply,conjugate,rotationDistance,rotate,scale,add,norm,sub} from '../src/labs/standing/math.js';
await initRapier();
const qaxis=(axis,angle)=>({...scale(axis,Math.sin(angle/2)),w:Math.cos(angle/2)});
const relative=f=>multiply(conjugate(f.a.rotation()),f.b.rotation());
const settings={stiffness:100,damping:12,max_torque_Nm:20};
function fixture(type,initial=IDENTITY){
  const world=new R.World(vec());world.timestep=1/60;world.integrationParameters.numSolverIterations=8;
  const a=world.createRigidBody(R.RigidBodyDesc.dynamic().setRotation(initial).setCanSleep(false));
  const b=world.createRigidBody(R.RigidBodyDesc.dynamic().setRotation(initial).setCanSleep(false));
  world.createCollider(R.ColliderDesc.ball(.4).setMass(1),a);world.createCollider(R.ColliderDesc.ball(.4).setMass(2),b);
  const descriptor=type==='spherical'?R.JointData.spherical(vec(),vec()):R.JointData.revolute(vec(),vec(),vec(1));
  const original=world.createImpulseJoint(descriptor,a,b,true);
  const joint=type==='spherical'?sphericalMotorView(world,original,descriptor):original;joint.setContactsEnabled(false);
  if(type==='revolute')joint.setLimits(-.35,.7);
  return {world,a,b,joint,original,type,descriptor};
}
function converge(f,target,enabled=true){if(enabled)commandMotor(f.joint,f.type,target,settings);for(let i=0;i<240;i++)f.world.step();return relative(f);}
const momentum=body=>scale(body.angvel(),body.principalInertia().x); // isotropic centred sphere, in world space

test('public spherical descriptor view preserves one physical joint; installed factory mismatch is explicit',()=>{
  const f=fixture('spherical');try{assert.equal(f.original.type(),R.JointType.Generic);assert.equal(typeof f.original.configureMotor,'undefined');assert.equal(f.joint.handle,f.original.handle);assert.equal(f.world.impulseJoints.len(),1);assert.equal(typeof f.joint.configureMotor,'function');}finally{f.world.free();}
  const r=fixture('revolute');try{assert.throws(()=>sphericalMotorView(r.world,r.original,r.descriptor));}finally{r.world.free();}
});

test('revolute tracks both signs and respects asymmetric limits; off and wrong sign fail the intended target',()=>{
  for(const target of [.25,-.25,.65]){const f=fixture('revolute');try{const actual=converge(f,target);assert.ok(rotationDistance(actual,qaxis(vec(1),target))<.01);assert.ok(norm(sub(f.a.angvel(),f.b.angvel()))<.01);}finally{f.world.free();}}
  for(const target of [-1,1]){const f=fixture('revolute');try{const actual=converge(f,target);const angle=2*Math.atan2(actual.x,actual.w);assert.ok(angle>=-.351&&angle<=.701,'real motor cannot drive through the authored stops');}finally{f.world.free();}}
  for(const command of [null,-.25]){const f=fixture('revolute');try{const actual=converge(f,command,command!==null);assert.ok(rotationDistance(actual,qaxis(vec(1),.25))>.15);}finally{f.world.free();}}
});

test('spherical moving-frame targets track every axis/sign and combined orientation in rotated world frames',()=>{
  const bases=[IDENTITY,multiply(qaxis(vec(0,1),.7),qaxis(vec(0,0,1),-.4))];
  const targets=[...['x','y','z'].flatMap(k=>[.3,-.3].map(a=>qaxis({...vec(),[k]:1},a))),multiply(qaxis(vec(1),.3),multiply(qaxis(vec(0,1),-.25),qaxis(vec(0,0,1),.2)))];
  for(const base of bases)for(const target of targets){const f=fixture('spherical',base);try{
    const actual=converge(f,target);assert.ok(rotationDistance(actual,target)<.01,JSON.stringify({base,target,actual}));
    assert.ok(norm(sub(f.a.angvel(),f.b.angvel()))<.01);assert.ok(norm(sub(f.a.translation(),f.b.translation()))<1e-6);
  }finally{f.world.free();}}
  for(const target of [null,qaxis(vec(0,1),.3),qaxis(vec(1),-.3)]){const f=fixture('spherical');try{const actual=converge(f,target,target!==null);assert.ok(rotationDistance(actual,qaxis(vec(1),.3))>.2,'off/wrong axis/wrong sign must be distinguishable');}finally{f.world.free();}}
});

test('saturated native motor impulse/cap and unequal-inertia counterreaction measured, not inferred from setters',()=>{
  const rows=[];
  for(const type of ['revolute','spherical'])for(const sign of [-1,1]){
    const f=fixture(type,qaxis(vec(0,1),.7));try{
      const target=type==='revolute'?sign*.3:qaxis(vec(1),sign*1.2);
      commandMotor(f.joint,type,target,{...settings,max_torque_Nm:.05});
      const frame=multiply(f.a.rotation(),f.joint.frameX1());f.world.step();
      const la=momentum(f.a),lb=momentum(f.b),effort=rotate(scale(lb,1/f.world.timestep),conjugate(frame));
      assert.ok(Math.abs(effort.x-sign*.05)<1e-5);assert.ok(norm(add(la,lb))<1e-7);
      assert.ok(Math.abs(norm(f.a.angvel())/norm(f.b.angvel())-2)<1e-5,'unequal inertias give unequal angular velocities');
      rows.push({type,sign,effort_Nm:effort,momentum_residual:norm(add(la,lb))});
    }finally{f.world.free();}
  }
  const f=fixture('spherical');try{
    const target=multiply(qaxis(vec(1),.8),multiply(qaxis(vec(0,1),.7),qaxis(vec(0,0,1),.6)));
    commandMotor(f.joint,'spherical',target,{...settings,max_torque_Nm:.05});const frame=f.joint.frameX1();f.world.step();
    const effort=rotate(scale(momentum(f.b),1/f.world.timestep),conjugate(frame));
    for(const n of Object.values(effort))assert.ok(Math.abs(n)<=.0501);assert.ok(norm(effort)>.06,'per-axis cap is not a vector-magnitude cap');assert.ok(norm(add(momentum(f.a),momentum(f.b)))<1e-7);
    rows.push({type:'combined',effort_Nm:effort,total_effort_Nm:norm(effort)});
  }finally{f.world.free();}
  const uncapped=fixture('spherical');try{commandMotor(uncapped.joint,'spherical',qaxis(vec(1),1.2),{...settings,max_torque_Nm:Number.MAX_VALUE});uncapped.world.step();assert.ok(norm(momentum(uncapped.b))/uncapped.world.timestep>.1,'missing-cap counterfactual exceeds intended .05 Nm');}finally{uncapped.world.free();}
  console.log('Native cap/counterreaction diagnostic',JSON.stringify(rows));
});

// Explicit experimental harness; not connected to gameplay or a passing G3 test.
import R from '@dimforge/rapier3d-compat';
import {writeFileSync} from 'node:fs';
import {createGoblinRig,rotateVector,worldAnchor} from '../src/goblin-rig.js';
await R.init();
const profiles=[{name:'passive'},{name:'joint-motors',motors:true},{name:'ankle-feedback',motors:true,ankle:true},{name:'supported-balance',motors:true,balance:true},{name:'balance-extra-two',motors:true,balance:true,iterations:2},{name:'balance-extra-twelve',motors:true,balance:true,iterations:12},{name:'balance-extra-sixteen',motors:true,balance:true,iterations:16},{name:'balance-foot-friction-two',motors:true,balance:true,friction:2},{name:'balance-velocity-minus-30',motors:true,balance:true,velocity:-30},{name:'balance-velocity-plus-30',motors:true,balance:true,velocity:30}];
function experiment(p){
 const world=new R.World({x:0,y:-9.81,z:0});world.timestep=1/60;
 const floor=world.createCollider(R.ColliderDesc.cuboid(6,.2,6).setTranslation(0,-.2,0).setFriction(.9));
 const rig=createGoblinRig(R,world),feet=['footL','footR'].map(id=>rig.byId.get(id));
 for(const {body} of rig.byId.values())body.setAdditionalSolverIterations(p.iterations||0);
 for(const f of feet)if(p.friction)f.collider.setFriction(p.friction);
 if(p.motors)for(const {spec,joint:original} of rig.joints.values()){
  // Exported public typed facade over the same handle: 0.21 reports spherical as Generic.
  const joint=spec.type==='spherical'?new R.SphericalImpulseJoint(world.impulseJoints.raw,world.bodies,original.handle):original;
  if(spec.type==='spherical'){
   joint.setFrameX1(rig.byId.get(spec.child).spec.rotation);
   for(const axis of [R.JointAxis.AngX,R.JointAxis.AngY,R.JointAxis.AngZ]){joint.configureMotorModel(axis,R.MotorModel.ForceBased);joint.configureMotor(axis,0,0,100,12);joint.setMotorMaxForce(axis,12);}
  }else{joint.configureMotorModel(R.MotorModel.ForceBased);joint.configureMotor(0,0,100,12);joint.setMotorMaxForce(12);}
 }
 let minHead=Infinity,minUp=1,maxDrift=0,maxGap=0,fallenAt=null,totalMs=0,maxTorque=0,activeSteps=0,maxInternalTorqueResidual=0;
 try{for(let step=0;step<3600;step++){
  const began=performance.now();for(const {body} of rig.byId.values())body.resetTorques(false);
  const pelvis=rig.byId.get('pelvis').body,up=rotateVector({x:0,y:1,z:0},pelvis.rotation()),av=pelvis.angvel();
  let mass=0,z=0,vx=0,vz=0;for(const {body} of rig.byId.values()){const m=body.mass();mass+=m;z+=m*body.translation().z;vx+=m*body.linvel().x;vz+=m*body.linvel().z;}
  const supported=[];for(const f of feet)world.contactPair(f.collider,floor,m=>{if(m.numSolverContacts()>0&&!supported.includes(f))supported.push(f);});
  if(p.ankle){const center=(feet[0].body.translation().z+feet[1].body.translation().z)/2;const target=Math.max(-.25,Math.min(.25,1.5*(z/mass-center)+.4*vz/mass));for(const id of ['ankleL','ankleR'])rig.joints.get(id).joint.configureMotor(target,0,100,12);}
  if(p.balance&&supported.length&&up.y>.65){
   let t={x:-100*up.z-20*av.x+(p.velocity||0)*vz/mass,y:-5*av.y,z:100*up.x-20*av.z-(p.velocity||0)*vx/mass};
   const scale=Math.min(1,24/(Math.hypot(t.x,t.y,t.z)||1));t={x:t.x*scale,y:t.y*scale,z:t.z*scale};pelvis.addTorque(t,true);const residual={...t};
   for(const f of supported){const reaction={x:-t.x/supported.length,y:-t.y/supported.length,z:-t.z/supported.length};f.body.addTorque(reaction,true);for(const axis of ['x','y','z'])residual[axis]+=reaction[axis];}
   maxTorque=Math.max(maxTorque,Math.hypot(t.x,t.y,t.z));maxInternalTorqueResidual=Math.max(maxInternalTorqueResidual,Math.hypot(residual.x,residual.y,residual.z));activeSteps++;
  }
  world.step();totalMs+=performance.now()-began;
  const head=rig.byId.get('head').body.translation(),root=pelvis.translation(),torsoUp=rotateVector({x:0,y:1,z:0},rig.byId.get('torso').body.rotation()).y;
  minHead=Math.min(minHead,head.y);minUp=Math.min(minUp,torsoUp);maxDrift=Math.max(maxDrift,Math.hypot(root.x,root.z));if(fallenAt===null&&(head.y<1.3||torsoUp<.65))fallenAt=(step+1)/60;
  for(const {spec} of rig.joints.values()){const a=worldAnchor(rig.byId.get(spec.parent).body,spec.anchorA),b=worldAnchor(rig.byId.get(spec.child).body,spec.anchorB);maxGap=Math.max(maxGap,Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z));}
 }
 return {...p,minHead,minUp,maxDrift,maxGap,fallenAt,activeSteps,maxTorque,maxInternalTorqueResidual,meanMeasuredStepMs:totalMs/3600,bodies:world.bodies.len(),joints:world.impulseJoints.len(),standing60s:fallenAt===null,stationaryStance:fallenAt===null&&maxDrift<.3};
 }finally{world.free();}
}
const report={rapier:R.version(),node:process.version,dt:1/60,steps:3600,environment:'Node Rapier fixture without Three.js, props, UI, GPU or browser',limits:{jointAxisTorqueNm:12,internalBalanceTorqueNm:24,stationaryDriftM:.3},results:profiles.map(experiment)};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

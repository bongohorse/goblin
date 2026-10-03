// Bounded get-up feasibility investigation using real impulses, not pose resets.
import R from '@dimforge/rapier3d-compat';
import {writeFileSync} from 'node:fs';
import {createGoblinRig,rotateVector} from '../src/goblin-rig.js';
await R.init();
function trial(direction,hipSign){
 const w=new R.World({x:0,y:-9.81,z:0});w.timestep=1/60;
 const floor=w.createCollider(R.ColliderDesc.cuboid(6,.2,6).setTranslation(0,-.2,0).setFriction(.9));
 const rig=createGoblinRig(R,w),motors=[];
 for(const {body} of rig.byId.values())body.setAdditionalSolverIterations(16);
 for(const {spec,joint:original} of rig.joints.values()){
  const joint=spec.type==='spherical'?new R.SphericalImpulseJoint(w.impulseJoints.raw,w.bodies,original.handle):original;
  if(spec.type==='spherical')joint.setFrameX1(rig.byId.get(spec.child).spec.rotation);
  motors.push({spec,joint});
 }
 function pose(hip,knee,on){for(const {spec,joint} of motors){
  const target=spec.id.startsWith('hip')?hip:spec.id.startsWith('knee')?knee:0;
  if(spec.type==='spherical')for(const a of [R.JointAxis.AngX,R.JointAxis.AngY,R.JointAxis.AngZ]){joint.configureMotorModel(a,R.MotorModel.ForceBased);joint.configureMotor(a,a===R.JointAxis.AngX?target:0,0,100,12);joint.setMotorMaxForce(a,on?20:0);}
  else{joint.configureMotorModel(R.MotorModel.ForceBased);joint.configureMotor(target,0,100,12);joint.setMotorMaxForce(on?20:0);}
 }}
 const pelvis=rig.byId.get('pelvis').body;
 function balance(cap){
  const supports=[];for(const id of ['footL','footR','handL','handR']){const e=rig.byId.get(id);w.contactPair(e.collider,floor,m=>{if(m.numSolverContacts()>0&&!supports.includes(e))supports.push(e);});}
  if(!supports.length)return;
  const up=rotateVector({x:0,y:1,z:0},pelvis.rotation()),av=pelvis.angvel();let t={x:-100*up.z-20*av.x,y:-5*av.y,z:100*up.x-20*av.z};
  const s=Math.min(1,cap/(Math.hypot(t.x,t.y,t.z)||1));t={x:t.x*s,y:t.y*s,z:t.z*s};pelvis.addTorque(t,true);
  for(const e of supports)e.body.addTorque({x:-t.x/supports.length,y:-t.y/supports.length,z:-t.z/supports.length},true);
 }
 let steady=0,initialPose=null,stoodAt=null,minRiseHead=10,maxRiseHead=0,contactsAtStart=0;
 try{for(let i=0;i<1800;i++){
  for(const {body} of rig.byId.values())body.resetTorques(false);
  if(i<360){pose(0,0,true);balance(24);}
  if(i===360){pose(0,0,false);rig.byId.get('head').body.applyImpulse({x:0,y:0,z:direction*6.2},true);}
  if(i===840){const q=rig.byId.get('torso').body.rotation(),forward=rotateVector({x:0,y:0,z:1},q);initialPose=forward.y>.6?'back':forward.y<-.6?'belly':'other';for(const e of rig.byId.values())w.contactPair(e.collider,floor,m=>contactsAtStart+=m.numSolverContacts());}
  if(i>=840){const t=(i-840)/60;pose(hipSign*1.1*Math.max(0,1-t/6),2.1*Math.max(0,1-t/8),true);balance(24);}
  w.step();const head=rig.byId.get('head').body.translation().y,up=rotateVector({x:0,y:1,z:0},rig.byId.get('torso').body.rotation()).y;
  if(i>=840){minRiseHead=Math.min(minRiseHead,head);maxRiseHead=Math.max(maxRiseHead,head);const v=pelvis.linvel();let feetContact=false;for(const id of ['footL','footR'])w.contactPair(rig.byId.get(id).collider,floor,m=>{if(m.numSolverContacts()>0)feetContact=true;});steady=head>1.8&&up>.94&&Math.hypot(v.x,v.y,v.z)<.12&&feetContact?steady+1/60:0;if(stoodAt===null&&steady>=.6)stoodAt=(i-840)/60;}
 }
 return {direction,hipSign,initialPose,contactsAtStart,stoodAt,minRiseHead,maxRiseHead,endHead:rig.byId.get('head').body.translation().y,endUp:rotateVector({x:0,y:1,z:0},rig.byId.get('torso').body.rotation()).y,bodies:w.bodies.len(),joints:w.impulseJoints.len()};
 }finally{w.free();}
}
const report={rapier:R.version(),node:process.version,dt:1/60,duration:30,hitAt:6,attemptAt:14,limits:{motorNm:20,balanceNm:24,extraIterations:16},results:[trial(-1,-1),trial(-1,1),trial(1,-1),trial(1,1)]};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

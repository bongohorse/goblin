import {createGoblinRig,rotateVector} from '../src/goblin-rig.js';
// Exact 0..14 s protocol of the original four failed trials; no pose reset.
export function fallenCase(R,direction){
  const world=new R.World({x:0,y:-9.81,z:0});world.timestep=1/60;
  const floor=world.createCollider(R.ColliderDesc.cuboid(6,.2,6).setTranslation(0,-.2,0).setFriction(.9));
  const rig=createGoblinRig(R,world),motors=[];
  for(const {body} of rig.byId.values())body.setAdditionalSolverIterations(16);
  for(const {spec,joint:original} of rig.joints.values()){
    const joint=spec.type==='spherical'?new R.SphericalImpulseJoint(world.impulseJoints.raw,world.bodies,original.handle):original;
    if(spec.type==='spherical')joint.setFrameX1(rig.byId.get(spec.child).spec.rotation);
    motors.push({spec,joint});
  }
  const pose=on=>{for(const {spec,joint} of motors){
    if(spec.type==='spherical')for(const a of [R.JointAxis.AngX,R.JointAxis.AngY,R.JointAxis.AngZ]){joint.configureMotorModel(a,R.MotorModel.ForceBased);joint.configureMotor(a,0,0,100,12);joint.setMotorMaxForce(a,on?20:0);}
    else{joint.configureMotorModel(R.MotorModel.ForceBased);joint.configureMotor(0,0,100,12);joint.setMotorMaxForce(on?20:0);}
  }};
  const pelvis=rig.byId.get('pelvis').body;
  for(let i=0;i<840;i++){
    for(const {body} of rig.byId.values())body.resetTorques(false);
    if(i<360){
      pose(true);const supported=[];
      for(const id of ['footL','footR','handL','handR']){const e=rig.byId.get(id);world.contactPair(e.collider,floor,m=>{if(m.numSolverContacts()>0&&!supported.includes(e))supported.push(e);});}
      if(supported.length){const up=rotateVector({x:0,y:1,z:0},pelvis.rotation()),v=pelvis.angvel();let t={x:-100*up.z-20*v.x,y:-5*v.y,z:100*up.x-20*v.z};const scale=Math.min(1,24/(Math.hypot(t.x,t.y,t.z)||1));t={x:t.x*scale,y:t.y*scale,z:t.z*scale};pelvis.addTorque(t,true);for(const e of supported)e.body.addTorque({x:-t.x/supported.length,y:-t.y/supported.length,z:-t.z/supported.length},true);}
    }
    if(i===360){pose(false);rig.byId.get('head').body.applyImpulse({x:0,y:0,z:direction*6.2},true);}
    world.step();
  }
  // Budget normalization changes no pose or velocity; the next controller owns its budget.
  for(const {body} of rig.byId.values())body.setAdditionalSolverIterations(0);
  return {world,rig,floor};
}

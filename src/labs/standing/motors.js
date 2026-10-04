import R from '@dimforge/rapier3d-compat';
import {freeze,multiply,conjugate,rotationDistance,rotate,sub,vec,jointObservation} from './math.js';

export const MOTOR_CONTROLLER='native-pose-hold-force-v1';
export const MOTOR_AXES=[R.JointAxis.AngX,R.JointAxis.AngY,R.JointAxis.AngZ];
export const IDENTITY=freeze({x:0,y:0,z:0,w:1});
export const neutralMotorConfig=rig=>freeze({schema_version:1,controller_id:MOTOR_CONTROLLER,model:'ForceBased',target_convention:'moving-frame-v1',stiffness:100,damping:12,max_torque_Nm:20,targets:rig.joints.map(j=>({id:j.id,target:j.type==='revolute'?0:{...IDENTITY}}))});

export function validateMotorConfig(input,rig){
  if(!input||Object.keys(input).sort().join()!==['schema_version','controller_id','model','target_convention','stiffness','damping','max_torque_Nm','targets'].sort().join()||input.schema_version!==1||input.controller_id!==MOTOR_CONTROLLER||input.model!=='ForceBased'||input.target_convention!=='moving-frame-v1')throw Error('Invalid motor contract');
  if(!Number.isFinite(input.stiffness)||input.stiffness<=0||input.stiffness>100||!Number.isFinite(input.damping)||input.damping<0||input.damping>12||!Number.isFinite(input.max_torque_Nm)||input.max_torque_Nm<=0||input.max_torque_Nm>20)throw Error('Invalid motor gains/cap');
  if(!Array.isArray(input.targets)||input.targets.length!==rig.joints.length||new Set(input.targets.map(t=>t.id)).size!==rig.joints.length)throw Error('Motor target taxonomy');
  for(const t of input.targets){const j=rig.joints.find(j=>j.id===t.id);if(!j||Object.keys(t).sort().join()!=='id,target')throw Error('Motor target taxonomy');
    if(j.type==='revolute'){if(!Number.isFinite(t.target)||t.target<j.limits[0]||t.target>j.limits[1])throw Error('Motor target outside hinge limits');}
    else if(!t.target||Object.keys(t.target).sort().join()!=='w,x,y,z'||!Object.values(t.target).every(Number.isFinite)||Math.abs(Math.hypot(...Object.values(t.target))-1)>1e-6)throw Error('Motor target quaternion');
  }
  return freeze(structuredClone(input));
}

// 0.21.0 factory misclassifies spherical descriptors as Generic. This declared public
// constructor is a view of the same known spherical handle, not a new physical joint.
// No raw WASM motor calls, mask mutation or prototype mutation. See motor-contract.md.
export function sphericalMotorView(world,joint,descriptor){
  if(descriptor?.jointType!==R.JointType.Spherical)throw Error('Expected spherical creation descriptor');
  if(joint instanceof R.SphericalImpulseJoint)return joint;
  if(joint.type()!==R.JointType.Generic)throw Error('Unexpected spherical descriptor type');
  return new R.SphericalImpulseJoint(world.impulseJoints.raw,world.bodies,joint.handle);
}

export function commandMotor(joint,type,target,{stiffness,damping,max_torque_Nm,model='ForceBased'},bindFrame=IDENTITY){
  if(!['ForceBased','AccelerationBased'].includes(model))throw Error('Unsupported native motor model');
  const nativeModel=R.MotorModel[model];
  if(type==='spherical'){
    joint.setFrameX1(multiply(bindFrame,target));
    for(const axis of MOTOR_AXES){joint.configureMotorModel(axis,nativeModel);joint.setMotorMaxForce(axis,max_torque_Nm);joint.configureMotor(axis,0,0,stiffness,damping);}
  }else{
    joint.configureMotorModel(nativeModel);joint.setMotorMaxForce(max_torque_Nm);joint.configureMotor(target,0,stiffness,damping);
  }
}

export class NativePoseHold {
  constructor(config,rig,validator=validateMotorConfig){this.config=validator(config,rig);this.entries=[];}
  bind(sim){this.entries=this.config.targets.map(t=>{const entry=sim.joints.get(t.id);const joint=entry.spec.type==='spherical'?sphericalMotorView(sim.world,entry.joint,entry.descriptor):entry.joint;return {...entry,joint,target:t.target,bindFrame:{...joint.frameX1()},frame2:{...joint.frameX2()}};});this.command();}
  command(){for(const e of this.entries)commandMotor(e.joint,e.spec.type,e.target,this.config,e.bindFrame);}
  tracking(){return this.entries.map(e=>{
    const a=e.joint.body1(),b=e.joint.body2(),base=multiply(a.rotation(),e.bindFrame),child=multiply(b.rotation(),e.frame2);
    const actual=e.spec.type==='revolute'?jointObservation(e).angle:multiply(conjugate(base),child);
    const error=e.spec.type==='revolute'?Math.abs(e.target-actual):rotationDistance(e.target,actual);
    const axesFrame=multiply(a.rotation(),e.joint.frameX1()),relativeVelocity=rotate(sub(b.angvel(),a.angvel()),conjugate(axesFrame));
    return {joint_id:e.spec.id,kind:e.spec.type,target:structuredClone(e.target),actual,error_rad:error,relative_angular_velocity_rad_s:relativeVelocity,limits:e.spec.limits?e.spec.limits.slice():null,configured_axis_cap_Nm:this.config.max_torque_Nm};
  });}
  clear(){this.entries=[];}
}

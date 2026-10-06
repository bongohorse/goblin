// Research-only contract. Never imported by the Lab or game runtime.
import R from '@dimforge/rapier3d-compat';
import {createHash} from 'node:crypto';
import {canonical} from '../src/labs/standing/config.js';
import {motorExperiment} from '../src/labs/standing/motor-config.js';
import {NativePoseHold,MOTOR_AXES,commandMotor} from '../src/labs/standing/motors.js';

export const REPRESENTATIONS=['moving-frame','fixed-native'];
export function nativeTargets(input){
  if(!input||Object.keys(input).sort().join()!=='w,x,y,z'||!Object.values(input).every(Number.isFinite))throw Error('Target quaternion');
  const length=Math.hypot(input.x,input.y,input.z,input.w);
  if(Math.abs(length-1)>1e-6)throw Error('Target must be unit quaternion');
  const sign=input.w<0?-1:1,q=Object.fromEntries(Object.entries(input).map(([k,v])=>[k,sign*v/length]));
  // A bounded experiment, not a global orientation controller. pi is discontinuous.
  if(2*Math.acos(Math.min(1,q.w))>1+1e-12)throw Error('Target outside verified <=1rad domain');
  return ['x','y','z'].map(k=>2*Math.asin(Math.max(-1,Math.min(1,q[k]))));
}
export function commandFixed(joint,target,{stiffness,damping,max_torque_Nm}){
  const targets=nativeTargets(target);
  for(let i=0;i<3;i++){
    joint.configureMotorModel(MOTOR_AXES[i],R.MotorModel.ForceBased);
    joint.setMotorMaxForce(MOTOR_AXES[i],max_torque_Nm);
    joint.configureMotorPosition(MOTOR_AXES[i],targets[i],stiffness,damping);
  }
  // No frame setter, body correction, target velocity or change of locked DOFs.
}
export class FixedTargets extends NativePoseHold {
  command(){for(const e of this.entries){
    if(e.spec.type==='spherical')commandFixed(e.joint,e.target,this.config);
    else commandMotor(e.joint,e.spec.type,e.target,this.config,e.bindFrame);
  }}
}
export function targetConfig(representation,cap){
  if(!REPRESENTATIONS.includes(representation))throw Error('Target representation');
  return {study_kind:'spherical-target-study',schema_version:1,controller_id:'target-representation-study-v1',representation,
    coordinate_contract:'canonical-quaternion-components-2asin-bounded1rad-v1',physical_target:'frozen-neutral-pose',
    reference_experiment:structuredClone(motorExperiment(cap))};
}
export function validateTargetConfig(config){
  if(canonical(config)!==canonical(targetConfig(config?.representation,config?.reference_experiment?.actuation?.max_torque_Nm)))throw Error('Target study config');
}
export function targetIdentity(config){
  validateTargetConfig(config);const hash=createHash('sha256').update(canonical(config)).digest('hex');
  return {config_id:'config:sha256:'+hash,experiment_id:'spherical-target-study-v1:'+hash};
}

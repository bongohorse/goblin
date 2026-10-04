import baseline from '../../../docs/research/standing-lab/baseline-config.json' with {type:'json'};
import {neutralMotorConfig} from './motors.js';
import {canonical} from './config.js';
import {freeze} from './math.js';
export const MODEL_CONTROLLER='native-model-ab-v1';
export function modelExperiment(model='AccelerationBased',cap=20,calibrated=false){
  if(!['ForceBased','AccelerationBased'].includes(model)||![20,1].includes(cap)||typeof calibrated!=='boolean'||(model==='ForceBased'&&calibrated))throw Error('Only predeclared model study cases');
  return freeze({schema_version:3,controller_id:MODEL_CONTROLLER,comparison_question:calibrated?'scalar-calibrated':'same-numbers',rig:structuredClone(baseline),solver_config:{...baseline.solver_config,numSolverIterations:32},actuation:{...neutralMotorConfig(baseline),schema_version:2,controller_id:MODEL_CONTROLLER,model,stiffness:calibrated?2343.75:100,damping:calibrated?281.25:12,max_torque_Nm:cap,gain_units:model==='ForceBased'?'Nm/rad;Nm*s/rad':'s^-2;s^-1'}});
}
export function validateModelExperiment(input){
  const expected=modelExperiment(input?.actuation?.model,input?.actuation?.max_torque_Nm,input?.comparison_question==='scalar-calibrated');
  if(canonical(input)!==canonical(expected))throw Error('Model study differs from predeclared frozen contract');
  return freeze(structuredClone(input));
}
export function validateModelActuation(input){
  const expected=modelExperiment(input?.model,input?.max_torque_Nm,input?.stiffness===2343.75).actuation;
  if(canonical(input)!==canonical(expected))throw Error('Invalid model study actuation');
  return freeze(structuredClone(input));
}

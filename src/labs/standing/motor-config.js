import baseline from '../../../docs/research/standing-lab/baseline-config.json' with {type:'json'};
import {neutralMotorConfig,validateMotorConfig,MOTOR_CONTROLLER} from './motors.js';
import {canonical} from './config.js';
import {freeze} from './math.js';
export function motorExperiment(cap=20){
  if(![20,1].includes(cap))throw Error('Only documented motor caps20/1');
  return freeze({schema_version:2,controller_id:MOTOR_CONTROLLER,rig:structuredClone(baseline),solver_config:{...baseline.solver_config,numSolverIterations:32},actuation:{...neutralMotorConfig(baseline),max_torque_Nm:cap}});
}
export function validateMotorExperiment(input){
  const expected=motorExperiment(input?.actuation?.max_torque_Nm);
  if(canonical(input)!==canonical(expected))throw Error('Motor experiment differs from frozen Solver32 contract');
  validateMotorConfig(input.actuation,baseline);return freeze(structuredClone(input));
}

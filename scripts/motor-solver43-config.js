// Separate experiment namespace; never a passive config/result reinterpretation.
import {BASELINE,canonical} from '../src/labs/standing/config.js';
import {neutralMotorConfig,validateMotorConfig} from '../src/labs/standing/motors.js';
import {freeze} from '../src/labs/standing/math.js';
export function experimentConfig(cap,solver){
  if(![1,20].includes(cap)||![8,32].includes(solver))throw Error('Only predeclared caps and solver budgets');
  return freeze({schema_version:1,experiment_kind:'motor-solver-candidate-v1',baseline:structuredClone(BASELINE),effective_solver_config:{...BASELINE.solver_config,numSolverIterations:solver},actuation:{...neutralMotorConfig(BASELINE),max_torque_Nm:cap},horizon_steps:3600,safety:{anchor_error_m:.08,limit_error_rad:.05},standing_end:'first_non_foot_floor_contact_or_invalid',diagnostic_end:'invalid_or_3600_steps',actual_motor_effort:'unavailable: coupled contact/limit impulses'});
}
export function validateExperiment(config){
  const cap=config?.actuation?.max_torque_Nm,solver=config?.effective_solver_config?.numSolverIterations;
  const expected=experimentConfig(cap,solver);
  if(canonical(config)!==canonical(expected))throw Error('Experiment differs from frozen contract');
  validateMotorConfig(config.actuation,BASELINE);return config;
}
export async function experimentIdentity(config){
  validateExperiment(config);const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(config)));
  const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  return {config_hash:'sha256:'+hash,experiment_id:'motor-solver-candidate-v1:'+hash};
}

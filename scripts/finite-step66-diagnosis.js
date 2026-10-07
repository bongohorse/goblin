import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import os from 'node:os';
import {canonical} from '../src/labs/standing/config.js';
import {initRapier} from '../src/labs/standing/simulation.js';
import {standingBuild} from './standing-provenance.js';
import {CONFIG as ORIGINAL} from './torso-torque60-contract.js';
import {fixture,command,clear,verifyFirstSteps} from './torso-torque60-fixtures.js';
import {axis,capsule} from './torso-torque60-oracle.js';
import {validateReference,referenceForCase,REF_LIMITS} from './finite-step66-validation.js';
import {integrate,initialState,decode,invariants,difference,av,aq,ov,add,sub,mul,length,rotate,normalize,product,inertia,cross} from './finite-step66-reference.js';
export const CONFIG={schema_version:1,method_id:'independent-double-newton-euler-rk4-v1',study:'internal-torque-finite-step66-v1',base:'909d0ae9cf166bf3c0e5a2600831e748765e4362',reference_resolutions:[8,16,32,64,128],rapier_refinements:[1,2,4,8,16],repeat_count:5,reference_limits:REF_LIMITS,diagnostic_markers:{velocity:1e-5,physical_H:1e-7},scope:'one-actual-public-step-horizon-only'};
export const hash=v=>createHash('sha256').update(canonical(v)).digest('hex');
export const configIdentity=()=>({config_id:'config:sha256:'+hash(CONFIG),experiment_id:CONFIG.study+':'+hash(CONFIG)});
export function prepareReference(c){
  const tau=av(c.requested_world_Nm).map(Math.fround),torques=[tau,c.missing_reaction?[0,0,0]:mul(tau,-1)],matched={...c,requested_world_Nm:ov(tau)},curve=referenceForCase(matched,c.dt),end=curve.runs.at(-1),initial=decode(initialState(c.pre,c.connected),c.pre),start=invariants(initial),finish=invariants(end.bodies),Herror=length(sub(sub(finish.H,start.H),mul(add(...torques),c.dt))),Eerror=Math.abs(finish.E-start.E-end.work_J);
  const ideal=structuredClone(c.pre),bodyRotations=[axis(0,1,0,.7).multiply(axis(0,0,1,-.08)),axis(0,1,0,-.3).multiply(axis(1,0,0,.06))];
  for(const [j,b] of ideal.entries()){const spec=j?ORIGINAL.partner:ORIGINAL.torso;b.mass=spec.mass;b.rotation={x:bodyRotations[j].x,y:bodyRotations[j].y,z:bodyRotations[j].z,w:bodyRotations[j].w};b.inertia=c.synthetic?(j?{x:.011,y:.017,z:.023}:{x:.031,y:.049,z:.071}):capsule(spec);const frame=c.synthetic?(j?axis(1,0,0,-.5).multiply(axis(0,0,1,.3)):axis(0,0,1,.4).multiply(axis(0,1,0,-.3))):{x:0,y:0,z:0,w:1};b.principal_frame={x:frame.x,y:frame.y,z:frame.z,w:frame.w};b.world_com=ov(mul(rotate(normalize(aq(b.rotation)),av(b.anchor)),-1));}
  const idealEnd=integrate(ideal,[av(c.requested_world_Nm),c.missing_reaction?[0,0,0]:mul(av(c.requested_world_Nm),-1)],c.dt,128,c.connected);
  const wrongTorques=c.pre.map((b,j)=>rotate(product(normalize(aq(b.rotation)),normalize(aq(b.principal_frame))),torques[j])),wrong=integrate(c.pre,wrongTorques,c.dt,128,c.connected),wrongFrameError=difference(wrong.bodies,end.bodies).angular;
  const pass=curve.pass&&Herror<=REF_LIMITS.conservation&&Eerror<=REF_LIMITS.conservation&&(!c.connected||(finish.anchor_gap_m<=REF_LIMITS.anchor&&finish.anchor_speed_m_s<=REF_LIMITS.anchor));
  return {initial,initial_alignment_difference:difference(initial,c.pre),torques_world_Nm:torques,convergence:curve.pairs,end,initial_invariants:start,end_invariants:finish,Herror,Eerror,ideal_input_end:idealEnd,initial_quantization_endpoint_difference:difference(idealEnd.bodies,end.bodies),wrong_frame_end:wrong,wrong_frame_velocity_error:wrongFrameError,wrong_frame_negative_detected:wrongFrameError>10*CONFIG.diagnostic_markers.velocity,pass};
}
export function measure(c,reference,refinement){
  const rotation=axis(0,1,0,.7).multiply(axis(0,0,1,-.08)),partnerRotation=axis(0,1,0,-.3).multiply(axis(1,0,0,.06)),f=fixture({connected:c.connected,synthetic:c.synthetic,rotation,partnerRotation});
  try{
    const pre=f.state();assert.equal(canonical(pre),canonical(c.pre),'Exact original initial state required');f.world.timestep=c.dt/refinement;const dt=f.world.timestep;assert.equal(dt*refinement,c.dt,'Same physical horizon');
    for(let step=0;step<refinement;step++){command(f,{torso_world_Nm:c.requested_world_Nm,partner_world_Nm:c.missing_reaction?{x:0,y:0,z:0}:ov(mul(av(c.requested_world_Nm),-1))});f.world.step();clear(f);}
    const post=f.state(),a=invariants(pre),b=invariants(post),physical_delta_H=sub(b.H,a.H),expected_delta_H=mul(add(...reference.torques_world_Nm),c.dt),physical_H_error=length(sub(physical_delta_H,expected_delta_H)),paired_reaction_marker_pass=length(physical_delta_H)<=CONFIG.diagnostic_markers.physical_H,endpoint_error=difference(post,reference.end.bodies);
    const frozen=bodies=>bodies.reduce((sum,s,j)=>{const orig=c.pre[j];return add(sum,add(inertia(orig,aq(orig.rotation),av(s.angular_velocity)),cross(av(orig.world_com),mul(av(s.linear_velocity),s.mass))));},[0,0,0]);
    const PRE_pseudo_delta_H=sub(frozen(post),frozen(pre));
    return {refinement,dt_s:dt,horizon_s:dt*refinement,pre,post,endpoint_error,physical_delta_H,expected_delta_H,physical_H_error,PRE_pseudo_delta_H,anchor_gap_m:b.anchor_gap_m,anchor_speed_m_s:b.anchor_speed_m_s,velocity_marker_pass:Math.max(endpoint_error.angular,endpoint_error.linear)<=CONFIG.diagnostic_markers.velocity,paired_reaction_marker_pass};
  }finally{f.dispose();}
}
export async function diagnose(directory){
  await initRapier();const build=standingBuild();assert.equal(build.dirty,false);assert.match(process.version,/^v24\./);const oldPath='docs/research/standing-lab/torso-torque60/gate-b.json',old=JSON.parse(fs.readFileSync(oldPath)),original=verifyFirstSteps();assert.equal(canonical(original),canonical(old.first_steps),'Original physical payload changed');
  const validation=[0,2].map(j=>validateReference(original[j].pre,original[j].dt));assert.ok(validation.every(v=>v.pass),'Independent reference methods blocker');
  const references=original.map((c,index)=>c.method==='torque'?{case_index:index,case_id:'finite-step66-case:'+index,connected:c.connected,missing_reaction:c.missing_reaction,reference:prepareReference(c)}:null).filter(Boolean);assert.ok(references.every(r=>r.reference.pass&&r.reference.wrong_frame_negative_detected),'Connected reference or frame-control methods blocker');
  const repetitions=[];for(let run_index=1;run_index<=5;run_index++){const cases=references.map(r=>({case_index:r.case_index,case_id:r.case_id,measurements:CONFIG.rapier_refinements.map(m=>measure(original[r.case_index],r.reference,m))}));if(repetitions.length)assert.equal(canonical(cases),canonical(repetitions[0].cases),'Same-host fresh-world repeat mismatch');repetitions.push({run_index,cases});}
  const report={schema_version:1,report_kind:CONFIG.study,run_id:crypto.randomUUID(),config:CONFIG,...configIdentity(),provenance:{...build,node:process.version,os:os.platform()+' '+os.release(),cpu:os.cpus()[0]?.model,rapier:'0.21.0',upstream:'b716d375efc0201003f0cd9ef7168eee0b62c177',protocol_sha256:createHash('sha256').update(fs.readFileSync('docs/research/standing-lab/finite-step66-protocol.md')).digest('hex'),original_report_sha256:createHash('sha256').update(fs.readFileSync(oldPath)).digest('hex'),original_physical_sha256:hash(original)},original_reproduced_exact:true,validation,references,repetitions,status:'diagnosis_complete_no_controller_acceptance'};
  fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(directory+'/diagnosis.json',JSON.stringify(report)+'\n');console.log(JSON.stringify({build,validated:validation.length,references:references.length,repetitions:repetitions.length,canonical:repetitions[0].cases.map(c=>({case:c.case_index,velocity:c.measurements[0].endpoint_error.angular,H:c.measurements[0].physical_H_error,finestV:c.measurements.at(-1).endpoint_error.angular,finestH:c.measurements.at(-1).physical_H_error}))}));return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await diagnose(process.argv[2]);

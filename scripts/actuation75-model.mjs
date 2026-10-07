// Pure command construction and stored-state oracle; no Rapier import or world creation.
import assert from 'node:assert/strict';
import {encodeTorque,exactWithinCap,matrixH} from './review-actuation74.mjs';
import {integrate,invariants,difference,decode,initialState,av,aq,normalize,rotate,product,inertia,ov,add,sub,mul,length} from './finite-step66-reference.js';
import {validateReference} from './finite-step66-validation.js';
export const PROTOCOL_HEAD='c8fc2816951a559b5b4fc5ff0c4c6e7b745985ea';
export const CONFIG_SHA='24433a2f565a9dd98e2457ff5c8f7989139937c9e7ab8c457c2fad953181cb12';
export const PROTOCOL_SHA='750409855e633c0207bb7fc158699e2dfb234a2f1994096e2dbf718ed77c7b09';
export const neg=v=>v.map(x=>x===0?0:-x);
export function construction(c,pre,T){
 const intended=c.direction.map(x=>x*(.15*(1-Number.EPSILON))/length(c.direction));
 let requested=[...intended];
 if(c.fault==='body_principal_to_world_wrongly_applied_to_declared_world_vector_on_both')requested=rotate(product(normalize(aq(pre[0].rotation)),normalize(aq(pre[0].principal_frame))),requested);
 if(c.fault==='multiply_torque_by_actual_T_once')requested=mul(requested,T);
 if(length(requested)>.15||!exactWithinCap(requested,.15))requested=mul(requested,.15*(1-Number.EPSILON)/length(requested));
 const encoded=encodeTorque(c.method==='impulse'?mul(requested,T):requested,c.method==='impulse'?.15*T:.15);
 const correct=encodeTorque(c.method==='impulse'?mul(intended,T):intended,c.method==='impulse'?.15*T:.15);
 const partner=c.fault==='omit_partner'?[0,0,0]:neg(encoded);
 return {intended_world_Nm:intended,requested_world_Nm:requested,requested_api_vector:c.method==='impulse'?mul(requested,T):requested,correct_encoded_pair:[correct,neg(correct)],applied_encoded_pair:[encoded,partner],api:c.method==='impulse'?'applyTorqueImpulse':'addTorque',api_units:c.method==='impulse'?'Nm*s':'Nm',cap:c.method==='impulse'?.15*T:.15,encoding_id:'bounded-toward-zero-f32-v1',construction_fault:c.fault??null};
}
export function commandAudit(c,x){
 const z={x:0,y:0,z:0},a=construction(c,x.pre,x.T);assert.deepEqual(x.commands,a);
 const calls=[...x.phase.filter(e=>e.op==='resetTorques'),...x.phase.filter(e=>e.op===a.api)];
 const reset=x.phase.slice(0,2);assert.deepEqual(reset.map(e=>[e.op,e.body,e.step,e.wake]),[['resetTorques',0,0,true],['resetTorques',1,0,true]]);
 assert.deepEqual(x.after_reset,[z,z]);assert.deepEqual(x.cleared,[z,z]);assert.deepEqual(x.forces_before,[z,z]);assert.deepEqual(x.forces_after,[z,z]);
 assert.deepEqual(x.phase.slice(2,4).map(e=>({op:e.op,body:e.body,step:e.step,wake:e.wake,vector:e.vector})),a.applied_encoded_pair.map((v,j)=>({op:a.api,body:j,step:0,wake:true,vector:ov(v)})));
 const tail=c.method==='impulse'?[]:[{op:'world.step',step:0}];assert.deepEqual(x.phase.slice(4,-2),tail);
 const steps=c.method==='impulse'?0:1;assert.deepEqual(x.phase.slice(-2),[0,1].map(body=>({op:'resetTorques',body,step:steps,wake:true})));
 assert.equal(x.public_steps,steps);assert.equal(calls.length,6);
 assert.deepEqual(x.accumulators,c.method==='impulse'?[z,z]:a.applied_encoded_pair.map(ov));
 for(let j=0;j<2;j++){assert.ok(exactWithinCap(a.applied_encoded_pair[j],a.cap));assert.deepEqual(x.phase[2+j].readback_torque,c.method==='impulse'?z:ov(a.applied_encoded_pair[j]));}
 const mismatch=JSON.stringify(a.applied_encoded_pair)!==JSON.stringify(a.correct_encoded_pair);
 assert.equal(mismatch,!!c.fault);
 return {observed_public_application:'consistent',phase_reset_units_cap:'pass',intended_contract:c.fault?'expected_negative_violation':'pass',mismatch,expected_fault:c.fault??null};
}
export function immediateReference(pre,pair){return pre.map((b,j)=>({...structuredClone(b),angular_velocity:ov(add(av(b.angular_velocity),inertia(b,normalize(aq(b.rotation)),pair[j],true)))}));}
export function omegaDistance(a,b){return length(a.flatMap((s,j)=>sub(av(s.angular_velocity),av(b[j].angular_velocity))));}
export function reference(pre,pair,T,connected,cfg){
 const refs=cfg.numerical_reference_checks.resolutions.map(n=>integrate(pre,pair,T,n,connected));const end=refs.at(-1),start=decode(initialState(pre,connected),pre),a=invariants(start),b=invariants(end.bodies),integral=mul(add(...pair),T);
 const convergence=refs.slice(1).map((r,j)=>({coarse:refs[j].n,fine:r.n,error:difference(r.bodies,refs[j].bodies)}));const e=convergence.at(-1).error,L=cfg.numerical_reference_checks;
 const H=length(sub(sub(b.H,a.H),integral)),work=Math.abs(b.E-a.E-end.work_J);
 assert.ok(e.angular<=L.velocity_rad_s&&e.linear<=L.velocity_rad_s&&e.rotation<=L.angle_rad&&e.position<=L.position_m&&H<=L.H_kg_m2_s&&work<=L.energy_J,'invalid_reference');
 return {endpoint:end,convergence,initial_alignment_difference:difference(start,pre),H_error:H,work_error:work};
}
export function metrics(c,x,cfg,cache=new Map()){
 const ref=(pair)=>{const key=JSON.stringify([x.pre,pair,x.T,c.connected]);if(!cache.has(key))cache.set(key,reference(x.pre,pair,x.T,c.connected,cfg));return cache.get(key);};
 const correct=c.method==='impulse'?{endpoint:{bodies:immediateReference(x.pre,x.commands.correct_encoded_pair)}}:ref(x.commands.correct_encoded_pair);
 const actual=c.method==='impulse'?{endpoint:{bodies:immediateReference(x.pre,x.commands.applied_encoded_pair)}}:ref(x.commands.applied_encoded_pair);
 const a=invariants(x.pre),b=invariants(x.post),deltaH=sub(b.H,a.H),integral=c.method==='impulse'?add(...x.commands.applied_encoded_pair):mul(add(...x.commands.applied_encoded_pair),x.T);
 const hChecks=[];for(const state of [x.pre,x.post]){const m=matrixH(state),i=invariants(state);assert.ok(length(sub(m.H,i.H))<1e-14&&length(sub(m.P,i.P))<1e-14);const shift=[1,-2,.5],shifted=state.map(s=>({...s,world_com:ov(sub(av(s.world_com),shift))}));const expected=sub(m.H,[shift[1]*m.P[2]-shift[2]*m.P[1],shift[2]*m.P[0]-shift[0]*m.P[2],shift[0]*m.P[1]-shift[1]*m.P[0]]);const sign=state.map(s=>({...s,rotation:Object.fromEntries(Object.entries(s.rotation).map(([k,v])=>[k,-v])),principal_frame:Object.fromEntries(Object.entries(s.principal_frame).map(([k,v])=>[k,-v]))}));const err=length(sub(matrixH(shifted).H,expected));assert.ok(err<1e-14);assert.deepEqual(matrixH(sign),m);hChecks.push({matrix_H_error:length(sub(m.H,i.H)),origin_shift_error:err,quaternion_sign_identical:true});}
 const vectors=x.post.map((s,j)=>({angular:sub(av(s.angular_velocity),av(actual.endpoint.bodies[j].angular_velocity)),linear:sub(av(s.linear_velocity),av(actual.endpoint.bodies[j].linear_velocity)),position:sub(av(s.world_com),av(actual.endpoint.bodies[j].world_com))}));
 const nominal=x.pre.map((s,j)=>({...structuredClone(s),rotation:j?{x:Math.sin(.06/2)*Math.cos(-.3/2),y:Math.sin(-.3/2)*Math.cos(.06/2),z:-Math.sin(-.3/2)*Math.sin(.06/2),w:Math.cos(-.3/2)*Math.cos(.06/2)}:{x:Math.sin(.7/2)*Math.sin(-.08/2),y:Math.sin(.7/2)*Math.cos(-.08/2),z:Math.cos(.7/2)*Math.sin(-.08/2),w:Math.cos(.7/2)*Math.cos(-.08/2)}}));for(const s of nominal)s.world_com=ov(mul(rotate(normalize(aq(s.rotation)),av(s.anchor)),-1));
 return {reference_correct:correct,reference_actual:actual,input_ideal_vs_observed:difference(x.pre,nominal),endpoint_error:difference(x.post,actual.endpoint.bodies),endpoint_vectors:vectors,omega_to_correct:omegaDistance(x.post,correct.endpoint.bodies),omega_to_actual:omegaDistance(x.post,actual.endpoint.bodies),PRE:a,POST:b,physical_delta_H:deltaH,actual_torque_integral:integral,paired_zero_residual:deltaH,actual_integral_residual:sub(deltaH,integral),physical_H_norm:length(deltaH),actual_integral_residual_norm:length(sub(deltaH,integral)),physical_delta_P:sub(b.P,a.P),physical_energy_delta:b.E-a.E,physical_work_residual:c.method==='impulse'?null:b.E-a.E-actual.endpoint.work_J,independent_H_checks:hChecks};
}
export function discriminate(cases){
 const get=id=>cases.find(c=>c.id===id).runs;
 const results=[];for(const id of ['negative-frame','negative-units']){const p=get('torque-free-0'),n=get(id),posMax=Math.max(...p.map(x=>x.metrics.omega_to_correct)),negMin=Math.min(...n.map(x=>x.metrics.omega_to_correct)),faultMax=Math.max(...n.map(x=>x.metrics.omega_to_actual));const margins=[negMin-posMax-2e-10,negMin-faultMax-2e-10];results.push({id,positive_max:posMax,negative_correct_min:negMin,negative_actual_max:faultMax,margins,pass:margins.every(x=>x>0)});}
 const p=get('torque-connected-0'),n=get('negative-missing-reaction'),posMax=Math.max(...p.map(x=>x.metrics.physical_H_norm)),negMin=Math.min(...n.map(x=>x.metrics.physical_H_norm)),actualMax=Math.max(...n.map(x=>x.metrics.actual_integral_residual_norm)),margins=[negMin-posMax-2e-10,negMin-actualMax-2e-10];results.push({id:'negative-missing-reaction',positive_max:posMax,negative_paired_zero_min:negMin,negative_actual_integral_max:actualMax,margins,pass:margins.every(x=>x>0)});
 return {guard_uOmega:1e-10,guard_uH:1e-10,results,pass:results.every(x=>x.pass)};
}
export function oracleControls(pre,T){const r=validateReference(pre,T);assert.equal(r.pass,true,'invalid_reference');return r;}

import {tensor,axis,capsule} from './torso-torque60-oracle.js';
export function publicControls(pre,actualInverse,synthetic){const errors=pre.map((b,j)=>{const expected=tensor(b.rotation,b.principal_frame,b.inertia).invert().elements;return Math.max(...expected.map((v,k)=>Math.abs(v-actualInverse[j][k])))/Math.max(...expected.map(Math.abs));});const authored=pre.map((b,j)=>synthetic?{inertia:j?{x:.011,y:.017,z:.023}:{x:.031,y:.049,z:.071},frame:j?axis(1,0,0,-.5).multiply(axis(0,0,1,.3)):axis(0,0,1,.4).multiply(axis(0,1,0,-.3))}:{inertia:capsule(j?{mass:.35,half:.12,radius:.09}:{mass:2,half:.15,radius:.24}),frame:{x:0,y:0,z:0,w:1}});const authoredErrors=pre.map((b,j)=>{const A=tensor(b.rotation,authored[j].frame,authored[j].inertia).invert().elements;return Math.max(...A.map((v,k)=>Math.abs(v-actualInverse[j][k])))/Math.max(...A.map(Math.abs));});return {inverse_tensor_relative:errors,authored_inverse_tensor_relative:authoredErrors,pass:[...errors,...authoredErrors].every(v=>v<=1e-5)};}

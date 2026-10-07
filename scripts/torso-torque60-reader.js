import assert from 'node:assert/strict';
import {CONFIG,identity} from './torso-torque60-contract.js';
import {canonical} from '../src/labs/standing/config.js';
import {V,Q,record,tensor,constrained,momentum,rotationBound} from './torso-torque60-oracle.js';
const exact=(o,k)=>{assert.ok(o&&typeof o==='object'&&!Array.isArray(o));assert.equal(Object.keys(o).sort().join(),k.split(',').sort().join(),'Unknown/missing fields');};
const finite=o=>{if(typeof o==='number')assert.ok(Number.isFinite(o),'Nonfinite value');else if(o&&typeof o==='object')Object.values(o).forEach(finite);};
const vec=v=>{exact(v,'x,y,z');assert.ok(Object.values(v).every(Number.isFinite));};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-12, 'Redundant measurement disagreement');
const directions=[{x:1,y:0,z:0},{x:-1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:-1,z:0},{x:0,y:0,z:1},{x:0,y:0,z:-1},{x:.6,y:-.3,z:.7},{x:-.6,y:.3,z:-.7}];
export function validateFirstSteps(cases){
  assert.equal(cases.length,25,'Incomplete first-step case set');
  for(const [index,c] of cases.entries()){
    exact(c,'connected,synthetic,method,direction,missing_reaction,dt,requested_world_Nm,cap_norm_Nm,pre,post,oracle,accumulators,inverse_tensor_error,velocity_error,accumulator_error,anchor_initial_error,discrete_momentum_residual,physical_momentum_residual,physical_resolution_bound,pass');finite(c);
    const slot=index%3;assert.equal(c.connected,index===24||slot===2);assert.equal(c.synthetic,index!==24&&slot!==2);assert.equal(c.method,index!==24&&slot===1?'impulse':'torque');assert.equal(c.missing_reaction,index===24);assert.deepEqual(c.direction,index===24?directions[0]:directions[Math.floor(index/3)]);
    for(const k of ['pre','post']){assert.equal(c[k].length,2);for(const [j,s] of c[k].entries()){
      exact(s,'id,mass,anchor,inertia,principal_frame,rotation,world_com,linear_velocity,angular_velocity');assert.equal(s.id,j?CONFIG.partner.id:CONFIG.torso.id);assert.ok(Math.abs(s.mass-(j?CONFIG.partner.mass:CONFIG.torso.mass))<1e-6);for(const key of ['anchor','inertia','world_com','linear_velocity','angular_velocity'])vec(s[key]);assert.ok(Object.values(s.inertia).every(x=>x>0));for(const key of ['principal_frame','rotation']){exact(s[key],'x,y,z,w');assert.ok(Math.abs(Math.hypot(...Object.values(s[key]))-1)<1e-6);}
    }}
    exact(c.oracle,'torso_angular,partner_angular,torso_linear,partner_linear,constraint_impulse_Ns');Object.values(c.oracle).forEach(vec);vec(c.requested_world_Nm);assert.equal(c.accumulators.length,2);c.accumulators.forEach(vec);
    const tau=V(c.requested_world_Nm),expected=c.connected?constrained(c.pre[0],c.pre[1],c.requested_world_Nm,c.dt):{torso_angular:record(tau.clone().multiplyScalar(c.dt).applyMatrix3(tensor(c.pre[0].rotation,c.pre[0].principal_frame,c.pre[0].inertia).invert())),partner_angular:record(tau.clone().multiplyScalar(-c.dt).applyMatrix3(tensor(c.pre[1].rotation,c.pre[1].principal_frame,c.pre[1].inertia).invert())),torso_linear:{x:0,y:0,z:0},partner_linear:{x:0,y:0,z:0},constraint_impulse_Ns:{x:0,y:0,z:0}};
    for(const k of Object.keys(expected))assert.ok(V(expected[k]).distanceTo(V(c.oracle[k]))<1e-12,'Corrupt analytic oracle');
    assert.equal(c.dt,Math.fround(CONFIG.dt_s));close(c.cap_norm_Nm,V(c.requested_world_Nm).length());assert.ok(tau.distanceTo(V(c.direction).normalize().multiplyScalar(CONFIG.cap_Nm))<1e-12,'Requested torque/direction disagreement');assert.ok(c.cap_norm_Nm<=CONFIG.cap_Nm+CONFIG.tolerances.cap);
    close(c.discrete_momentum_residual,momentum(c.post,c.pre).sub(momentum(c.pre)).length());close(c.physical_momentum_residual,momentum(c.post).sub(momentum(c.pre)).length());close(c.physical_resolution_bound,rotationBound(c.pre,c.post)+CONFIG.tolerances.discrete_momentum);
    close(c.velocity_error,Math.max(V(c.post[0].angular_velocity).distanceTo(V(c.oracle.torso_angular)),V(c.post[1].angular_velocity).distanceTo(V(c.oracle.partner_angular)),V(c.post[0].linear_velocity).distanceTo(V(c.oracle.torso_linear)),V(c.post[1].linear_velocity).distanceTo(V(c.oracle.partner_linear))));
    const expectedAccumulatorError=c.method==='impulse'?Math.max(...c.accumulators.map(a=>V(a).length())):Math.max(V(c.accumulators[0]).distanceTo(tau),V(c.accumulators[1]).distanceTo(c.missing_reaction?V({x:0,y:0,z:0}):tau.clone().negate()));
    close(c.accumulator_error,expectedAccumulatorError);
    close(c.anchor_initial_error,V(c.pre[0].world_com).add(V(c.pre[0].anchor).applyQuaternion(Q(c.pre[0].rotation))).distanceTo(V(c.pre[1].world_com).add(V(c.pre[1].anchor).applyQuaternion(Q(c.pre[1].rotation)))));
    assert.ok(['inverse_tensor_error','velocity_error','accumulator_error','anchor_initial_error','discrete_momentum_residual','physical_momentum_residual'].every(k=>c[k]>=0));
    const pass=c.missing_reaction?c.discrete_momentum_residual>100*CONFIG.tolerances.discrete_momentum:c.velocity_error<=CONFIG.tolerances.velocity&&c.inverse_tensor_error<=CONFIG.tolerances.inverse_tensor_relative&&c.discrete_momentum_residual<=CONFIG.tolerances.discrete_momentum&&c.physical_momentum_residual<=c.physical_resolution_bound&&c.accumulator_error<=CONFIG.tolerances.accumulator&&c.anchor_initial_error<=CONFIG.tolerances.anchor;
    assert.equal(c.pass,pass,'False pass classification');
  }
  return cases;
}
export function validateGateB(r){
  exact(r,'schema_version,report_kind,run_id,config,config_id,experiment_id,provenance,first_steps,repetitions,tracking,historical_native_probe,status,blocker');finite(r);assert.equal(r.schema_version,1);assert.equal(r.report_kind,'internal-torso-torque60-gate-b-v1');assert.match(r.run_id,/^[a-f0-9-]{36}$/);assert.equal(canonical(r.config),canonical(CONFIG));for(const [k,v] of Object.entries(identity(r.config)))assert.equal(r[k],v);
  exact(r.provenance,'git_commit,dirty,build_id,node,os,arch,cpu,rapier,upstream,protocol_sha256');assert.match(r.provenance.git_commit,/^[a-f0-9]{40}$/);assert.equal(r.provenance.dirty,false);assert.match(r.provenance.node,/^v24\./);assert.equal(r.provenance.rapier,'0.21.0');assert.equal(r.provenance.upstream,'b716d375efc0201003f0cd9ef7168eee0b62c177');assert.match(r.provenance.protocol_sha256,/^[a-f0-9]{64}$/);assert.ok(r.provenance.build_id.startsWith(r.provenance.git_commit+':'));
  validateFirstSteps(r.first_steps);assert.equal(r.repetitions.length,5);for(const [index,rep] of r.repetitions.entries()){exact(rep,'run_index,cases');assert.equal(rep.run_index,index+1);validateFirstSteps(rep.cases);assert.equal(canonical(rep.cases),canonical(r.first_steps),'Fresh-world repetition mismatch');}
  assert.deepEqual(r.tracking,[],'No tracking accepted after blocker');assert.equal(r.status,'blocked');assert.equal(r.blocker,'first_step_frame_cap_reaction_or_velocity');assert.ok(r.first_steps.some(c=>!c.pass));assert.equal(r.historical_native_probe.strict_1e_6_pass,false);assert.ok(r.historical_native_probe.tensor_plus_orbital_residual>=1e-6);
  return r;
}

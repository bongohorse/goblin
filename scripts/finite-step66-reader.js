import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {canonical} from '../src/labs/standing/config.js';
import {CONFIG,configIdentity,hash,prepareReference} from './finite-step66-diagnosis.js';
import {validateReference} from './finite-step66-validation.js';
import {invariants,difference,av,aq,inertia,cross,add,sub,mul,length} from './finite-step66-reference.js';
const exact=(a,b)=>assert.equal(canonical(a),canonical(b));
const finite=v=>{if(typeof v==='number')assert.ok(Number.isFinite(v));else if(v&&typeof v==='object')Object.values(v).forEach(finite);};
export function readDiagnosis(r,old){
 finite(r);exact(r.config,CONFIG);exact({config_id:r.config_id,experiment_id:r.experiment_id},configIdentity());assert.equal(r.schema_version,1);assert.equal(r.report_kind,CONFIG.study);assert.equal(r.status,'diagnosis_complete_no_controller_acceptance');assert.equal(r.original_reproduced_exact,true);assert.equal(r.provenance.dirty,false);assert.match(r.provenance.git_commit,/^[a-f0-9]{40}$/);assert.match(r.provenance.build_id,new RegExp('^'+r.provenance.git_commit+':[a-f0-9]{64}$'));assert.equal(r.provenance.rapier,'0.21.0');assert.equal(r.provenance.upstream,'b716d375efc0201003f0cd9ef7168eee0b62c177');assert.match(r.provenance.node,/^v24\./);assert.equal(r.provenance.original_physical_sha256,hash(old.first_steps));
 const validation=[0,2].map(j=>validateReference(old.first_steps[j].pre,old.first_steps[j].dt));exact(r.validation,validation);assert.ok(validation.every(v=>v.pass));
 const indices=old.first_steps.flatMap((c,j)=>c.method==='torque'?[j]:[]);assert.equal(r.references.length,17);exact(r.references.map(x=>x.case_index),indices);
 for(const ref of r.references){const c=old.first_steps[ref.case_index];assert.equal(ref.case_id,'finite-step66-case:'+ref.case_index);assert.equal(ref.connected,c.connected);assert.equal(ref.missing_reaction,c.missing_reaction);exact(ref.reference,prepareReference(c));assert.ok(ref.reference.pass&&ref.reference.wrong_frame_negative_detected);assert.equal(ref.reference.original_PRE_pass,c.pass);}
 assert.equal(r.repetitions.length,5);
 for(const [j,run] of r.repetitions.entries()){assert.equal(run.run_index,j+1);exact(run.cases.map(c=>c.case_index),indices);if(j)exact(run.cases,r.repetitions[0].cases);
 for(const c of run.cases){const original=old.first_steps[c.case_index],ref=r.references.find(x=>x.case_index===c.case_index).reference;assert.equal(c.case_id,'finite-step66-case:'+c.case_index);exact(c.measurements.map(m=>m.refinement),CONFIG.rapier_refinements);
 for(const m of c.measurements){exact(m.pre,original.pre);assert.equal(m.dt_s,original.dt/m.refinement);assert.equal(m.horizon_s,original.dt);assert.equal(m.dt_s*m.refinement,original.dt);assert.equal(m.post.length,2);for(const [k,b] of m.post.entries()){for(const key of ['id','mass','anchor','inertia','principal_frame'])exact(b[key],m.pre[k][key]);}
 const a=invariants(m.pre),b=invariants(m.post),delta=sub(b.H,a.H),expected=mul(add(...ref.torques_world_Nm),original.dt),Herror=length(sub(delta,expected)),err=difference(m.post,ref.end.bodies);
 exact(m.physical_delta_H,delta);exact(m.expected_delta_H,expected);exact(m.physical_H_error,Herror);exact(m.endpoint_error,err);exact(m.anchor_gap_m,b.anchor_gap_m);exact(m.anchor_speed_m_s,b.anchor_speed_m_s);assert.equal(m.velocity_marker_pass,Math.max(err.angular,err.linear)<=CONFIG.diagnostic_markers.velocity);assert.equal(m.paired_reaction_marker_pass,length(delta)<=CONFIG.diagnostic_markers.physical_H);
 const frozen=states=>states.reduce((sum,s,k)=>add(sum,add(inertia(m.pre[k],aq(m.pre[k].rotation),av(s.angular_velocity)),cross(av(m.pre[k].world_com),mul(av(s.linear_velocity),s.mass)))),[0,0,0]);exact(m.PRE_pseudo_delta_H,sub(frozen(m.post),frozen(m.pre)));
 if(original.missing_reaction)assert.ok(!m.paired_reaction_marker_pass&&length(delta)>100*CONFIG.diagnostic_markers.physical_H);
 }}}
 return {valid:true,reference_controls:12,torque_cases:17,fresh_sets:5,measurements:425,original_PRE_reclassified:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const raw=fs.readFileSync(process.argv[2]),oldRaw=fs.readFileSync('docs/research/standing-lab/torso-torque60/gate-b.json'),r=JSON.parse(raw);assert.equal(r.provenance.original_report_sha256,createHash('sha256').update(oldRaw).digest('hex'));assert.equal(r.provenance.protocol_sha256,createHash('sha256').update(fs.readFileSync('docs/research/standing-lab/finite-step66-protocol.md')).digest('hex'));console.log(JSON.stringify(readDiagnosis(r,JSON.parse(oldRaw))));}

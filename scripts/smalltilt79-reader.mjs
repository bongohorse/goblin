// Strict stored-data audit. Importing this reader creates no physics worlds.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {clean,ROOT,config,initial,stateMetrics,auditStep,checkSetup,terminal,reaction,oneStepReference} from './smalltilt79-model.mjs';
import {oracleControls} from './actuation75-model.mjs';
import {readHistoricalInput} from './smalltilt79-historical-inputs.mjs';
const keys=(o,k)=>assert.deepEqual(Object.keys(o).sort(),k.split(',').sort(),'unexpected/missing schema fields');
function finite(o){if(typeof o==='number')assert.ok(Number.isFinite(o));else if(o&&typeof o==='object')for(const[k,v]of Object.entries(o)){assert.ok(!/approved|physics_pass|pass_physics/.test(k),'unscoped approval');finite(v);}}
function state(a){assert.equal(a.length,2);for(const b of a){keys(b,'id,mass,anchor,inertia,principal_frame,rotation,world_com,linear_velocity,angular_velocity');assert.equal(typeof b.id,'string');for(const k of ['anchor','inertia','world_com','linear_velocity','angular_velocity'])keys(b[k],'x,y,z');for(const k of ['rotation','principal_frame']){keys(b[k],'x,y,z,w');assert.ok(Math.hypot(...Object.values(b[k]))>0);}assert.equal(typeof b.mass,'number');for(const k of ['anchor','inertia','principal_frame','rotation','world_com','linear_velocity','angular_velocity'])for(const v of Object.values(b[k]))assert.equal(typeof v,'number');}stateMetrics(a);}
export function validate(r,expectedHead){
 keys(r,'schema_version,study,provenance,fresh_worlds,runs,failed_world,reaction,decision');finite(r);assert.equal(r.schema_version,1);assert.equal(r.study,config.study);
 keys(r.provenance,'git_commit,build_id,dirty,node,os,cpu,rapier,upstream,config_sha256,protocol_sha256,source_pins_sha256');
 assert.equal(r.provenance.dirty,false);assert.equal(r.provenance.node,'v24.21.0');assert.equal(r.provenance.rapier,config.rapier);assert.equal(r.provenance.upstream,config.upstream);assert.match(r.provenance.git_commit,/^[a-f0-9]{40}$/);assert.match(r.provenance.build_id,new RegExp('^'+r.provenance.git_commit+':[a-f0-9]{64}$'));
 assert.match(expectedHead,/^[a-f0-9]{40}$/,'published harness head required');assert.equal(r.provenance.git_commit,expectedHead,'wrong harness head');
 const hash=b=>createHash('sha256').update(b).digest('hex');for(const [p,k]of [['config.json','config_sha256'],['protocol.md','protocol_sha256'],['source-pins.json','source_pins_sha256']])assert.equal(r.provenance[k],hash(fs.readFileSync(ROOT+p)));
 assert.deepEqual(JSON.parse(fs.readFileSync(ROOT+'config.json')),config);
 for(const [p,h]of Object.entries(JSON.parse(fs.readFileSync(ROOT+'source-pins.json'))))assert.equal(hash(readHistoricalInput(p)),h,p);
 assert.ok(Number.isInteger(r.fresh_worlds)&&r.fresh_worlds>=1&&r.fresh_worlds<=75);assert.equal(r.fresh_worlds,r.runs.length+(r.failed_world?1:0));
 const cache=new Map();let firstFailure=-1;
 for(const [i,x]of r.runs.entries()){
  keys(x,'case,initial,T,setup,pre,initial_metrics,oracle_controls,steps,termination,error');assert.deepEqual(x.case,config.cases[i]);assert.equal(x.error,null);assert.deepEqual(x.initial,initial(x.case));state(x.pre);checkSetup(x.case,x);
  keys(x.setup,'counts,gravity,joint_type,joint_contacts,collider_groups,collider_masses,integration,bodies,contacts,motors,inverse_tensors');keys(x.setup.integration,'dt,numSolverIterations,numInternalPgsIterations,maxCcdSubsteps');keys(x.setup.counts,'bodies,colliders,joints,multibody_joints');for(const b of x.setup.bodies)keys(b,'dynamic,sleeping,linear_damping,angular_damping,additional_solver_iterations,gravity_scale,ccd');for(const t of x.setup.inverse_tensors){assert.equal(t.length,9);assert.ok(t.every(v=>typeof v==='number'));}
  assert.deepEqual(x.initial_metrics,stateMetrics(x.pre));const k=JSON.stringify(x.pre);if(!cache.has(k))cache.set(k,clean(oracleControls(x.pre,x.T)));assert.deepEqual(x.oracle_controls,cache.get(k));
  assert.ok(x.steps.length>0&&x.steps.length<=x.case.max_steps);
  for(const [j,s]of x.steps.entries()){
   keys(s,'step,T,pre,commands,reference,phase,runtime_before,runtime_after,forces_before,after_reset,accumulators,angular_after_add,post,forces_after,cleared,metrics');assert.equal(s.step,j+1);assert.equal(s.T,x.T);state(s.pre);state(s.post);assert.deepEqual(s.pre,j?x.steps[j-1].post:x.pre);assert.ok(stateMetrics(s.pre).tilt_rad<=.2);
   assert.deepEqual(s.angular_after_add,s.pre.map(b=>b.angular_velocity));auditStep(x.case,s);assert.deepEqual(s.reference,j?null:oneStepReference(s.pre,s.commands.encoded_pair,s.T));
   assert.deepEqual(s.post.map(b=>[b.id,b.mass,b.anchor,b.inertia,b.principal_frame]),x.pre.map(b=>[b.id,b.mass,b.anchor,b.inertia,b.principal_frame]));
   if(j<x.steps.length-1)assert.ok(s.metrics.post.tilt_rad<=.2,'continued after domain boundary');
  }
  assert.ok(x.steps.length===x.case.max_steps||x.steps.at(-1).metrics.post.tilt_rad>.2,'truncated trajectory');
  assert.deepEqual(x.termination,terminal(x.case,x));if(!x.termination.pass){assert.equal(firstFailure,-1);firstFailure=i;assert.equal(i,r.runs.length-1,'continued after failure');}
 }
 assert.deepEqual(r.reaction,reaction(r.runs));
 if(r.failed_world){const x=r.failed_world;keys(x,'case,initial,T,setup,pre,initial_metrics,oracle_controls,steps,termination,error');assert.deepEqual(x.case,config.cases[r.runs.length]);assert.equal(r.decision,'execution_blocker_no_rerun');assert.ok(x.error&&typeof x.error.message==='string');assert.equal(firstFailure,-1);throw new Error('Execution blocker needs manual phase review; cannot certify partial record');}
 const expected=firstFailure>=0?'behavior_blocker_no_rerun':r.reaction.pass===false?'negative_control_blocker_no_rerun':r.runs.length===75&&r.reaction.pass?'local_smalltilt_supported':null;
 assert.ok(expected,'incomplete result without verifiable blocker');assert.equal(r.decision,expected);
 return {valid:true,worlds:r.fresh_worlds,steps:r.runs.reduce((n,x)=>n+x.steps.length,0),decision:r.decision,blocking_case:firstFailure<0?null:r.runs[firstFailure].case.id,reaction:r.reaction,engine_precision:'indeterminate_not_certified',scope:'local fixture only; no general controller release'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(validate(JSON.parse(fs.readFileSync(process.argv[2])),process.argv[3])));

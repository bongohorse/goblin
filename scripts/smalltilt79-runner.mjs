// One bounded execution of the published Issue79 protocol. Never rerun a blocker.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {standingBuild} from './standing-provenance.js';
import {initRapier} from '../src/labs/standing/simulation.js';
import {fixture} from './torso-torque60-fixtures.js';
import {ov} from './finite-step66-reference.js';
import {oracleControls} from './actuation75-model.mjs';
import {clean,ROOT,config,initial,command,stateMetrics,stepMetrics,auditStep,checkSetup,terminal,reaction,oneStepReference} from './smalltilt79-model.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),out=process.argv[2];
assert.ok(out);assert.ok(!fs.existsSync(out),'Output exists: no rerun');
assert.deepEqual(JSON.parse(fs.readFileSync(ROOT+'config.json')),config);
const pins=JSON.parse(fs.readFileSync(ROOT+'source-pins.json'));
for(const [p,h]of Object.entries(pins))assert.equal(hash(fs.readFileSync(p)),h,p);
const build=standingBuild();assert.equal(build.dirty,false);assert.equal(process.version,'v24.21.0');
const r={schema_version:1,study:config.study,provenance:{...build,node:process.version,os:os.platform()+' '+os.release(),cpu:os.cpus()[0].model,rapier:config.rapier,upstream:config.upstream,config_sha256:hash(fs.readFileSync(ROOT+'config.json')),protocol_sha256:hash(fs.readFileSync(ROOT+'protocol.md')),source_pins_sha256:hash(fs.readFileSync(ROOT+'source-pins.json'))},fresh_worlds:0,runs:[],failed_world:null,reaction:{status:'pending_matched_core',pass:null},decision:null};
const save=()=>fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n');
await initRapier();const controls=new Map();
for(const c of config.cases){
 let f;const x={case:c,initial:initial(c),T:null,setup:null,pre:null,initial_metrics:null,oracle_controls:null,steps:[],termination:null,error:null};
 try{
  r.fresh_worlds++;f=fixture({rotation:x.initial.rotation});
  for(const [j,b]of f.bodies.entries()){b.setAngvel(x.initial.angular[j],true);b.setLinvel(x.initial.linear[j],true);}
  x.pre=f.state();x.T=f.world.timestep;
  const ip=f.world.integrationParameters;
  x.setup={counts:{bodies:f.world.bodies.len(),colliders:f.world.colliders.len(),joints:f.world.impulseJoints.len(),multibody_joints:f.world.multibodyJoints.len()},gravity:{...f.world.gravity},joint_type:f.joint.type(),joint_contacts:f.joint.contactsEnabled(),collider_groups:[],collider_masses:[],integration:Object.fromEntries(['dt','numSolverIterations','numInternalPgsIterations','maxCcdSubsteps'].map(k=>[k,ip[k]])),bodies:f.bodies.map(b=>({dynamic:b.isDynamic(),sleeping:b.isSleeping(),linear_damping:b.linearDamping(),angular_damping:b.angularDamping(),additional_solver_iterations:b.additionalSolverIterations(),gravity_scale:b.gravityScale(),ccd:b.isCcdEnabled()})),contacts:0,motors:0,inverse_tensors:f.bodies.map(b=>{const m=b.effectiveWorldInvInertia();return [m.m11,m.m21,m.m31,m.m12,m.m22,m.m32,m.m13,m.m23,m.m33];})};
  f.world.colliders.forEach(b=>{x.setup.collider_groups.push(b.collisionGroups());x.setup.collider_masses.push(b.mass());f.world.contactPairsWith(b,()=>x.setup.contacts++);});
  checkSetup(c,x);x.initial_metrics=stateMetrics(x.pre);
  const key=JSON.stringify(x.pre);if(!controls.has(key))controls.set(key,clean(oracleControls(x.pre,x.T)));x.oracle_controls=controls.get(key);
  const torques=()=>f.bodies.map(b=>({...b.userTorque()})),forces=()=>f.bodies.map(b=>({...b.userForce()}));
  const runtime=()=>{let contacts=0;f.world.colliders.forEach(b=>f.world.contactPairsWith(b,()=>contacts++));return {counts:{bodies:f.world.bodies.len(),colliders:f.world.colliders.len(),joints:f.world.impulseJoints.len(),multibody_joints:f.world.multibodyJoints.len()},gravity:{...f.world.gravity},joint_type:f.joint.type(),joint_contacts:f.joint.contactsEnabled(),contacts,integration:Object.fromEntries(['dt','numSolverIterations','numInternalPgsIterations','maxCcdSubsteps'].map(k=>[k,ip[k]])),bodies:f.bodies.map(b=>({dynamic:b.isDynamic(),sleeping:b.isSleeping(),linear_damping:b.linearDamping(),angular_damping:b.angularDamping(),additional_solver_iterations:b.additionalSolverIterations(),gravity_scale:b.gravityScale(),ccd:b.isCcdEnabled()}))};};
  for(let step=1;step<=c.max_steps;step++){
   const pre=f.state(),commands=command(c,pre),reference=step===1?oneStepReference(pre,commands.encoded_pair,x.T):null;
   const s={step,T:x.T,pre,commands,reference,phase:[],runtime_before:runtime(),runtime_after:null,forces_before:forces(),after_reset:null,accumulators:null,angular_after_add:null,post:null,forces_after:null,cleared:null,metrics:null};x.steps.push(s);
   for(const [body,b]of f.bodies.entries()){b.resetTorques(true);s.phase.push({op:'resetTorques',body,step:step-1,wake:true});}s.after_reset=torques();
   for(const [body,b]of f.bodies.entries()){const vector=ov(commands.encoded_pair[body]);b.addTorque(vector,true);s.phase.push({op:'addTorque',body,step:step-1,wake:true,vector});}
   s.accumulators=torques();s.angular_after_add=f.bodies.map(b=>({...b.angvel()}));assert.deepEqual(s.angular_after_add,pre.map(b=>b.angular_velocity));assert.deepEqual(s.accumulators,commands.encoded_pair.map(ov));
   f.world.step();s.phase.push({op:'world.step',step:step-1});s.post=f.state();s.forces_after=forces();
   for(const [body,b]of f.bodies.entries()){b.resetTorques(true);s.phase.push({op:'resetTorques',body,step,wake:true});}s.cleared=torques();
   s.runtime_after=runtime();s.metrics=stepMetrics(pre,s.post,commands,x.T);auditStep(c,s);
   if(s.metrics.post.tilt_rad>.2||step===c.max_steps)break;
  }
  x.termination=terminal(c,x);r.runs.push(x);
  if(!x.termination.pass){r.decision='behavior_blocker_no_rerun';save();break;}
  r.reaction=reaction(r.runs);
  if(r.reaction.pass===false){r.decision='negative_control_blocker_no_rerun';save();break;}
  save();console.log(JSON.stringify({case:c.id,worlds:r.fresh_worlds,steps:x.steps.length,termination:x.termination}));
 }catch(e){x.error={name:e.name,message:e.message};r.failed_world=x;r.decision='execution_blocker_no_rerun';save();break;}
 finally{f?.dispose();}
}
r.reaction=reaction(r.runs);
if(!r.decision)r.decision=r.runs.length===75&&r.reaction.pass?'local_smalltilt_supported':'incomplete_blocker_no_rerun';
save();console.log(JSON.stringify({fresh_worlds:r.fresh_worlds,decision:r.decision,reaction:r.reaction}));

// Issue75: exactly the frozen actuation74 matrix; no controller and no extra worlds.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {initRapier} from '../src/labs/standing/simulation.js';
import {standingBuild} from './standing-provenance.js';
import {fixture} from './torso-torque60-fixtures.js';
import {axis} from './torso-torque60-oracle.js';
import {ov} from './finite-step66-reference.js';
import {PROTOCOL_HEAD,CONFIG_SHA,PROTOCOL_SHA,construction,commandAudit,metrics,discriminate,oracleControls,publicControls} from './actuation75-model.mjs';
const p='docs/research/standing-lab/actuation74/',hash=b=>createHash('sha256').update(b).digest('hex'),cfgRaw=fs.readFileSync(p+'config.json'),cfg=JSON.parse(cfgRaw),out=process.argv[2];assert.ok(out);assert.equal(hash(cfgRaw),CONFIG_SHA);assert.equal(hash(fs.readFileSync(p+'protocol.md')),PROTOCOL_SHA);assert.equal(cfg.cases.length,27);assert.equal(cfg.repeats,5);
const build=standingBuild();assert.equal(build.dirty,false,'clean source head required');assert.equal(process.version,'v24.21.0');const historical=JSON.parse(fs.readFileSync('docs/research/standing-lab/torso-torque60/gate-b.json')),capsules=JSON.parse(fs.readFileSync('docs/research/standing-lab/gate-b72/attribution.json')).cases[0].runs[0].pre;
await initRapier();let worlds=0;const cases=[],controlCache=new Map(),refCache=new Map();
for(const c of cfg.cases){const runs=[];for(let repeat=1;repeat<=5;repeat++){
 const f=fixture({connected:c.connected,synthetic:c.synthetic,rotation:axis(0,1,0,.7).multiply(axis(0,0,1,-.08)),partnerRotation:axis(0,1,0,-.3).multiply(axis(1,0,0,.06))});worlds++;const context={id:c.id+'/'+repeat,repeat};
 try{const pre=f.state(),T=f.world.timestep;assert.deepEqual(pre,c.synthetic?historical.first_steps.find(x=>x.synthetic&&x.method==='impulse').pre:capsules);
 const getters=Object.getOwnPropertyDescriptors(Object.getPrototypeOf(f.world.integrationParameters)),integration={};for(const [k,d]of Object.entries(getters))if(d.get)integration[k]=f.world.integrationParameters[k];
 const bodies=f.bodies.map(b=>({dynamic:b.isDynamic(),sleeping:b.isSleeping(),linear_damping:b.linearDamping(),angular_damping:b.angularDamping(),additional_solver_iterations:b.additionalSolverIterations(),gravity_scale:b.gravityScale(),ccd:b.isCcdEnabled()}));
 assert.ok(bodies.every(b=>b.dynamic&&!b.sleeping&&b.linear_damping===0&&b.angular_damping===0&&b.additional_solver_iterations===0&&!b.ccd));assert.deepEqual({...f.world.gravity},{x:0,y:0,z:0});assert.equal(T,Math.fround(1/60));assert.equal(integration.numSolverIterations,32);assert.equal(integration.numInternalPgsIterations,1);assert.equal(integration.maxCcdSubsteps,1);
 const inverse=f.bodies.map(b=>{const m=b.effectiveWorldInvInertia();return [m.m11,m.m21,m.m31,m.m12,m.m22,m.m32,m.m13,m.m23,m.m33];}),public_controls=publicControls(pre,inverse,c.synthetic);assert.equal(public_controls.pass,true);
 const key=JSON.stringify(pre);if(!controlCache.has(key))controlCache.set(key,oracleControls(pre,T));
 const commands=construction(c,pre,T);Object.assign(context,{pre,T,commands});metrics(c,{pre,post:pre,commands,T},cfg,refCache);const phase=[],torques=()=>f.bodies.map(b=>({...b.userTorque()})),forces=()=>f.bodies.map(b=>({...b.userForce()}));let step=0;const forces_before=forces();
 for(const [body,b]of f.bodies.entries()){b.resetTorques(true);phase.push({op:'resetTorques',body,step,wake:true});}const after_reset=torques();
 for(const [body,b]of f.bodies.entries()){const vector=ov(commands.applied_encoded_pair[body]);b[commands.api](vector,true);phase.push({op:commands.api,body,step,wake:true,vector,readback_torque:{...b.userTorque()},readback_angular_velocity:{...b.angvel()}});}
 Object.assign(context,{phase,after_reset,forces_before});const accumulators=torques();Object.assign(context,{accumulators});if(c.method==='torque'){f.world.step();phase.push({op:'world.step',step});step++;}const post=f.state(),forces_after=forces();Object.assign(context,{post,forces_after});
 for(const [body,b]of f.bodies.entries()){b.resetTorques(true);phase.push({op:'resetTorques',body,step,wake:true});}
 const x={id:c.id+'/'+repeat,repeat,T,pre,post,commands,phase,after_reset,accumulators,cleared:torques(),forces_before,forces_after,public_steps:step,counts:{bodies:f.world.bodies.len(),colliders:f.world.colliders.len(),joints:f.world.impulseJoints.len()},environment:{gravity:{...f.world.gravity},integration,bodies,joint_contacts_enabled:f.joint?f.joint.contactsEnabled():null},public_inverse_tensors:inverse,public_controls,oracle_control_key:key,termination:'completed_bounded_measurement'};
 Object.assign(context,x);x.command_audit=commandAudit(c,x);x.metrics=metrics(c,x,cfg,refCache);if(c.method==='impulse')assert.ok(x.metrics.endpoint_error.angular<=1e-5&&x.metrics.endpoint_error.linear<=1e-5,'fail_control');runs.push(x);
 }catch(error){fs.writeFileSync(out,JSON.stringify({schema_version:1,study:'bounded-actuation75-blocker-v1',provenance:build,fresh_worlds:worlds,completed_cases:cases,current_case:{id:c.id,runs},failed_observation:context,error:{name:error.name,message:error.message},decision:'execution_blocker_no_rerun'},null,2)+'\n');throw error;}finally{f.dispose();}
}cases.push({id:c.id,runs});console.log(JSON.stringify({completed_case:c.id,worlds}));}
const local_discrimination=discriminate(cases),report={schema_version:1,study:'bounded-actuation75-v1',provenance:{...build,node:process.version,os:os.platform()+' '+os.release(),cpu:os.cpus()[0].model,rapier:'0.21.0',upstream:cfg.upstream,protocol_head:PROTOCOL_HEAD,config_sha256:CONFIG_SHA,protocol_sha256:PROTOCOL_SHA},case_count:27,fresh_worlds:worlds,oracle_controls:[...controlCache].map(([key,result])=>({key,result})),cases,command_contract:'positive_commands_pass_expected_negative_violations_observed',independent_controls:'pass',local_discrimination,engine_precision:{status:'indeterminate_not_certified',general_envelope:null,endpoint_acceptance_marker:null,H_acceptance_marker:null},bounded_actuation_evidence:local_discrimination.pass?'local_supported':'actuation_discrimination_blocked'};
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({fresh_worlds:worlds,decision:report.bounded_actuation_evidence,local_discrimination}));

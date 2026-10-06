// Bounded reproduction of Issue52; no new solver/motor/rig experiment or CPU sweep.
import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import R from '@dimforge/rapier3d-compat';
import {Quaternion,Vector3,Matrix3,Matrix4} from 'three';
import {initRapier,StandingSimulation} from '../src/labs/standing/simulation.js';
import {canonical,validateResultProvenance} from '../src/labs/standing/config.js';
import {sphericalMotorView,MOTOR_AXES} from '../src/labs/standing/motors.js';
import {commandFixed} from './spherical-target52-contract.js';
import {verifyTargetFixtures} from './spherical-target52-fixtures.js';
import {targetRun,validateTargetRun} from './spherical-target52.js';
import {motorExperiment} from '../src/labs/standing/motor-config.js';
import {compareResults} from '../src/labs/standing/compare.js';
import {modelRun,validateModelRun,quantiles} from './motor-model48.js';
import {standingBuild} from './standing-provenance.js';
const qaxis=(x,y,z,a)=>new Quaternion().setFromAxisAngle(new Vector3(x,y,z),a);
const qcopy=q=>new Quaternion(q.x,q.y,q.z,q.w);
const vcopy=v=>new Vector3(v.x,v.y,v.z);
const record=v=>({x:v.x,y:v.y,z:v.z});
const tensor=body=>{
  const axes=qcopy(body.rotation()).normalize().multiply(qcopy(body.principalInertiaLocalFrame()).normalize());
  const rotation=new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromQuaternion(axes)),i=body.principalInertia();
  return rotation.clone().multiply(new Matrix3().set(i.x,0,0,0,i.y,0,0,0,i.z)).multiply(rotation.clone().transpose());
};
function observeBody(body){
  const spin=vcopy(body.angvel()).applyMatrix3(tensor(body));
  const orbital=vcopy(body.worldCom()).cross(vcopy(body.linvel()).multiplyScalar(body.mass()));
  return {mass:body.mass(),inertia:{...body.principalInertia()},principal_frame:{...body.principalInertiaLocalFrame()},rotation:{...body.rotation()},world_com:{...body.worldCom()},linear_velocity:{...body.linvel()},angular_velocity:{...body.angvel()},world_inertia:tensor(body).elements.slice(),spin:record(spin),orbital:record(orbital),momentum:record(spin.clone().add(orbital))};
}
export function independentCounterreaction(){
  const world=new R.World({x:0,y:0,z:0});world.timestep=1/60;world.integrationParameters.numSolverIterations=32;
  try{
    // Compose all initial frames with Three.js, not the project's quaternion helpers.
    const p=qaxis(0,1,0,.7).multiply(qaxis(0,0,1,-.4)),f1=qaxis(1,0,0,.4).multiply(qaxis(0,0,1,.2)),f2=qaxis(0,0,1,-.5).multiply(qaxis(0,1,0,.3));
    const a=world.createRigidBody(R.RigidBodyDesc.dynamic().setRotation(p).setCanSleep(false));
    const b=world.createRigidBody(R.RigidBodyDesc.dynamic().setRotation(p.clone().multiply(f1).multiply(f2.clone().invert())).setCanSleep(false));
    world.createCollider(R.ColliderDesc.ball(.4).setMass(1),a);world.createCollider(R.ColliderDesc.ball(.4).setMass(2),b);
    const zero={x:0,y:0,z:0},descriptor=R.JointData.spherical(zero,zero),joint=sphericalMotorView(world,world.createImpulseJoint(descriptor,a,b,true),descriptor);
    joint.setContactsEnabled(false);joint.setFrameX1(f1);joint.setFrameX2(f2);
    const target=qaxis(1,0,0,.3).multiply(qaxis(0,1,0,-.25));
    commandFixed(joint,{x:target.x,y:target.y,z:target.z,w:target.w},{stiffness:100,damping:12,max_torque_Nm:20});
    for(const axis of MOTOR_AXES)joint.configureMotor(axis,0,100,100,12);
    const pre_frame=qcopy(a.rotation()).multiply(qcopy(joint.frameX1())).normalize(),before=[observeBody(a),observeBody(b)];world.step();
    const after=[observeBody(a),observeBody(b)],delta=after.map((o,i)=>vcopy(o.momentum).sub(vcopy(before[i].momentum))),residual=delta[0].clone().add(delta[1]).length();
    const scalar=vcopy(a.angvel()).multiplyScalar(a.principalInertia().x).add(vcopy(b.angvel()).multiplyScalar(b.principalInertia().x)).length();
    // Independent analytic sphere inertia (mass2/5*r²), plus the tensor oracle.
    const analytic=vcopy(a.angvel()).multiplyScalar(.4*.4*2/5).add(vcopy(b.angvel()).multiplyScalar(2*.4*.4*2/5)).length();
    const effort=delta[1].clone().divideScalar(world.timestep).applyQuaternion(pre_frame.clone().invert());
    assert.ok(Math.abs(residual-scalar)<1e-13&&Math.abs(analytic-scalar)<1e-12,'Independent oracles disagree');
    for(const o of after){assert.ok(vcopy(o.orbital).length()===0);assert.ok(vcopy(o.linear_velocity).length()===0);assert.equal(o.inertia.x,o.inertia.y);assert.equal(o.inertia.x,o.inertia.z);}
    for(const component of ['x','y','z'])assert.ok(Math.abs(effort[component]-20)<20*1e-5);
    const wrong_frame=delta[1].clone().divideScalar(world.timestep).applyQuaternion(pre_frame);assert.ok(Math.max(...['x','y','z'].map(k=>Math.abs(wrong_frame[k]-20)))>1,'Frame-direction negative is insensitive');
    return {fixture:'exact original rotated-body cap20/+velocity100/FB100,12/Solver32/dt1/60',before,after,pre_step_motor_frame:{x:pre_frame.x,y:pre_frame.y,z:pre_frame.z,w:pre_frame.w},dt:world.timestep,delta_momenta:delta.map(record),scalar_residual:scalar,tensor_plus_orbital_residual:residual,analytic_sphere_residual:analytic,strict_1e_6_pass:residual<1e-6,effort_Nm:record(effort),wrong_frame_effort_Nm:record(wrong_frame),cause:'undiagnosed; no threshold/solver/rig/gain change'};
  }finally{world.free();}
}
export async function reproduceTargets54(directory){
  await initRapier();const build=standingBuild();assert.equal(build.dirty,false,'Review evidence requires clean code/harness head');
  const root='docs/research/standing-lab/target-study52/',read=name=>JSON.parse(fs.readFileSync(root+name));
  fs.mkdirSync(directory,{recursive:true});const save=(name,value)=>fs.writeFileSync(directory+'/'+name,JSON.stringify(value)+'\n');
  const manifest=read('sha256.json');for(const [name,hash] of Object.entries(manifest))assert.equal(createHash('sha256').update(fs.readFileSync(root+name)).digest('hex'),hash,name);
  const original=read('report.json');assert.equal(createHash('sha256').update(fs.readFileSync('docs/research/standing-lab/target-study52-protocol.md')).digest('hex'),original.protocol_sha256);
  const report={...build,review_kind:'spherical-target-review54-v1',original_pr_head:'4876bd5775ec011f82859861e0b2b84c3e39f9a5',original_measured_head:original.git_commit,review_base:'9c7ced77f873716e9a1d9a76e9fd971a0db44a84',node:process.version,os:os.platform()+' '+os.release(),cpu:os.cpus()[0]?.model,manifest_files:Object.keys(manifest).length,stored_runs_validated:0,groups:[],regressions:[],cpu_recalculated:[],counterreaction:null};
  const fixtures=verifyTargetFixtures(),oldFixtures=read('fixtures.json');for(const key of Object.keys(fixtures))assert.equal(canonical(fixtures[key]),canonical(oldFixtures[key]),key+' fixture reproduction');save('fixtures.json',{...build,...fixtures});
  const oracle=independentCounterreaction();assert.ok(Math.abs(oracle.scalar_residual-oldFixtures.counterreaction_resolution_probe.momentum_residual)<1e-13);assert.equal(oracle.strict_1e_6_pass,false);report.counterreaction=oracle;save('counterreaction.json',{...build,...oracle});
  const physicalKeys=['steps','standing_time','first_terminal','end_reason','invalid','invalid_measurement','metrics','end','contact_onsets','state_sequence_hash'];
  for(const group of original.groups){const runs=[];for(let i=1;i<=5;i++){
    const name=`${group.representation}-${group.cap}-${i}.json`,stored=read(name);await validateTargetRun(stored);report.stored_runs_validated++;
    const run=await targetRun(group.config,{metadata:{...build,run_index:i}});await validateTargetRun(run);
    for(const key of physicalKeys)assert.equal(canonical(run[key]),canonical(stored[key]),key+' fresh reproduction');
    assert.equal(canonical(run.measurement.checkpoints),canonical(stored.measurement.checkpoints));assert.equal(canonical(run.measurement.telemetry),canonical(stored.measurement.telemetry));
    save(name,run);runs.push({steps:run.steps,terminal:run.first_terminal,sequence_hash:run.state_sequence_hash,physical_fields_exact:true,checkpoints_exact:true,telemetry_exact:true});
  }report.groups.push({representation:group.representation,cap:group.cap,runs});console.log(JSON.stringify({representation:group.representation,cap:group.cap,steps:runs.map(r=>r.steps),exact:true}));}
  for(const b of original.benchmark){assert.equal(b.warmup_worlds,3);assert.equal(b.measured_worlds,5);assert.equal(b.steps_per_world,60);assert.equal(b.worlds.length,5);assert.deepEqual(b.worlds.map(w=>w.round),[3,4,5,6,7]);
    for(const channel of ['physics','commands','observation']){assert.equal(b.samples[channel].length,300);assert.ok(b.samples[channel].every(x=>Number.isFinite(x)&&x>=0));assert.equal(canonical(b.samples[channel]),canonical(b.worlds.flatMap(w=>w[channel])));assert.equal(canonical(quantiles(b.samples[channel])),canonical(b.summaries[channel]));assert.ok(b.worlds.every(w=>w.steps===60&&w.terminal===null&&w[channel].length===60));}
    report.cpu_recalculated.push({cap:b.cap,representation:b.representation,channels:3,samples_per_channel:300,aggregation_exact:true});
  }
  for(const cap of [null,20,1]){const sim=new StandingSimulation(undefined,build,cap===null?null:motorExperiment(cap));try{
    while(!sim.terminal)sim.step();const result=await sim.result();await validateResultProvenance(result);
    const path=cap===null?'docs/research/standing-lab/review-39/baseline/run-1.json':`docs/research/standing-lab/review-46/numeric/motor${cap}-run1.json`;
    const comparison=compareResults(JSON.parse(fs.readFileSync(path)),result);assert.ok(comparison.pass);report.regressions.push({kind:cap===null?'passive-v1':'force-v2',cap,steps:result.simulation_steps,comparison});
  }finally{sim.dispose();}}
  for(const cap of [20,1])for(const [model,calibrated] of [['ForceBased',false],['AccelerationBased',false],['AccelerationBased',true]]){
    const reference=JSON.parse(fs.readFileSync(`docs/research/standing-lab/review-50/${model}-${cap}-${calibrated?'calibrated':'numbers'}-normal-1.json`));
    const run=await modelRun(reference.config,{metadata:build});await validateModelRun(run);const comparison=compareResults(reference.result,run.result);assert.ok(comparison.pass);
    for(const key of physicalKeys)assert.equal(canonical(run[key]),canonical(reference[key]));report.regressions.push({kind:'model-v3',model,cap,calibrated,steps:run.steps,sequence_hash:run.state_sequence_hash,comparison});
  }
  save('review.json',report);const names=fs.readdirSync(directory).filter(n=>n.endsWith('.json')&&n!=='sha256.json').sort();
  save('sha256.json',Object.fromEntries(names.map(n=>[n,createHash('sha256').update(fs.readFileSync(directory+'/'+n)).digest('hex')])));
  console.log(JSON.stringify({build,stored:report.stored_runs_validated,manifest:report.manifest_files,counterreaction:report.counterreaction.scalar_residual,strict_pass:false,cpu_rows:report.cpu_recalculated.length,regressions:report.regressions}));
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await reproduceTargets54(process.env.GOBLIN_REVIEW_OUTPUT??'../.standing-tools/review54');

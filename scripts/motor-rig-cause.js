// Issue #42: bounded diagnostic counterfactuals, never Standing acceptance.
import R from '@dimforge/rapier3d-compat';
import fs from 'node:fs';
import os from 'node:os';
import {execSync} from 'node:child_process';
import {StandingSimulation,initRapier,colliderDesc} from '../src/labs/standing/simulation.js';
import {BASELINE,configIdentity} from '../src/labs/standing/config.js';
import {compareResults} from '../src/labs/standing/compare.js';
import {commandMotor,neutralMotorConfig,sphericalMotorView} from '../src/labs/standing/motors.js';
import {jointObservation} from '../src/labs/standing/math.js';
import {hingeOracle} from './motor-rig-oracle.js';
await initRapier();
function entries(world,joints){return [...joints.values()].map(e=>({...e,joint:e.spec.type==='spherical'?sphericalMotorView(world,e.joint,R.JointData.spherical(e.spec.anchorA,e.spec.anchorB)):e.joint,frame:{...e.joint.frameX1()}}));}
function contacts(sim){
  const colliders=[{id:'floor',collider:sim.floor},...[...sim.bodies.values()].map(e=>({id:e.spec.id,collider:e.collider}))].filter(e=>e.collider);
  const out=[];
  for(let a=0;a<colliders.length;a++)for(let b=a+1;b<colliders.length;b++)sim.world.contactPair(colliders[a].collider,colliders[b].collider,(m,flipped)=>{
    for(let i=0;i<m.numContacts();i++)if(m.contactDist(i)<=0)out.push({a:colliders[a].id,b:colliders[b].id,flipped,normal:{...m.normal()},distance:m.contactDist(i),point1:{...m.localContactPoint1(i)},point2:{...m.localContactPoint2(i)},normal_impulse:m.contactImpulse(i),normal_load_N:m.contactImpulse(i)/sim.world.timestep});
  });return out;
}
function raw(e,cap){const j=e.joint,a=j.body1(),b=j.body2(),f1=j.frameX1(),f2=j.frameX2();
  return {id:e.spec.id,parent:{rotation:{...a.rotation()},position:{...a.translation()},angular_velocity:{...a.angvel()}},child:{rotation:{...b.rotation()},position:{...b.translation()},angular_velocity:{...b.angvel()}},anchor1:{...j.anchor1()},anchor2:{...j.anchor2()},frame1:{...f1},frame2:{...f2},bind_frame:e.frame,target:e.spec.type==='spherical'?{x:0,y:0,z:0,w:1}:0,cap_Nm:cap,limits:e.spec.limits,existing:jointObservation(e),oracle:e.spec.type==='revolute'?hingeOracle(a.rotation(),b.rotation(),f1,f2):null};}
function minimal(ids,jointIds,gravity,floor){
  const world=new R.World(gravity?BASELINE.gravity:{x:0,y:0,z:0});world.timestep=BASELINE.fixed_dt;
  for(const [k,v] of Object.entries(BASELINE.solver_config))if(k!=='additionalSolverIterations')world.integrationParameters[k]=v;
  const sim={world,bodies:new Map(),joints:new Map(),floor:null,steps:0,terminal:null};
  if(floor){const f=BASELINE.floor;sim.floor=world.createCollider(R.ColliderDesc.cuboid(f.half.x,f.half.y,f.half.z).setTranslation(f.position.x,f.position.y,f.position.z).setFriction(f.friction).setRestitution(f.restitution));}
  for(const spec of BASELINE.bodies.filter(s=>ids.includes(s.id))){const p=spec.position,body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(p.x,p.y,p.z).setRotation(spec.rotation).setLinearDamping(spec.linearDamping).setAngularDamping(spec.angularDamping));body.setAdditionalSolverIterations(0);const collider=world.createCollider(colliderDesc(spec.shape).setMass(spec.mass).setFriction(spec.friction).setRestitution(spec.restitution),body);sim.bodies.set(spec.id,{spec,body,collider});}
  for(const spec of BASELINE.joints.filter(j=>jointIds.includes(j.id))){const d=spec.type==='revolute'?R.JointData.revolute(spec.anchorA,spec.anchorB,spec.axis):R.JointData.spherical(spec.anchorA,spec.anchorB),joint=world.createImpulseJoint(d,sim.bodies.get(spec.parent).body,sim.bodies.get(spec.child).body,true);joint.setContactsEnabled(false);if(spec.limits)joint.setLimits(...spec.limits);sim.joints.set(spec.id,{spec,joint});}
  sim.step=()=>{world.step();sim.steps++;for(const e of sim.joints.values()){const o=jointObservation(e);if(o.anchor_error>.08||(o.limit_violation??0)>.05){sim.terminal={invalid:'constraint_error:'+e.spec.id};break;}}};sim.dispose=()=>world.free();return sim;
}
export function runCase(c){
  const sim=c.parts?minimal(c.parts,c.joints,c.gravity,c.floor):new StandingSimulation();
  try{
    if(!c.parts){if(c.zeroGravity)sim.world.gravity={x:0,y:0,z:0};if(c.noFloor)sim.floor.setEnabled(false);if(c.noSelf){sim.floor.setCollisionGroups((2<<16)|1);for(const e of sim.bodies.values())e.collider.setCollisionGroups((1<<16)|2);}if(c.solver)sim.world.integrationParameters.numSolverIterations=c.solver;}
    const es=entries(sim.world,sim.joints),settings={...neutralMotorConfig(BASELINE),max_torque_Nm:c.cap};
    let firstLimit=null,maxViolation=0,maxOracleDifference=0,maxEngineDifference=0,maxAxisError=0;const ring=[];
    while(sim.steps<180&&!sim.terminal){
      for(const e of es)if(c.motors!=='off'&&(!c.motors||e.spec.type===c.motors))commandMotor(e.joint,e.spec.type,e.spec.type==='revolute'?0:{x:0,y:0,z:0,w:1},settings,e.frame);
      sim.step();const states=es.map(e=>raw(e,c.cap));
      for(const s of states)if(s.oracle){maxViolation=Math.max(maxViolation,s.existing.limit_violation);maxAxisError=Math.max(maxAxisError,s.oracle.axis_error);const diff=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));maxOracleDifference=Math.max(maxOracleDifference,diff(s.existing.angle,s.oracle.angle));maxEngineDifference=Math.max(maxEngineDifference,diff(s.existing.angle,s.oracle.engine_angle));}
      const trace={step:sim.steps,joints:states,contacts:contacts(sim)};
      if(!firstLimit&&states.some(s=>(s.existing.limit_violation??0)>1e-5))firstLimit=trace;
      ring.push(trace);if(ring.length>4)ring.shift();
    }
    return {case:c,steps:sim.steps,termination:sim.terminal??{diagnostic_horizon:180},max_violation_rad:maxViolation,max_axis_error:maxAxisError,max_oracle_difference_rad:maxOracleDifference,max_engine_angle_difference_rad:maxEngineDifference,first_limit_crossing:firstLimit,failure_window:ring,actual_motor_effort:null,effort_reason:'Contact/limit/coupled impulses are inseparable through supported getters'};
  }finally{sim.dispose();}
}
const cases=[{id:'original20',cap:20},{id:'original1',cap:1},{id:'off',cap:20,motors:'off'},{id:'hinges',cap:20,motors:'revolute'},{id:'spherical',cap:20,motors:'spherical'},{id:'zero-gravity',cap:20,zeroGravity:true},{id:'no-floor',cap:20,noFloor:true},{id:'no-self',cap:20,noSelf:true},{id:'solver32',cap:20,solver:32}];
for(const [prefix,parts,joints,cap] of [['ankle2',['lowerLegL','footL'],['ankleL'],20],['leg3',['upperLegL','lowerLegL','footL'],['kneeL','ankleL'],20],['arm3',['upperArmR','lowerArmR','handR'],['elbowR','wristR'],1]]){
  cases.push({id:prefix+'-free',parts,joints,cap,gravity:false,floor:false},{id:prefix+'-gravity',parts,joints,cap,gravity:true,floor:false},{id:prefix+'-floor',parts,joints,cap,gravity:true,floor:true},{id:prefix+'-off',parts,joints,cap,gravity:true,floor:true,motors:'off'});
}
if(process.argv[1]?.endsWith('motor-rig-cause.js')){
 const report={diagnostic_only:true,accepted_standing_evidence:false,base:'9263a0dfe178b83f4734431196d6a0658c7d6318',git_commit:execSync('git rev-parse HEAD',{encoding:'utf8'}).trim(),dirty:!!execSync('git status --porcelain',{encoding:'utf8'}).trim(),node:process.version,os:os.platform()+' '+os.release(),rapier:R.version(),fixed_dt:BASELINE.fixed_dt,baseline_identity:await configIdentity(BASELINE),runs:cases.map(runCase)};
 const passive=new StandingSimulation();try{while(!passive.terminal)passive.step();const result=await passive.result();report.passive=compareResults(JSON.parse(fs.readFileSync('docs/research/standing-lab/review-39/baseline/run-1.json','utf8')),result);}finally{passive.dispose();}
 fs.writeFileSync(process.env.GOBLIN_CAUSE_OUTPUT??'../.standing-tools/motor42-cause.json',JSON.stringify(report,null,2)+'\n');
 console.table(report.runs.map(r=>({id:r.case.id,steps:r.steps,termination:r.termination.invalid_detail??r.termination.invalid??r.termination.termination_reason??'horizon',violation:r.max_violation_rad,oracle_diff:r.max_oracle_difference_rad,engine_diff:r.max_engine_angle_difference_rad,axis_error:r.max_axis_error})));console.log('Passive',JSON.stringify(report.passive));
}

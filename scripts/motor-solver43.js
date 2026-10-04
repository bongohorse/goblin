import fs from 'node:fs';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execSync} from 'node:child_process';
import R from '@dimforge/rapier3d-compat';
import {StandingSimulation,initRapier} from '../src/labs/standing/simulation.js';
import {BASELINE,canonical} from '../src/labs/standing/config.js';
import {compareResults} from '../src/labs/standing/compare.js';
import {commandMotor} from '../src/labs/standing/motors.js';
import {norm} from '../src/labs/standing/math.js';
import {entries,contacts,raw,minimal} from './motor-rig-cause.js';
import {experimentConfig,experimentIdentity,validateExperiment} from './motor-solver43-config.js';
await initRapier();
const parts=['pelvis','torso','upperLegL','lowerLegL','footL'],joints=['spine','hipL','kneeL','ankleL'];
const summary=values=>{const s=values.slice().sort((a,b)=>a-b);return {count:s.length,median:s[Math.floor(s.length/2)]??null,p95:s[Math.min(s.length-1,Math.ceil(s.length*.95)-1)]??null,max:s.at(-1)??null};};
function makeSim(config,fixture){
  validateExperiment(config);const sim=fixture==='minimal'?minimal(parts,joints,true,true):new StandingSimulation();
  sim.world.integrationParameters.numSolverIterations=config.effective_solver_config.numSolverIterations;
  if(sim.world.integrationParameters.numSolverIterations!==config.effective_solver_config.numSolverIterations)throw Error('Solver readback mismatch');
  return sim;
}
function minimalSafety(sim){
  if(sim.world.bodies.len()!==5||sim.world.colliders.len()!==6||sim.world.impulseJoints.len()!==4)return 'lost_resource';
  for(const e of sim.bodies.values()){
    const b=e.body,p=b.translation(),q=b.rotation(),v=b.linvel(),a=b.angvel();
    if(!b.isValid())return 'lost_body:'+e.spec.id;
    if([...Object.values(p),...Object.values(q),...Object.values(v),...Object.values(a)].some(n=>!Number.isFinite(n)))return 'nonfinite:'+e.spec.id;
    if(norm(p)>20||norm(v)>50||norm(a)>200||Math.abs(Math.hypot(...Object.values(q))-1)>1e-4)return 'exploding_state:'+e.spec.id;
  }return null;
}
function trace(sim,es,cap){return {step:sim.steps,joints:es.map(e=>raw(e,cap)),contacts:contacts(sim)};}
function stats(){return {limit_error_rad:{value:0,step:0,joint:null},anchor_error_m:{value:0,step:0,joint:null},axis_error:{value:0,step:0,joint:null},oracle_difference_rad:0,first_small_limit_crossing:null,first_limit_safety_crossing:null,first_anchor_safety_crossing:null};}
function accumulate(out,t){
  for(const j of t.joints){for(const [key,value] of [['limit_error_rad',j.existing.limit_violation??0],['anchor_error_m',j.existing.anchor_error],['axis_error',j.oracle?.axis_error??0]])if(value>out[key].value)out[key]={value,step:t.step,joint:j.id};
    if(j.oracle)out.oracle_difference_rad=Math.max(out.oracle_difference_rad,Math.abs(Math.atan2(Math.sin(j.oracle.angle-j.existing.angle),Math.cos(j.oracle.angle-j.existing.angle))));
    if(!out.first_small_limit_crossing&&(j.existing.limit_violation??0)>1e-5)out.first_small_limit_crossing={step:t.step,joint:j.id,value:j.existing.limit_violation};
    if(!out.first_limit_safety_crossing&&(j.existing.limit_violation??0)>.05)out.first_limit_safety_crossing={step:t.step,joint:j.id,value:j.existing.limit_violation};
    if(!out.first_anchor_safety_crossing&&j.existing.anchor_error>.08)out.first_anchor_safety_crossing={step:t.step,joint:j.id,value:j.existing.anchor_error};
  }
}
export function candidateRun(config,{mode='normal',fixture='full',horizon=3600}={}){
  if(!['normal','diagnostic-after-contact'].includes(mode)||!['full','minimal'].includes(fixture)||!Number.isInteger(horizon)||horizon<1||horizon>3600)throw Error('Run contract');
  const sim=makeSim(config,fixture),es=entries(sim.world,sim.joints),cap=config.actuation.max_torque_Nm;
  const out={mode,fixture,diagnostic_only:mode!=='normal'||fixture!=='full',accepted_standing_evidence:false,standing_time:null,first_normal_terminal:null,first_nonfoot_contact:null,metrics:stats(),max_contact_load:{value:0,step:0,a:null,b:null},contact_onsets:[],failure_window:[]};
  let previousPairs=new Set(),peakImpact=null;
  const physicalHash=createHash('sha256');
  try{
    while(sim.steps<horizon){
      if(sim.terminal){if(fixture==='full'&&mode==='diagnostic-after-contact'&&sim.terminal.termination_reason==='non_foot_contact')sim.terminal=null;else break;}
      if(fixture==='minimal'){const invalid=minimalSafety(sim);if(invalid){sim.terminal={invalid};break;}}
      for(const e of es)commandMotor(e.joint,e.spec.type,e.spec.type==='revolute'?0:{x:0,y:0,z:0,w:1},config.actuation,e.frame);
      sim.step();if(fixture==='minimal'){const invalid=minimalSafety(sim);if(invalid)sim.terminal={invalid};}
      const t=trace(sim,es,cap);accumulate(out.metrics,t);
      physicalHash.update(canonical(t));
      const pairs=new Set(t.contacts.map(c=>[c.a,c.b].sort().join('/')));
      for(const pair of pairs)if(!previousPairs.has(pair))out.contact_onsets.push({step:sim.steps,pair});previousPairs=pairs;
      const nonfeet=t.contacts.filter(c=>c.a==='floor'&&BASELINE.bodies.find(b=>b.id===c.b)?.body_class!=='foot');
      if(!out.first_nonfoot_contact&&nonfeet.length)out.first_nonfoot_contact={step:sim.steps,contacts:nonfeet};
      for(const c of t.contacts)if(c.normal_load_N>out.max_contact_load.value){out.max_contact_load={value:c.normal_load_N,step:sim.steps,a:c.a,b:c.b};peakImpact=t;}
      if(sim.terminal&&!out.first_normal_terminal)out.first_normal_terminal=structuredClone(sim.terminal);
      out.failure_window.push(t);if(out.failure_window.length>3)out.failure_window.shift();
      // A minimal fixture is always diagnostic and never reports Standing time.
      if(mode==='normal'&&fixture==='full'&&sim.terminal){out.standing_time=sim.terminal.standing_time;break;}
    }
    out.steps=sim.steps;out.observed_time=sim.steps*BASELINE.fixed_dt;
    out.end=sim.terminal??{termination_reason:sim.steps===3600?'diagnostic_horizon':'test_horizon'};
    if(mode==='diagnostic-after-contact'&&sim.steps===3600&&out.end.termination_reason!=='invalid_simulation'&&!out.end.invalid)out.end={termination_reason:'diagnostic_horizon'};
    out.peak_impact_trace=peakImpact;out.state_contact_sequence_hash=physicalHash.digest('hex');
    return out;
  }finally{sim.dispose();}
}
function benchmarkWorld(config,fixture){
  const sim=makeSim(config,fixture),es=entries(sim.world,sim.joints),physics=[],commands=[];
  try{
    for(let i=0;i<60;i++){
      let start=performance.now();for(const e of es)commandMotor(e.joint,e.spec.type,e.spec.type==='revolute'?0:{x:0,y:0,z:0,w:1},config.actuation,e.frame);commands.push(performance.now()-start);
      start=performance.now();sim.world.step();physics.push(performance.now()-start);
      // Boundary checks outside measured world.step; never skip anomaly controls.
      const invalid=fixture==='full'?sim.anomaly():minimalSafety(sim);if(invalid)throw Error('Benchmark invalid '+invalid);
      if(fixture==='minimal')for(const e of es){const o=raw(e,config.actuation.max_torque_Nm).existing;if(o.anchor_error>.08||(o.limit_violation??0)>.05)throw Error('Benchmark constraint failure');}
    }
    return {physics,commands};
  }finally{sim.dispose();}
}
function benchmark(){
  const result=[];
  for(const [fixture,cap] of [['full',20],['full',1],['minimal',20]]){
    const samples={8:[],32:[]};for(let i=0;i<8;i++)for(const solver of i%2?[32,8]:[8,32]){
      const measured=benchmarkWorld(experimentConfig(cap,solver),fixture);if(i>=3)samples[solver].push(measured);
    }
    for(const solver of [8,32]){const worlds=samples[solver],physics=worlds.flatMap(w=>w.physics),commands=worlds.flatMap(w=>w.commands),summaryPhysics=summary(physics);
      result.push({fixture,cap,solver,steps_per_world:60,warmup_worlds:3,measured_worlds:5,physics_ms:summaryPhysics,commands_ms:summary(commands),world_physics_summaries:worlds.map(w=>summary(w.physics)),outliers_above_3x_median:physics.filter(v=>v>3*summaryPhysics.median),physics_samples_ms:physics});
    }
  }return result;
}
if(process.argv[1]?.endsWith('motor-solver43.js')){
  const report={schema_version:1,report_kind:'motor-solver-candidate-report-v1',accepted_standing_evidence:false,git_commit:execSync('git rev-parse HEAD',{encoding:'utf8'}).trim(),dirty:!!execSync('git status --porcelain',{encoding:'utf8'}).trim(),node:process.version,os:os.platform()+' '+os.release(),cpu:os.cpus()[0]?.model,rapier:R.version(),upstream:'b716d375efc0201003f0cd9ef7168eee0b62c177',configs:[],full_runs:[],minimal_runs:[]};
  for(const cap of [20,1])for(const solver of [8,32]){
    const config=experimentConfig(cap,solver),identity=await experimentIdentity(config);report.configs.push({config,...identity});
    for(const mode of ['normal','diagnostic-after-contact']){
      const runs=Array.from({length:5},(_,i)=>({run_index:i+1,...candidateRun(config,{mode})}));
      report.full_runs.push({cap,solver,...identity,mode,repeated_state_hash_equal:new Set(runs.map(r=>r.state_contact_sequence_hash)).size===1,runs});
      console.log(JSON.stringify({cap,solver,mode,steps:runs.map(r=>r.steps),ends:runs.map(r=>r.end),limit:runs[0].metrics.limit_error_rad,hashes_equal:new Set(runs.map(r=>r.state_contact_sequence_hash)).size===1}));
    }
  }
  for(const solver of [8,32])report.minimal_runs.push({solver,...candidateRun(experimentConfig(20,solver),{fixture:'minimal',mode:'diagnostic-after-contact'})});
  report.benchmark=benchmark();
  const passive=new StandingSimulation();try{while(!passive.terminal)passive.step();const r=await passive.result();report.passive={steps:r.simulation_steps,standing_time:r.standing_time,failure_bodies:r.failure_bodies,config_id:r.config_id,comparison:compareResults(JSON.parse(fs.readFileSync('docs/research/standing-lab/review-39/baseline/run-1.json','utf8')),r)};}finally{passive.dispose();}
  // Compact evidence preserves every repetition summary/hash and selected raw states.
  for(const group of report.full_runs)for(const r of group.runs)if(r.run_index!==1){delete r.failure_window;delete r.peak_impact_trace;}
  fs.writeFileSync(process.env.GOBLIN_SOLVER43_OUTPUT??'../.standing-tools/motor43-report.json',JSON.stringify(report)+'\n');
  console.table(report.benchmark.map(b=>({fixture:b.fixture,cap:b.cap,solver:b.solver,...b.physics_ms})));console.log('Passive',JSON.stringify(report.passive));
}

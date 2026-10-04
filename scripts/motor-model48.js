import fs from 'node:fs';
import os from 'node:os';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {StandingSimulation,initRapier} from '../src/labs/standing/simulation.js';
import {modelExperiment,validateModelExperiment} from '../src/labs/standing/model-config.js';
import {motorExperiment} from '../src/labs/standing/motor-config.js';
import {canonical,validateResultProvenance,configIdentity} from '../src/labs/standing/config.js';
import {compareResults} from '../src/labs/standing/compare.js';
import {jointObservation} from '../src/labs/standing/math.js';
import {standingBuild} from './standing-provenance.js';
export const quantiles=values=>{const s=values.slice().sort((a,b)=>a-b);return {count:s.length,median:s[Math.floor(s.length/2)]??null,p95:s[Math.max(0,Math.ceil(s.length*.95)-1)]??null,max:s.at(-1)??null};};
export async function modelRun(config,{diagnostic=false,metadata={}}={}){
  validateModelExperiment(config);if(diagnostic&&config.comparison_question!=='same-numbers')throw Error('No calibrated diagnostic continuation');
  const sim=new StandingSimulation(undefined,metadata,config),sequence=createHash('sha256');
  const metrics={drift_peak_m:0,tracking_peak_rad:0,anchor_peak_m:0,limit_peak_rad:0,axis_peak:0,foot_load_peak_N:{footL:0,footR:0},both_feet_loaded_steps:0};
  const contact_onsets=[];let first_terminal=null,previous=new Set(),end=null,invalid_measurement=null;
  try{
    while(sim.steps<3600){
      if(sim.terminal){if(diagnostic&&sim.terminal.termination_reason==='non_foot_contact')sim.terminal=null;else break;}
      sim.step();if(sim.terminal&&!first_terminal)first_terminal=structuredClone(sim.terminal);
      // Raw invalid end-state observations are diagnostic only. Never advance invalids.
      try{const t=sim.telemetry??sim.observeState(),joints=[...sim.joints.values()].map(jointObservation);
        metrics.drift_peak_m=Math.max(metrics.drift_peak_m,t.drift);metrics.tracking_peak_rad=Math.max(metrics.tracking_peak_rad,...t.motor_tracking.map(t=>t.error_rad));
        metrics.anchor_peak_m=Math.max(metrics.anchor_peak_m,...joints.map(j=>j.anchor_error));metrics.limit_peak_rad=Math.max(metrics.limit_peak_rad,...joints.map(j=>j.limit_violation??0));metrics.axis_peak=Math.max(metrics.axis_peak,...joints.map(j=>j.axis_error??0));
        for(const foot of ['footL','footR'])metrics.foot_load_peak_N[foot]=Math.max(metrics.foot_load_peak_N[foot],t.foot_loads[foot]??0);
        if(t.foot_loads.footL>0&&t.foot_loads.footR>0)metrics.both_feet_loaded_steps++;
        const ids=new Set(t.contacts.map(c=>c.body_id));for(const id of ids)if(!previous.has(id))contact_onsets.push({step:sim.steps,body:id});previous=ids;
        end={step:sim.steps,drift_m:t.drift,foot_loads:t.foot_loads,pelvis_orientation:t.pelvis_orientation,torso_orientation:t.torso_orientation,motor_tracking:t.motor_tracking,joints,contacts:t.contacts};
        sequence.update(canonical({snapshot:sim.snapshot(),tracking:t.motor_tracking,joints}));
      }catch(error){invalid_measurement=error.message;}
      if(sim.terminal&&sim.terminal.termination_reason==='invalid_simulation')break;
      if(!diagnostic&&sim.terminal)break;
    }
    const report={report_kind:'motor-model-run-v1',mode:diagnostic?'diagnostic-after-contact':'normal',diagnostic_only:diagnostic,accepted_standing_evidence:false,config:structuredClone(config),...await configIdentity(config),steps:sim.steps,standing_time:diagnostic?null:sim.terminal?.standing_time??null,first_terminal,end_reason:diagnostic&&sim.steps===3600?'diagnostic_horizon':sim.terminal?.termination_reason??'incomplete',invalid:sim.invalid,invalid_measurement,metrics:{...metrics,both_feet_loaded_fraction:sim.steps?metrics.both_feet_loaded_steps/sim.steps:null},end,contact_onsets,state_sequence_hash:sequence.digest('hex')};
    if(!diagnostic){report.result=await sim.result();await validateResultProvenance(report.result);}
    return report;
  }finally{sim.dispose();}
}
export async function validateModelRun(report){
  validateModelExperiment(report.config);const identity=await configIdentity(report.config);
  if(report.report_kind!=='motor-model-run-v1'||report.accepted_standing_evidence!==false||report.config_id!==identity.config_id||report.experiment_id!==identity.experiment_id||!Number.isInteger(report.steps)||report.steps<0||report.steps>3600||!/^[a-f0-9]{64}$/.test(report.state_sequence_hash))throw Error('Invalid model run contract');
  if(report.invalid_measurement!==null)throw Error('Incomplete model measurements');
  if(report.mode==='normal'){await validateResultProvenance(report.result);if(report.diagnostic_only!==false||canonical(report.result.config)!==canonical(report.config)||report.result.simulation_steps!==report.steps||report.result.standing_time!==report.standing_time||report.result.termination_reason!==report.end_reason||report.result.invalid_detail!==report.invalid)throw Error('Inconsistent normal model run');}
  else if(report.mode!=='diagnostic-after-contact'||report.diagnostic_only!==true||report.standing_time!==null||report.result!==undefined||report.config.comparison_question!=='same-numbers')throw Error('Diagnostic cannot claim normal Standing result');
  return report;
}
function benchmarkWorld(config){
  const sim=new StandingSimulation(undefined,{},config);try{while(sim.steps<60&&!sim.terminal)sim.step();return {steps:sim.steps,terminal:sim.terminal,physics:sim.physicsTimes.slice(),commands:sim.commandTimes.slice(),observation:sim.observationTimes.slice()};}finally{sim.dispose();}
}
function benchmark(){
  const report=[];for(const cap of [20,1])for(const calibrated of [false,true]){
    const groups={ForceBased:[],AccelerationBased:[]};
    for(let round=0;round<8;round++)for(const model of round%2?['AccelerationBased','ForceBased']:['ForceBased','AccelerationBased']){
      const row=benchmarkWorld(modelExperiment(model,cap,model==='AccelerationBased'&&calibrated));if(round>=3)groups[model].push(row);
    }
    for(const model of ['ForceBased','AccelerationBased']){const rows=groups[model],samples={physics:rows.flatMap(r=>r.physics),commands:rows.flatMap(r=>r.commands),observation:rows.flatMap(r=>r.observation)};
      report.push({cap,comparison_question:calibrated?'scalar-calibrated':'same-numbers',model,warmup_worlds:3,measured_worlds:5,steps_per_world:60,matched_segment:rows.every(r=>r.steps===60),summaries:Object.fromEntries(Object.entries(samples).map(([k,v])=>[k,quantiles(v)])),world_physics_summaries:rows.map(r=>quantiles(r.physics)),samples,terminals:rows.map(r=>r.terminal)});
    }
  }return report;
}
if(process.argv[1]?.endsWith('motor-model48.js')){
  await initRapier();const build=standingBuild(),directory=process.env.GOBLIN_MODEL_OUTPUT??'../.standing-tools/model48';fs.mkdirSync(directory,{recursive:true});
  const report={report_kind:'motor-model-study-v1',accepted_standing_evidence:false,...build,node:process.version,os:os.platform()+' '+os.release(),cpu:os.cpus()[0]?.model,configs:[],groups:[],benchmark:null};
  for(const cap of [20,1])for(const [model,calibrated] of [['ForceBased',false],['AccelerationBased',false],['AccelerationBased',true]]){
    const config=modelExperiment(model,cap,calibrated);report.configs.push({config,...await configIdentity(config)});
    for(const diagnostic of calibrated?[false]:[false,true]){
      const runs=[];for(let run_index=1;run_index<=5;run_index++){const run={run_index,...await modelRun(config,{diagnostic,metadata:{...build,run_index}})};await validateModelRun(run);runs.push(run);fs.writeFileSync(`${directory}/${model}-${cap}-${calibrated?'calibrated':'numbers'}-${diagnostic?'diagnostic':'normal'}-${run_index}.json`,JSON.stringify(run)+'\n');}
      const repeated_state_hash_equal=new Set(runs.map(r=>r.state_sequence_hash)).size===1;
      const comparisons=diagnostic?null:runs.slice(1).map(r=>compareResults(runs[0].result,r.result));
      report.groups.push({model,cap,calibrated,diagnostic,repeated_state_hash_equal,comparisons,runs:runs.map(({result, ...r})=>r)});
      assert.ok(repeated_state_hash_equal,'Diagnostic repeatability differs');
      if(!diagnostic&&runs[0].end_reason!=='invalid_simulation')assert.ok(comparisons.every(c=>c.pass));
      console.log(JSON.stringify({model,cap,calibrated,diagnostic,steps:runs.map(r=>r.steps),ends:runs.map(r=>r.end_reason),metrics:runs[0].metrics,repeated_state_hash_equal}));
    }
  }
  report.force_regression=[];
  for(const cap of [20,1]){const sim=new StandingSimulation(undefined,build,motorExperiment(cap));try{
    while(!sim.terminal)sim.step();const result=await sim.result();await validateResultProvenance(result);
    const original=JSON.parse(fs.readFileSync(`docs/research/standing-lab/review-46/numeric/motor${cap}-run1.json`)),comparison=compareResults(original,result);assert.ok(comparison.pass);
    const study=JSON.parse(fs.readFileSync(`${directory}/ForceBased-${cap}-numbers-normal-1.json`)).result;
    assert.equal(canonical(study.checkpoints),canonical(result.checkpoints));assert.equal(study.simulation_steps,result.simulation_steps);
    report.force_regression.push({cap,comparison,study_vs_original_checkpoints_exact:true,config_id:result.config_id,steps:result.simulation_steps});
  }finally{sim.dispose();}}
  const passive=new StandingSimulation();try{while(!passive.terminal)passive.step();const result=await passive.result();report.passive={steps:result.simulation_steps,failure_bodies:result.failure_bodies,config_id:result.config_id,comparison:compareResults(JSON.parse(fs.readFileSync('docs/research/standing-lab/review-39/baseline/run-1.json')),result)};assert.ok(report.passive.comparison.pass);}finally{passive.dispose();}
  const deltas=[];let previous=performance.now();for(let i=0;i<10000;i++){const now=performance.now();if(now>previous)deltas.push(now-previous);previous=now;}report.timer={method:'minimum positive successive performance.now delta, observed not guaranteed resolution',min_positive_ms:Math.min(...deltas)};
  report.benchmark=benchmark();fs.writeFileSync(directory+'/report.json',JSON.stringify(report)+'\n');console.log(JSON.stringify({benchmark:report.benchmark.map(({samples,...r})=>r),passive:report.passive,force:report.force_regression}));
}

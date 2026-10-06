import fs from 'node:fs';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {StandingSimulation,initRapier} from '../src/labs/standing/simulation.js';
import {canonical,configIdentity,validateResult,validateResultProvenance} from '../src/labs/standing/config.js';
import {motorExperiment} from '../src/labs/standing/motor-config.js';
import {modelRun,validateModelRun,quantiles} from './motor-model48.js';
import {validateModelPayload} from './motor-model48-payload.js';
import {compareResults} from '../src/labs/standing/compare.js';
import {standingBuild} from './standing-provenance.js';
import {REPRESENTATIONS,FixedTargets,targetConfig,targetIdentity,validateTargetConfig} from './spherical-target52-contract.js';
import {verifyTargetFixtures} from './spherical-target52-fixtures.js';

export function targetSimulation(config,metadata={}){
  validateTargetConfig(config);
  const sim=new StandingSimulation(undefined,metadata,config.reference_experiment);
  if(config.representation==='fixed-native'){
    sim.motor.clear();sim.motor=new FixedTargets(config.reference_experiment.actuation,sim.config);sim.reset();
  }
  return sim;
}
// Reuse the existing neutral-rig measurement validators through a local projection.
// This projection is NEVER exported as a v2 result. Its config labels only describe
// the frozen measurement shape, not the fixed-native command representation.
async function measurementProjection(report){
  const experiment=report.config.reference_experiment;
  return {...report.measurement,schema_version:2,controller_id:experiment.controller_id,config:experiment,...await configIdentity(experiment)};
}
export async function validateTargetRun(report){
  const keys=['schema_version','report_kind','mode','diagnostic_only','accepted_standing_evidence','config','config_id','experiment_id','steps','standing_time','first_terminal','end_reason','invalid','invalid_measurement','metrics','end','contact_onsets','state_sequence_hash','measurement'];
  assert.equal(Object.keys(report).sort().join(),keys.sort().join(),'Unknown or missing target-study fields');
  // The outer comparison payload has no legacy Ajv schema of its own. Its nested
  // objects must not silently carry unknown model/frame/effort or nonfinite data.
  const exactKeys=(value,keys)=>{
    assert.ok(value&&typeof value==='object'&&!Array.isArray(value),'Target payload object');
    assert.equal(Object.keys(value).sort().join(),keys.slice().sort().join(),'Unknown or missing target payload fields');
  };
  exactKeys(report.metrics,['drift_peak_m','tracking_peak_rad','anchor_peak_m','limit_peak_rad','axis_peak','foot_load_peak_N','both_feet_loaded_steps','both_feet_loaded_fraction']);
  exactKeys(report.metrics.foot_load_peak_N,['footL','footR']);
  assert.ok(Array.isArray(report.contact_onsets));
  for(const onset of report.contact_onsets)exactKeys(onset,['step','body']);
  const finite=value=>typeof value==='number'?Number.isFinite(value):!value||typeof value!=='object'||Object.values(value).every(finite);
  assert.ok(finite(report),'Nonfinite target-study payload');
  validateTargetConfig(report.config);
  const id=targetIdentity(report.config);
  assert.equal(report.schema_version,1);assert.equal(report.report_kind,'spherical-target-run-v1');
  assert.equal(report.config_id,id.config_id);assert.equal(report.experiment_id,id.experiment_id);
  assert.equal(report.mode,'normal');assert.equal(report.diagnostic_only,false);assert.equal(report.accepted_standing_evidence,false);
  assert.match(report.state_sequence_hash,/^[a-f0-9]{64}$/);
  assert.equal(report.invalid_measurement,null);
  for(const field of ['config','schema_version','controller_id','config_id','experiment_id'])assert.ok(!Object.hasOwn(report.measurement,field),'no misleading legacy result tags');
  const projection=await measurementProjection(report);validateResult(projection);
  assert.equal(report.steps,projection.simulation_steps);assert.equal(report.standing_time,projection.standing_time);
  assert.equal(report.end_reason,projection.termination_reason);assert.equal(report.invalid,projection.invalid_detail);
  validateModelPayload({...report,config:report.config.reference_experiment,result:projection});
  return report;
}
export async function targetRun(config,{metadata={}}={}){
  const sim=targetSimulation(config,metadata),sequence=createHash('sha256');
  const metrics={drift_peak_m:0,tracking_peak_rad:0,anchor_peak_m:0,limit_peak_rad:0,axis_peak:0,foot_load_peak_N:{footL:0,footR:0},both_feet_loaded_steps:0};
  const contact_onsets=[];let previous=new Set(),end=null,invalid_measurement=null;
  try{
    while(!sim.terminal){
      sim.step();
      try{
        const t=sim.telemetry??sim.observeState();
        for(const [name,value] of Object.entries({drift_peak_m:t.drift,tracking_peak_rad:Math.max(...t.motor_tracking.map(t=>t.error_rad)),anchor_peak_m:Math.max(...t.joints.map(j=>j.anchor_error)),limit_peak_rad:Math.max(...t.joints.map(j=>j.limit_violation??0)),axis_peak:Math.max(...t.joints.map(j=>j.axis_error??0))}))metrics[name]=Math.max(metrics[name],value);
        for(const foot of ['footL','footR'])metrics.foot_load_peak_N[foot]=Math.max(metrics.foot_load_peak_N[foot],t.foot_loads[foot]);
        if(t.foot_loads.footL>0&&t.foot_loads.footR>0)metrics.both_feet_loaded_steps++;
        const ids=new Set(t.contacts.map(c=>c.body_id));for(const id of ids)if(!previous.has(id))contact_onsets.push({step:sim.steps,body:id});previous=ids;
        end={step:sim.steps,drift_m:t.drift,foot_loads:t.foot_loads,pelvis_orientation:t.pelvis_orientation,torso_orientation:t.torso_orientation,motor_tracking:t.motor_tracking,joints:t.joints,contacts:t.contacts};
        sequence.update(canonical({snapshot:sim.snapshot(),tracking:t.motor_tracking,joints:t.joints}));
      }catch(error){invalid_measurement=error.message;}
    }
    const measurement=structuredClone(await sim.result());
    for(const key of ['schema_version','controller_id','config','config_id','experiment_id'])delete measurement[key];
    const report={schema_version:1,report_kind:'spherical-target-run-v1',mode:'normal',diagnostic_only:false,accepted_standing_evidence:false,
      config:structuredClone(config),...targetIdentity(config),steps:sim.steps,standing_time:sim.terminal.standing_time,first_terminal:structuredClone(sim.terminal),end_reason:sim.terminal.termination_reason,invalid:sim.invalid,invalid_measurement,
      metrics:{...metrics,both_feet_loaded_fraction:sim.steps?metrics.both_feet_loaded_steps/sim.steps:null},end,contact_onsets,state_sequence_hash:sequence.digest('hex'),measurement};
    await validateTargetRun(report);return report;
  }finally{sim.dispose();}
}
const physicalKeys=['steps','standing_time','first_terminal','end_reason','invalid','invalid_measurement','metrics','end','contact_onsets','state_sequence_hash'];
const physical=run=>Object.fromEntries(physicalKeys.map(k=>[k,run[k]]));
function benchmark(){
  const report=[];
  for(const cap of [20,1]){
    const groups=Object.fromEntries(REPRESENTATIONS.map(r=>[r,[]]));
    for(let round=0;round<8;round++)for(const representation of round%2?REPRESENTATIONS.slice().reverse():REPRESENTATIONS){
      const sim=targetSimulation(targetConfig(representation,cap));try{
        while(sim.steps<60&&!sim.terminal)sim.step();assert.equal(sim.steps,60);assert.equal(sim.terminal,null);
        if(round>=3)groups[representation].push({round,steps:sim.steps,terminal:sim.terminal,physics:sim.physicsTimes.slice(),commands:sim.commandTimes.slice(),observation:sim.observationTimes.slice()});
      }finally{sim.dispose();}
    }
    for(const representation of REPRESENTATIONS){const worlds=groups[representation],samples=Object.fromEntries(['physics','commands','observation'].map(k=>[k,worlds.flatMap(w=>w[k])]));
      report.push({cap,representation,warmup_worlds:3,measured_worlds:5,steps_per_world:60,worlds,samples,summaries:Object.fromEntries(Object.entries(samples).map(([k,v])=>[k,quantiles(v)]))});
    }
  }
  return report;
}
export async function runStudy(directory){
  await initRapier();const build=standingBuild();assert.equal(build.dirty,false,'Commit harness before recording evidence');
  fs.mkdirSync(directory,{recursive:true});const save=(name,value)=>fs.writeFileSync(directory+'/'+name,JSON.stringify(value)+'\n');
  const fixtures={...build,...verifyTargetFixtures()};save('fixtures.json',fixtures);
  const report={schema_version:1,report_kind:'spherical-target-study-v1',...build,node:process.version,rapier_js_version:'0.21.0',rapier_upstream_commit:'b716d375efc0201003f0cd9ef7168eee0b62c177',os:os.platform()+' '+os.release(),arch:os.arch(),cpu:os.cpus()[0]?.model,
    protocol_sha256:createHash('sha256').update(fs.readFileSync('docs/research/standing-lab/target-study52-protocol.md')).digest('hex'),groups:[],neutral_pairs:[],regressions:[],benchmark:null};
  for(const cap of [20,1]){
    const paired=[];
    for(const representation of REPRESENTATIONS){
      const config=targetConfig(representation,cap),runs=[];
      for(let run_index=1;run_index<=5;run_index++){
        const run=await targetRun(config,{metadata:{...build,run_index}});save(`${representation}-${cap}-${run_index}.json`,run);runs.push(run);
      }
      for(const run of runs)assert.equal(canonical(physical(run)),canonical(physical(runs[0])),'fresh-world reproducibility');
      report.groups.push({representation,cap,config,...targetIdentity(config),runs:5,steps:runs[0].steps,terminal:runs[0].first_terminal,metrics:runs[0].metrics,state_sequence_hash:runs[0].state_sequence_hash,reproducible_exact:true});paired.push(runs[0]);
      const {config:unused,...summary}=report.groups.at(-1);console.log(JSON.stringify(summary));
    }
    assert.equal(canonical(physical(paired[0])),canonical(physical(paired[1])),'neutral physical sequence must be no-op');
    assert.equal(canonical(paired[0].measurement.checkpoints),canonical(paired[1].measurement.checkpoints));
    report.neutral_pairs.push({cap,physical_sequence_exact:true,checkpoints_exact:true,interpretation:'Neutral-pose no-op; no stability advantage'});
  }
  for(const cap of [null,20,1]){const sim=new StandingSimulation(undefined,build,cap===null?null:motorExperiment(cap));try{
    while(!sim.terminal)sim.step();const result=await sim.result();await validateResultProvenance(result);
    const path=cap===null?'docs/research/standing-lab/review-39/baseline/run-1.json':`docs/research/standing-lab/review-46/numeric/motor${cap}-run1.json`;
    const comparison=compareResults(JSON.parse(fs.readFileSync(path)),result);assert.ok(comparison.pass);
    if(cap!==null){const study=JSON.parse(fs.readFileSync(`${directory}/fixed-native-${cap}-1.json`));assert.equal(canonical(study.measurement.checkpoints),canonical(result.checkpoints));}
    report.regressions.push({kind:cap===null?'passive-v1':'force-v2',cap,config_id:result.config_id,steps:result.simulation_steps,comparison});
  }finally{sim.dispose();}}
  for(const cap of [20,1])for(const [model,calibrated] of [['ForceBased',false],['AccelerationBased',false],['AccelerationBased',true]]){
    const name=`${model}-${cap}-${calibrated?'calibrated':'numbers'}-normal-1.json`,reference=JSON.parse(fs.readFileSync('docs/research/standing-lab/review-50/'+name));
    const run=await modelRun(reference.config,{metadata:build});await validateModelRun(run);
    const comparison=compareResults(reference.result,run.result);assert.ok(comparison.pass);
    for(const key of physicalKeys.filter(k=>k!=='invalid_measurement'))assert.equal(canonical(run[key]),canonical(reference[key]),key+' model-v3 regression');
    report.regressions.push({kind:'model-study-v3',model,cap,calibrated,config_id:run.config_id,steps:run.steps,comparison,state_sequence_hash:run.state_sequence_hash});
  }
  report.benchmark=benchmark();
  const deltas=[];let previous=performance.now();for(let i=0;i<10000;i++){const now=performance.now();if(now>previous)deltas.push(now-previous);previous=now;}
  report.timer={method:'minimum observed positive successive performance.now delta; not guaranteed resolution',min_positive_ms:Math.min(...deltas)};
  save('report.json',report);
  const names=fs.readdirSync(directory).filter(n=>n.endsWith('.json')&&n!=='sha256.json').sort();
  save('sha256.json',Object.fromEntries(names.map(n=>[n,createHash('sha256').update(fs.readFileSync(directory+'/'+n)).digest('hex')])));
  console.log(JSON.stringify({neutral_pairs:report.neutral_pairs,regressions:report.regressions,benchmark:report.benchmark.map(({samples,worlds,...r})=>r),build}));
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await runStudy(process.env.GOBLIN_TARGET_OUTPUT??'../.standing-tools/target52');

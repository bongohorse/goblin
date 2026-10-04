import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {standingBuild} from './standing-provenance.js';
import {modelRun,validateModelRun,quantiles} from './motor-model48.js';
import {initRapier,StandingSimulation} from '../src/labs/standing/simulation.js';
import {motorExperiment} from '../src/labs/standing/motor-config.js';
import {canonical,validateResultProvenance} from '../src/labs/standing/config.js';
import {compareResults} from '../src/labs/standing/compare.js';

// Review only the preregistered cases. CPU is recalculated from stored raw samples,
// not remeasured or compared to this validation run's wall time.
await initRapier();const build=standingBuild(),root='docs/research/standing-lab/model-ab48/';
assert.equal(build.dirty,false,'Review measurements require a clean worktree');
const read=name=>JSON.parse(fs.readFileSync(root+name));
const manifest=read('sha256.json');for(const [name,hash] of Object.entries(manifest))assert.equal(createHash('sha256').update(fs.readFileSync(root+name)).digest('hex'),hash,name);
const original=read('report.json'),output=process.env.GOBLIN_REVIEW_OUTPUT??'../.standing-tools/review50';fs.mkdirSync(output,{recursive:true});
const report={...build,node:process.version,os:os.platform()+' '+os.release(),manifest_files:Object.keys(manifest).length,original_reports_validated:0,cpu_recalculated:true,groups:[],diagnostics:[],baselines:[]};
for(const g of original.groups){
  const prefix=`${g.model}-${g.cap}-${g.calibrated?'calibrated':'numbers'}-${g.diagnostic?'diagnostic':'normal'}`;
  for(let i=1;i<=5;i++){const raw=read(prefix+'-'+i+'.json');await validateModelRun(raw);report.original_reports_validated++;
    for(const key of ['metrics','end','contact_onsets','state_sequence_hash','first_terminal'])assert.equal(canonical(raw[key]),canonical(g.runs[0][key]),key+' repeated/source report');
  }
  if(g.diagnostic)continue;
  const reference=read(prefix+'-1.json'),runs=[];
  for(let i=1;i<=5;i++){const run=await modelRun(reference.config,{metadata:{...build,run_index:i}});await validateModelRun(run);
    const comparison=compareResults(reference.result,run.result);assert.equal(comparison.pass,true,JSON.stringify(comparison));
    for(const key of ['metrics','end','contact_onsets','state_sequence_hash','first_terminal'])assert.equal(canonical(run[key]),canonical(reference[key]),key+' fresh reproduction');
    fs.writeFileSync(output+'/'+prefix+'-'+i+'.json',JSON.stringify(run)+'\n');runs.push({steps:run.steps,termination:run.end_reason,comparison,sequence_hash:run.state_sequence_hash});
  }
  report.groups.push({config_id:reference.config_id,model:g.model,cap:g.cap,calibrated:g.calibrated,runs});console.log(JSON.stringify(report.groups.at(-1)));
}
for(const b of original.benchmark){assert.equal(b.matched_segment,true);assert.equal(b.warmup_worlds,3);assert.equal(b.measured_worlds,5);assert.equal(b.steps_per_world,60);
  for(const k of ['physics','commands','observation']){assert.equal(b.samples[k].length,300);assert.ok(b.samples[k].every(x=>Number.isFinite(x)&&x>=0));assert.equal(canonical(quantiles(b.samples[k])),canonical(b.summaries[k]));}
  assert.ok(b.terminals.every(x=>x===null));
}
for(const [model,cap] of [['AccelerationBased',20],['ForceBased',1]]){const reference=read(`${model}-${cap}-numbers-diagnostic-1.json`),run=await modelRun(reference.config,{diagnostic:true,metadata:build});await validateModelRun(run);
  for(const key of ['metrics','end','contact_onsets','state_sequence_hash','first_terminal','steps'])assert.equal(canonical(run[key]),canonical(reference[key]));
  fs.writeFileSync(output+`/${model}-${cap}-diagnostic.json`,JSON.stringify(run)+'\n');report.diagnostics.push({model,cap,steps:run.steps,standing_time:run.standing_time,hash:run.state_sequence_hash});
}
for(const cap of [null,20,1]){const sim=new StandingSimulation(undefined,build,cap===null?null:motorExperiment(cap));try{while(!sim.terminal)sim.step();const result=await sim.result();await validateResultProvenance(result);
  const path=cap===null?'docs/research/standing-lab/review-39/baseline/run-1.json':`docs/research/standing-lab/review-46/numeric/motor${cap}-run1.json`;
  const comparison=compareResults(JSON.parse(fs.readFileSync(path)),result);assert.equal(comparison.pass,true);report.baselines.push({cap,config_id:result.config_id,steps:result.simulation_steps,comparison});
}finally{sim.dispose();}}
fs.writeFileSync(output+'/review.json',JSON.stringify(report)+'\n');console.log(JSON.stringify({validated:report.original_reports_validated,cpu_recalculated:true,diagnostics:report.diagnostics,baselines:report.baselines,build}));

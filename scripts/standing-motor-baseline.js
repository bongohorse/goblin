import fs from 'node:fs';
import os from 'node:os';
import {standingBuild} from './standing-provenance.js';
import {StandingSimulation,initRapier} from '../src/labs/standing/simulation.js';
import {motorExperiment} from '../src/labs/standing/motor-config.js';
import {validateResultProvenance} from '../src/labs/standing/config.js';
import {compareResults} from '../src/labs/standing/compare.js';
await initRapier();const build=standingBuild(),directory=process.env.GOBLIN_MOTOR_EVIDENCE_DIR??'../.standing-tools/motor44-numeric';fs.mkdirSync(directory,{recursive:true});
const report={...build,command:'node scripts/standing-motor-baseline.js',caps:[],passive:null};
for(const cap of [20,1]){
  const runs=[],metrics=[];for(let run_index=1;run_index<=5;run_index++){
    const s=new StandingSimulation(undefined,{...build,run_index,platform:{os:os.platform()+' '+os.release(),runtime:'Node '+process.version,host:os.hostname(),user_agent:null}},motorExperiment(cap));
    try{const peak={drift_m:0,anchor_error_m:0,limit_error_rad:0,tracking_error_rad:0};while(!s.terminal){s.step();const t=s.telemetry;if(t){peak.drift_m=Math.max(peak.drift_m,t.drift);peak.anchor_error_m=Math.max(peak.anchor_error_m,...t.joints.map(j=>j.anchor_error));peak.limit_error_rad=Math.max(peak.limit_error_rad,...t.joints.map(j=>j.limit_violation??0));peak.tracking_error_rad=Math.max(peak.tracking_error_rad,...t.motor_tracking.map(j=>j.error_rad));}}metrics.push(peak);const r=await s.result();await validateResultProvenance(r);runs.push(r);fs.writeFileSync(directory+`/motor${cap}-run${run_index}.json`,JSON.stringify(r)+'\n');}finally{s.dispose();}
  }
  report.caps.push({cap,config_id:runs[0].config_id,experiment_id:runs[0].experiment_id,steps:runs.map(r=>r.simulation_steps),standing_times:runs.map(r=>r.standing_time),failure_bodies:runs.map(r=>r.failure_bodies),comparisons:runs.slice(1).map(r=>compareResults(runs[0],r)),peak_metrics:metrics,end_telemetry:runs[0].telemetry,physics_timing:runs.map(r=>r.physics_timing)});
}
const passive=new StandingSimulation();try{while(!passive.terminal)passive.step();const r=await passive.result();report.passive={steps:r.simulation_steps,standing_time:r.standing_time,config_id:r.config_id,comparison:compareResults(JSON.parse(fs.readFileSync('docs/research/standing-lab/review-39/baseline/run-1.json')),r)};}finally{passive.dispose();}
report.pass=report.caps.every(g=>g.comparisons.every(c=>c.pass))&&report.passive.comparison.pass;fs.writeFileSync(directory+'/comparison.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:report.pass,...build,caps:report.caps.map(({cap,steps,standing_times})=>({cap,steps,standing_times})),passive:report.passive}));if(!report.pass)process.exitCode=1;

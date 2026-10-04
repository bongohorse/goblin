import fs from 'node:fs';
import os from 'node:os';
import {execSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {StandingSimulation,initRapier} from '../src/labs/standing/simulation.js';
import {compareResults,TOLERANCES} from '../src/labs/standing/compare.js';

// Exactly five canonical runs. No sweep, search, alternate step path or selected successes.
await initRapier();
const git_commit=execSync('git rev-parse HEAD',{encoding:'utf8'}).trim();
const dirty=execSync('git status --porcelain',{encoding:'utf8'}).trim().length>0;
const hash=createHash('sha256');for(const name of fs.readdirSync('src/labs/standing').sort())hash.update(name).update(fs.readFileSync('src/labs/standing/'+name));
for(const name of ['baseline-config.json','config.schema.json','result.schema.json'])hash.update(fs.readFileSync('docs/research/standing-lab/'+name));hash.update(fs.readFileSync('package-lock.json'));
const build_id=git_commit+':'+hash.digest('hex');
const results=[];
for(let run_index=1;run_index<=5;run_index++){
  const s=new StandingSimulation(undefined,{git_commit,dirty,build_id,run_index,platform:{os:`${os.platform()} ${os.release()} ${os.arch()}`,runtime:`Node ${process.version}`,host:os.hostname(),user_agent:null}});
  try{while(!s.terminal)s.step();results.push(await s.result());}finally{s.dispose();}
}
const comparisons=results.slice(1).map((r,i)=>({run_index:i+2,...compareResults(results[0],r)}));
const pass=comparisons.every(c=>c.pass)&&new Set(results.map(r=>r.run_id)).size===5;
const report={schema_version:1,command:'npm run lab:baseline',git_commit,dirty,build_id,platform:results[0].platform,tolerances:TOLERANCES,pass,standing_times:results.map(r=>r.standing_time),steps:results.map(r=>r.simulation_steps),failure_bodies:results.map(r=>r.failure_bodies),comparisons};
const directory='docs/research/standing-lab/baseline';fs.mkdirSync(directory,{recursive:true});
for(const r of results)fs.writeFileSync(`${directory}/run-${r.run_index}.json`,JSON.stringify(r)+'\n');
fs.writeFileSync(`${directory}/comparison.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(!pass)process.exitCode=1;

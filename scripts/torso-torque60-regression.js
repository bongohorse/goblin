// Existing baselines only: no new torso/FullRig-balance experiment.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {initRapier,StandingSimulation} from '../src/labs/standing/simulation.js';
import {motorExperiment} from '../src/labs/standing/motor-config.js';
import {compareResults} from '../src/labs/standing/compare.js';
import {validateTargetRun} from './spherical-target52.js';
import {standingBuild} from './standing-provenance.js';
export async function regressions(){
  await initRapier();const build=standingBuild();assert.equal(build.dirty,false);const results=[];
  for(const cap of [null,20,1]){const s=new StandingSimulation(undefined,build,cap===null?null:motorExperiment(cap));try{
    while(!s.terminal)s.step();const r=await s.result(),name=cap===null?'docs/research/standing-lab/review-39/baseline/run-1.json':`docs/research/standing-lab/review-46/numeric/motor${cap}-run1.json`,reference=JSON.parse(fs.readFileSync(name)),comparison=compareResults(reference,r);assert.ok(comparison.pass);assert.equal(r.simulation_steps,cap===null?70:cap===20?3600:187);assert.deepEqual(r.failure_bodies,cap===null?['handL']:cap===20?[]:['handL','handR']);results.push({kind:cap===null?'passive-v1':'force-v2',cap,steps:r.simulation_steps,termination:r.termination_reason,failure_bodies:r.failure_bodies,comparison});
  }finally{s.dispose();}}
  const base='docs/research/standing-lab/target-study52/',manifest=JSON.parse(fs.readFileSync(base+'sha256.json'));for(const [name,hash] of Object.entries(manifest))assert.equal(createHash('sha256').update(fs.readFileSync(base+name)).digest('hex'),hash);
  let readers=0;for(const name of Object.keys(manifest).filter(n=>/^(fixed-native|moving-frame)-/.test(n))){await validateTargetRun(JSON.parse(fs.readFileSync(base+name)));readers++;}
  return {schema_version:1,report_kind:'torso-torque60-existing-baseline-regression-v1',...build,results,targetstudy_hashes:Object.keys(manifest).length,targetstudy_readers:readers};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const r=await regressions();if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(r)+'\n');console.log(JSON.stringify(r));}

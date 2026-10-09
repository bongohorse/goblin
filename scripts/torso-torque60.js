import fs from 'node:fs';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {initRapier} from '../src/labs/standing/simulation.js';
import {CONFIG,identity} from './torso-torque60-contract.js';
import {verifyFirstSteps} from './torso-torque60-fixtures.js';
import {independentCounterreaction} from './review-spherical-target54.js';
import {validateGateB} from './torso-torque60-reader.js';
import {standingBuild} from './standing-provenance.js';
export async function runGateB(directory){
  await initRapier();const build=standingBuild();assert.equal(build.dirty,false,'Clean harness required');assert.match(process.version,/^v24\./,'Node24 required');
  const report={schema_version:1,report_kind:'internal-torso-torque60-gate-b-v1',run_id:crypto.randomUUID(),config:CONFIG,...identity(CONFIG),provenance:{...build,node:process.version,os:os.platform()+' '+os.release(),arch:os.arch(),cpu:os.cpus()[0]?.model,rapier:'0.21.0',upstream:'b716d375efc0201003f0cd9ef7168eee0b62c177',protocol_sha256:createHash('sha256').update(fs.readFileSync('docs/research/standing-lab/torso-torque60-protocol.md')).digest('hex')},first_steps:verifyFirstSteps(),repetitions:[],tracking:[],historical_native_probe:independentCounterreaction(),status:'incomplete',blocker:null};
  assert.equal(report.historical_native_probe.strict_1e_6_pass,false,'Historical native miss must remain false');
  if(report.first_steps.some(c=>!c.pass)){report.status='blocked';report.blocker='first_step_frame_cap_reaction_or_velocity';}
  else {throw Error('Unexpected first-step pass: stop for protocol review, no tracking authorized by this blocker harness');}
  for(let index=1;index<=5;index++)report.repetitions.push({run_index:index,cases:index===1?report.first_steps:verifyFirstSteps()});
  validateGateB(report);
  fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(directory+'/gate-b.json',JSON.stringify(report)+'\n');
  fs.writeFileSync(directory+'/sha256.json',JSON.stringify({'gate-b.json':createHash('sha256').update(fs.readFileSync(directory+'/gate-b.json')).digest('hex')})+'\n');
  console.log(JSON.stringify({status:report.status,blocker:report.blocker,first_steps:report.first_steps.map(c=>({connected:c.connected,method:c.method,direction:c.direction,missing:c.missing_reaction,pass:c.pass,velocity_error:c.velocity_error,discrete:c.discrete_momentum_residual,physical:c.physical_momentum_residual,bound:c.physical_resolution_bound})),tracking_runs:report.tracking.length,build}));return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){await runGateB(process.argv[2]??'docs/research/standing-lab/torso-torque60');process.exitCode=2;}

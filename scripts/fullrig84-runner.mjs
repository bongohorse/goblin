// Single-use Issue84 CLI. Never called by CI/tests; every allocation attempt durable.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {PLAN,hash} from './fullrig84-model.mjs';
import {StudyWorld,init,version} from './fullrig84-world.mjs';
import {worldDecision,prefixDecision,audit} from './fullrig84-reader.mjs';
const encode=x=>JSON.stringify(x,(_,v)=>typeof v==='number'&&!Number.isFinite(v)?{nonfinite:String(v)}:v)+'\n';
const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
const save=(p,x)=>{const fd=fs.openSync(p,'w');try{fs.writeFileSync(fd,encode(x));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}};
const append=(p,x)=>{const fd=fs.openSync(p,'a');try{fs.writeFileSync(fd,encode(x));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}};

function persistArchive(output,archive){const parts=[];for(const run of archive.runs){const name='world-'+String(run.trial.ordinal).padStart(3,'0')+'.json';const file=path.join(output,name);if(run===archive.runs.at(-1)||!fs.existsSync(file))save(file,run);parts.push({path:name,sha256:hash(fs.readFileSync(file))});}save(path.join(output,'archive.json'),{schema_version:1,transport:'split-world-json-v1',namespace:archive.namespace,config:archive.config,provenance:archive.provenance,run_parts:parts,allocation_attempts:archive.allocation_attempts,public_steps:archive.public_steps,decision:archive.decision,standing_approval:false,engine_precision:archive.engine_precision});}

export async function execute(output,preregPath){
 const pin=JSON.parse(fs.readFileSync(preregPath));assert.equal(pin.issue,84);assert.equal(pin.authorized_plan_head,'adb784c17b8bf03a027c2300f57ee6d17456500c');assert.equal(pin.new_study_worlds_before_preregistration,0);assert.equal(git(['rev-parse','HEAD']),pin.provenance.git_commit);assert.equal(git(['rev-parse','HEAD^{tree}']),pin.provenance.tree);assert.equal(git(['status','--porcelain']),'');assert.equal(process.version,'v24.21.0');assert.deepEqual(pin.ordered_ids,PLAN.order);for(const [p,h] of Object.entries(pin.provenance.source_hashes))assert.equal(hash(fs.readFileSync(p)),h,p);assert.equal(hash(fs.readFileSync('docs/research/standing-lab/fullrig84/config.json')),pin.provenance.config_sha256);assert.equal(pin.provenance.dirty,false);assert.equal(os.hostname(),pin.provenance.host.hostname);assert.equal(os.platform(),pin.provenance.host.platform);
 // Exclusive directory creation is the no-rerun latch, before engine initialization.
 fs.mkdirSync(output,{recursive:false});save(path.join(output,'preregistration.json'),pin);save(path.join(output,'run-start.json'),{time:new Date().toISOString(),attempts:0,steps:0});
 const archive={schema_version:1,config:JSON.parse(fs.readFileSync('docs/research/standing-lab/fullrig84/config.json')),namespace:'fullrig-torso-pelvis-ab-v1:'+pin.provenance.config_sha256,provenance:pin.provenance,runs:[],allocation_attempts:0,public_steps:0,decision:{kind:'pending',ordinal:0,reason:null},standing_approval:false,engine_precision:'indeterminate_not_certified'};
 await init();assert.equal(version(),'0.21.0');assert.equal(execFileSync('git',['-C','vendor/rapier','rev-parse','HEAD'],{encoding:'utf8'}).trim(),pin.provenance.upstream);
 let failure=null;
 for(const trial of PLAN.order){
  assert.ok(archive.allocation_attempts<90);const sim=new StudyWorld(trial),run={trial,uuid:randomUUID(),initial:null,frames:[],decision:null};archive.allocation_attempts++;append(path.join(output,'allocation-ledger.ndjson'),{event:'allocation_attempt',ordinal:trial.ordinal,id:trial.id,uuid:run.uuid,public_steps_before:archive.public_steps});
  let phase='allocate',pre=null,command=null,post=null;
  try{
   sim.allocate();phase='initial_snapshot';run.initial=sim.snapshot(true);append(path.join(output,'raw.ndjson'),{ordinal:trial.ordinal,phase:'initial',data:run.initial});phase='initial_validation';run.decision=worldDecision(run);archive.runs.push(run);
   if(run.decision.kind==='execution_blocker'){archive.decision=prefixDecision(archive.runs);break;}
   for(let step=0;step<trial.max_steps;step++){
    phase='PRE_snapshot';const ot=performance.now();pre=sim.snapshot(step===0);const pre_ms=performance.now()-ot;append(path.join(output,'raw.ndjson'),{ordinal:trial.ordinal,phase:'PRE',data:pre});
    phase='command';const ct=performance.now();command=sim.prepare(pre);const command_ms=performance.now()-ct;append(path.join(output,'raw.ndjson'),{ordinal:trial.ordinal,phase:'command_readback',data:command});
    // Validate actual command before any public step, including declared negatives.
    const {commandCheck,stateStop}=await import('./fullrig84-reader.mjs');assert.equal(stateStop(pre,run.initial),null);const command_classification=commandCheck(pre,command,trial.variant);append(path.join(output,'raw.ndjson'),{ordinal:trial.ordinal,phase:'PRE_positive_validator',classification:command_classification});
    phase='world_step';assert.ok(archive.public_steps<14450);archive.public_steps++;append(path.join(output,'allocation-ledger.ndjson'),{event:'public_step_attempt',ordinal:trial.ordinal,step:sim.steps+1,total:archive.public_steps});const physics_ms=sim.step();append(path.join(output,'allocation-ledger.ndjson'),{event:'public_step_completed',ordinal:trial.ordinal,step:sim.steps,total:archive.public_steps});
    phase='POST_snapshot';const pt=performance.now();post=sim.snapshot(false);const post_ms=performance.now()-pt;append(path.join(output,'raw.ndjson'),{ordinal:trial.ordinal,phase:'POST',data:post});
    phase='POST_clear';const cleared=sim.clear();append(path.join(output,'raw.ndjson'),{ordinal:trial.ordinal,phase:'cleared_after_POST',data:cleared});
    run.frames.push({pre,command,command_classification,post,cleared,cpu:{physics_ms,command_ms,observation_ms:pre_ms+post_ms}});
    phase='prefix_validation';run.decision=worldDecision(run);archive.decision=prefixDecision(archive.runs);
    if(!['pending','bounded_fullrig_candidate_supported'].includes(archive.decision.kind)||run.decision.kind!=='incomplete')break;
   }
   archive.decision=prefixDecision(archive.runs);persistArchive(output,archive);append(path.join(output,'allocation-ledger.ndjson'),{event:'world_terminal',ordinal:trial.ordinal,decision:run.decision,prefix:archive.decision});
   if(!['pending','bounded_fullrig_candidate_supported'].includes(archive.decision.kind))break;
   assert.notEqual(run.decision.kind,'incomplete');
  }catch(error){
   let partial_setup=null;try{if(sim.world)partial_setup=sim.snapshot(sim.steps===0);}catch(snapshotError){partial_setup={snapshot_error:String(snapshotError.message),bodies:[...sim.bodies.values()].map(({spec,body})=>{const out={id:spec.id};for(const k of ['translation','rotation','linvel','angvel','mass','principalInertia'])try{out[k]=body[k]();}catch(e){out[k]={getter_error:String(e.message)};}return out;})};}append(path.join(output,'raw.ndjson'),{ordinal:trial.ordinal,phase:'failure_partial_state',data:partial_setup});
   failure={schema_version:1,kind:'fullrig84_partial_failure',trial,uuid:run.uuid,phase,message:String(error.stack??error),allocation_attempts:archive.allocation_attempts,public_steps:archive.public_steps,world_public_steps:sim.steps,initial:run.initial,partial_setup,pre,command,post,completed_frames:run.frames,decision:{kind:'execution_blocker',reason:phase+':'+String(error.message),ordinal:trial.ordinal,id:trial.id},claim:'no_tuning_handoff; no behavioral pass'};save(path.join(output,'failure.json'),failure);append(path.join(output,'allocation-ledger.ndjson'),{event:'failure',ordinal:trial.ordinal,phase,message:String(error.message),public_steps:archive.public_steps});break;
  }finally{sim.dispose();}
 }
 if(!failure){const reader=audit(archive,pin.provenance);persistArchive(output,archive);save(path.join(output,'reader.json'),reader);}save(path.join(output,'decision.json'),failure?failure.decision:archive.decision);
 const files=fs.readdirSync(output).filter(n=>n!=='sha256.json').sort();save(path.join(output,'sha256.json'),Object.fromEntries(files.map(n=>[n,hash(fs.readFileSync(path.join(output,n)))])));
 return {attempts:archive.allocation_attempts,steps:archive.public_steps,decision:failure?failure.decision:archive.decision};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){if(process.argv.length!==5||process.argv[2]!=='--execute')throw Error('Use --execute NEW_OUTPUT_DIRECTORY PUBLISHED_PREREGISTRATION_JSON');console.log(JSON.stringify(await execute(path.resolve(process.argv[3]),path.resolve(process.argv[4]))));}

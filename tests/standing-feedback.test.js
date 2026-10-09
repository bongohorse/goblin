import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FeedbackSession,identityFor,encodeReport,REPORT_LIMIT} from '../src/labs/standing/feedback.js';
const saved=JSON.parse(fs.readFileSync(new URL('../docs/research/standing-lab/baseline/run-1.json',import.meta.url)));
const clone=value=>structuredClone(value);
const fields={body_id:'head',category:'head',note:'Head tips forward'};
function fixture(){
  const result=clone(saved),sim={config:clone(result.config),experiment:null,runId:result.run_id,generation:1,steps:result.simulation_steps,time:result.observed_time,terminal:null,invalid:null,
    snapshot:()=>clone(result.checkpoints.at(-1)),result:()=>Promise.resolve(clone(result))};
  const identity=identityFor(sim,result,'passive',result.rapier_js_version),session=new FeedbackSession();
  session.mark(sim,identity,()=>{sim.paused=true;});
  return {result,sim,identity,session};
}
test('stored result remains unchanged; identity, step and human observation are consistent',async()=>{
  const {result,sim,identity,session}=fixture();
  const report=(await session.report(sim,identity,{viewport:{width:800,height:600,dpr:1}},fields)).report;
  assert.deepEqual(report.research_result,result);assert.deepEqual(report.identity,identity);
  assert.equal(report.observation.step,result.simulation_steps);assert.equal(report.observation.kind,'human_observation_hypothesis');
  assert.equal(report.identity.ci,'unknown');assert.equal(report.identity.measurement.status,'limited');
  assert.equal(sim.paused,true);assert.deepEqual(report.data_errors,[]);
});
test('invalid Body-ID and oversized note block export without truncating',async()=>{
  const {sim,identity,session}=fixture();
  await assert.rejects(session.report(sim,identity,{}, {...fields,body_id:'missing'}),/body ID/);
  await assert.rejects(session.report(sim,identity,{}, {...fields,note:'x'.repeat(2001)}),/2000/);
  const accepted=await session.report(sim,identity,{}, {...fields,note:'x'.repeat(2000)});
  assert.equal(accepted.report.observation.note.length,2000);
});
test('non-finite or malformed snapshot is omitted with explicit reason; finite context survives',async()=>{
  for(const bad of [snapshot=>{snapshot.bodies[0].position.x=NaN;},snapshot=>{snapshot.bodies[0].id='missing';},snapshot=>{snapshot.bodies[0].rotation.w='bad';}]){
    const {sim,identity,session}=fixture();const good=sim.snapshot();bad(good);sim.snapshot=()=>good;
    session.mark(sim,identity,()=>{});
    const out=await session.report(sim,identity,{},fields);
    assert.equal(out.diagnostic,true);assert.equal(out.report.observation.snapshot,null);
    assert.ok(out.report.data_errors.some(e=>e.part==='marker_snapshot'));
    assert.ok(out.report.research_result);
  }
});
test('snapshot exception, unavailable result, invalid result and hashing failure produce small diagnostic reports',async()=>{
  for(const fault of ['snapshot','missing','invalid','hash']){
    const {sim,identity,session}=fixture();
    if(fault==='snapshot'){sim.snapshot=()=>{throw Error('Snapshot unavailable');};session.mark(sim,identity,()=>{});}
    if(fault==='missing')sim.result=()=>Promise.resolve(null);
    if(fault==='invalid'){const result=clone(saved);result.checkpoints[0].bodies[0].position.x=Infinity;sim.result=()=>Promise.resolve(result);}
    const out=await session.report(sim,identity,{},fields,fault==='hash'?async()=>{throw Error('Hash unavailable');}:undefined);
    assert.equal(out.diagnostic,true);assert.ok(out.report.config);assert.equal(out.report.observation.note,fields.note);
    if(fault!=='snapshot')assert.equal(out.report.research_result,null);
    assert.ok(out.bytes<REPORT_LIMIT);assert.doesNotThrow(()=>JSON.parse(out.json));
  }
});
test('corrupt finite result and mismatched result identity are excluded',async()=>{
  for(const change of [r=>{r.git_commit='f'.repeat(40);},r=>{r.run_id=crypto.randomUUID();},r=>{r.telemetry.com.x+=1; r.config_id='config:sha256:'+'0'.repeat(64);} ]){
    const {sim,identity,session}=fixture();const result=clone(saved);change(result);sim.result=()=>Promise.resolve(result);
    const out=await session.report(sim,identity,{},fields);assert.equal(out.report.research_result,null);assert.equal(out.diagnostic,true);
  }
});
test('marker replacement and clear prevent a stale marker from following a run change',async()=>{
  const {sim,identity,session}=fixture();
  sim.steps=0;sim.time=0;sim.snapshot=()=>clone(saved.checkpoints[0]);
  assert.equal(session.mark(sim,identity,()=>{}).step,0);
  sim.runId=crypto.randomUUID();sim.generation++;
  await assert.rejects(session.report(sim,identityFor(sim,saved,'passive',saved.rapier_js_version),{},fields),/another run/);
  session.clear();assert.equal(session.inspect(),null);
  await assert.rejects(session.report(sim,identity,{},fields),/Mark the current step/);
});
test('reset/modus change during async export cannot mix identity, fields, config or snapshot',async()=>{
  for(const mode of ['passive','motor20']){
    const {result,sim,identity,session}=fixture();let resolve;
    sim.result=()=>new Promise(r=>{resolve=r;});
    const browser={viewport:{width:800,height:600,dpr:1}},input=clone(fields);
    const pending=session.report(sim,identity,browser,input);
    sim.runId=crypto.randomUUID();sim.generation++;sim.steps=0;sim.time=0;sim.config.rig_id='new-run';
    input.note='new note';browser.viewport.width=1;session.clear();
    const nextIdentity=identityFor(sim,saved,mode,saved.rapier_js_version);
    session.mark(sim,nextIdentity,()=>{});
    resolve(result);const out=(await pending).report;
    assert.deepEqual(out.research_result,result);assert.deepEqual(out.identity,identity);assert.equal(out.observation.note,fields.note);
    assert.equal(out.browser.viewport.width,800);assert.equal(out.config.rig_id,saved.rig_id);
    assert.equal(session.inspect().identity.run_id,sim.runId);
  }
});
test('10 MiB overflow is explicit diagnostic omission, not silent truncation; UTF-8 byte limit',()=>{
  const report={identity:{run_id:'old'},observation:{note:'é'.repeat(2000),snapshot:{body:'data'}},config:{},research_result:{payload:'x'.repeat(REPORT_LIMIT)},data_errors:[]};
  const out=encodeReport(report);assert.equal(out.diagnostic,true);assert.equal(out.report.research_result,null);
  assert.equal(out.report.observation.snapshot,null);assert.equal(out.report.observation.note,report.observation.note);
  assert.ok(out.report.data_errors.some(e=>e.part==='size_limit'));assert.ok(out.bytes<REPORT_LIMIT);
  assert.equal(out.bytes,new TextEncoder().encode(out.json).byteLength);
  assert.throws(()=>encodeReport({...report,identity:{bad:Infinity}}),/Non-finite/);
});

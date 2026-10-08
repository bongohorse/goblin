import {validateResultProvenance,canonical} from './config.js';

export const NOTE_LIMIT=2000;
export const REPORT_LIMIT=10*1024*1024;
export const CATEGORIES=['foot','head','joint','balance','other'];
export const MEASUREMENT=Object.freeze({
  id:'legacy-cached-contact-distance',
  status:'limited',
  limits:'Contact/load data use cached contactDist filtering, not validated current contact/support evidence. No full Standing acceptance. Native motor effort, saturation and CoP unavailable. No drift stop in this build.'
});
const copy=value=>structuredClone(value);
export function assertFinite(value){
  if(typeof value==='number'&&!Number.isFinite(value))throw Error('Non-finite numeric data');
  if(value===undefined||typeof value==='function'||typeof value==='symbol'||typeof value==='bigint')throw Error('Non-JSON data');
  if(value&&typeof value==='object')for(const item of Object.values(value))assertFinite(item);
  return value;
}
function checkedCopy(value){assertFinite(value);return copy(value);}
function errorMessage(error){const message=String(error?.message??error);return message.length<=2000?message:'Error message exceeds 2000 characters; omitted.';}
export function identityFor(sim,build,mode,rapierVersion='unknown'){
  return {
    git_commit:build.git_commit??'unknown',dirty:build.dirty??'unknown',build_id:build.build_id??'unknown',
    mode,run_id:sim.runId,generation:sim.generation,rig_id:sim.config.rig_id,
    controller_id:sim.experiment?.controller_id??'none',
    result_schema_version:sim.experiment?.schema_version??1,
    rapier_js_version:rapierVersion,pr:'unknown',pr_head:'unknown',pr_base:'unknown',ci:'unknown',
    measurement:copy(MEASUREMENT)
  };
}
function checkObservation(fields,bodyIds){
  if(typeof fields.note!=='string'||fields.note.length>NOTE_LIMIT)throw Error('Note exceeds 2000 characters or is not text. No export; shorten it.');
  if(!CATEGORIES.includes(fields.category))throw Error('Unknown observation category');
  if(fields.body_id!==null&&!bodyIds.includes(fields.body_id))throw Error('Unknown body ID');
}
function checkSnapshot(snapshot,bodyIds,step){
  assertFinite(snapshot);
  if(snapshot.step!==step||snapshot.bodies.length!==bodyIds.length||
    new Set(snapshot.bodies.map(b=>b.id)).size!==bodyIds.length||
    snapshot.bodies.some(b=>!bodyIds.includes(b.id)))throw Error('Snapshot step/body IDs do not match');
  for(const b of snapshot.bodies)for(const key of ['position','rotation','linear_velocity','angular_velocity']){
    const expected=key==='rotation'?['x','y','z','w']:['x','y','z'];
    if(!b[key]||Object.keys(b[key]).sort().join()!==expected.sort().join()||
      Object.values(b[key]).some(v=>typeof v!=='number'))throw Error('Invalid body state');
  }
}
export class FeedbackSession{
  constructor(){this.clear();}
  clear(){this.marker=null;}
  mark(sim,identity,pause){
    pause();
    const marker={identity:checkedCopy(identity),step:sim.steps,time_s:sim.time,snapshot:null,snapshot_error:null};
    assertFinite(marker);
    try{const snapshot=sim.snapshot();checkSnapshot(snapshot,sim.config.bodies.map(b=>b.id),marker.step);marker.snapshot=copy(snapshot);}
    catch(error){marker.snapshot_error=errorMessage(error);}
    this.marker=marker;return copy(marker);
  }
  inspect(){return copy(this.marker);}
  // Everything including result() starts synchronously before the first await.
  async report(sim,identity,browser,fields,validate=validateResultProvenance){
    if(!this.marker)throw Error('Mark the current step before exporting.');
    if(this.marker.identity.run_id!==sim.runId||canonical(this.marker.identity)!==canonical(identity))throw Error('Marker belongs to another run/build. Mark again.');
    const bodyIds=sim.config.bodies.map(b=>b.id);checkObservation(fields,bodyIds);
    const report={
      feedback_schema_version:1,context:'standing_lab',identity:checkedCopy(identity),
      exported_step:sim.steps,exported_time_s:sim.time,
      run_status:checkedCopy({termination:sim.terminal,invalid:sim.invalid}),
      observation:{kind:'human_observation_hypothesis',...checkedCopy(fields),...copy(this.marker)},
      browser:null,config:null,research_result:null,data_errors:[],
      meaning:'Observation and retry context, not automatic diagnosis, full solver state, replay or exact reproduction. A negative run is distinct from a data error and from full Standing acceptance.',
      retry:'Use the identified build and mode; fresh reset, then single-step to the marked step. Cross-build/platform equality is not guaranteed.'
    };
    if(this.marker.snapshot_error)report.data_errors.push({part:'marker_snapshot',reason:this.marker.snapshot_error});
    try{report.browser=checkedCopy(browser);}catch(error){report.data_errors.push({part:'browser_context',reason:errorMessage(error)});}
    try{report.config=checkedCopy(sim.experiment??sim.config);}catch(error){report.data_errors.push({part:'config',reason:errorMessage(error)});}
    let pending;
    try{pending=sim.result();}catch(error){pending=Promise.reject(error);}
    try{
      const result=checkedCopy(await pending);await validate(result);
      if(result.run_id!==report.identity.run_id||result.git_commit!==report.identity.git_commit||
        result.dirty!==report.identity.dirty||result.build_id!==report.identity.build_id||
        result.rig_id!==report.identity.rig_id||result.controller_id!==report.identity.controller_id||
        result.schema_version!==report.identity.result_schema_version||
        result.rapier_js_version!==report.identity.rapier_js_version||
        result.simulation_steps!==report.exported_step||result.observed_time!==report.exported_time_s||
        (report.config&&canonical(result.config)!==canonical(report.config)))throw Error('Research result differs from captured run/build/config/step');
      report.research_result=result;
    }catch(error){report.data_errors.push({part:'research_result',reason:errorMessage(error)});}
    return encodeReport(report);
  }
}
export function encodeReport(report){
  assertFinite(report);
  let json=JSON.stringify(report,null,2),bytes=new TextEncoder().encode(json).byteLength;
  if(bytes>REPORT_LIMIT){
    // Explicitly omitted large payloads; never truncate data or relabel invalid data.
    const fallback=copy(report);
    fallback.research_result=null;fallback.config=null;
    if(fallback.observation)fallback.observation.snapshot=null;
    fallback.data_errors.push({part:'size_limit',reason:'Report exceeds 10 MiB. Research result, config and marker snapshot omitted; small diagnostic report only.'});
    json=JSON.stringify(fallback,null,2);bytes=new TextEncoder().encode(json).byteLength;
    if(bytes>REPORT_LIMIT)throw Error('Diagnostic report also exceeds 10 MiB. No export.');
    return {report:fallback,json,bytes,diagnostic:true};
  }
  return {report,json,bytes,diagnostic:report.data_errors.length>0};
}

import {assertFinite,encodeReport,NOTE_LIMIT,CATEGORIES} from '../labs/standing/feedback.js';

// Observation only: no simulation imports, replay, trace or research result.
export class PlaygroundFeedback {
  constructor(){this.clear();}
  clear(){this.marker=null;}
  mark(identity,step,snapshot,browser,pause=()=>null){
    const marker={identity:structuredClone(identity),step,time_s:step/60,snapshot:null,browser:null,data_errors:[]};
    // Capture before any active-grab safety cancellation; pause reports its kind.
    for(const [part,read] of [['snapshot',snapshot],['browser',browser],['pause',pause]]){
      try{const data=read();assertFinite(data);marker[part]=structuredClone(data);}
      catch(error){marker.data_errors.push({part,reason:String(error.message).slice(0,2000)});}
    }
    this.marker=marker;return structuredClone(marker);
  }
  report(identity,{body_id=null,category='other',note=''},bodyIds){
    if(!this.marker)throw Error('Mark the current step first.');
    if(JSON.stringify(identity)!==JSON.stringify(this.marker.identity))throw Error('Marker belongs to another run. Mark again.');
    if(typeof note!=='string'||note.length>NOTE_LIMIT)throw Error('Note must contain no more than 2000 characters. Shorten it.');
    if(!CATEGORIES.includes(category))throw Error('Select a valid category.');
    if(body_id!==null&&!bodyIds.includes(body_id))throw Error('Select an existing body part.');
    return encodeReport({feedback_schema_version:1,context:'goblin_playground',identity:structuredClone(identity),
      observation:{...structuredClone(this.marker),body_id,category,note},data_errors:structuredClone(this.marker.data_errors),
      meaning:'Human observation with a state snapshot. No complete input history, replay or reproduction guarantee. No full gameplay or Standing acceptance.'});
  }
}

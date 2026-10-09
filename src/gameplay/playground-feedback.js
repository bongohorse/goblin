import {assertFinite,encodeReport,NOTE_LIMIT,CATEGORIES} from '../labs/standing/feedback.js';

// Observation only: no simulation imports, replay, trace or research result.
export class PlaygroundFeedback {
  constructor(){this.clear();}
  clear(){this.marker=null;}
  mark(identity,step,snapshot,browser){
    const marker={identity:structuredClone(identity),step,time_s:step/60,snapshot:null,browser:null,data_errors:[]};
    for(const [part,read] of [['snapshot',snapshot],['browser',browser]]){
      try{const data=read();assertFinite(data);marker[part]=structuredClone(data);}
      catch(error){marker.data_errors.push({part,reason:String(error.message).slice(0,2000)});}
    }
    this.marker=marker;return structuredClone(marker);
  }
  report(identity,{body_id=null,category='other',note=''},bodyIds){
    if(!this.marker)throw Error('Bitte zuerst die aktuelle Stelle markieren.');
    if(JSON.stringify(identity)!==JSON.stringify(this.marker.identity))throw Error('Die Markierung gehört zu einem anderen Run. Bitte neu markieren.');
    if(typeof note!=='string'||note.length>NOTE_LIMIT)throw Error('Die Notiz darf höchstens 2000 Zeichen enthalten. Bitte kürzen.');
    if(!CATEGORIES.includes(category))throw Error('Bitte eine gültige Kategorie wählen.');
    if(body_id!==null&&!bodyIds.includes(body_id))throw Error('Bitte einen vorhandenen Körperteil wählen.');
    return encodeReport({feedback_schema_version:1,context:'goblin_playground',identity:structuredClone(identity),
      observation:{...structuredClone(this.marker),body_id,category,note},data_errors:structuredClone(this.marker.data_errors),
      meaning:'Menschliche Beobachtung mit einem Zustandssnapshot. Keine vollständige Eingabeaufzeichnung, Replay- oder Reproduktionsgarantie. Keine vollständige Gameplay- oder Standing-Abnahme.'});
  }
}

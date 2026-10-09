import {comparePair,POINT_IDS} from '../src/gameplay/upright-comparison.js';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const norm=v=>Math.hypot(v.x,v.y,v.z);
export function analyzeReturn(records){
  const reference=records.find(r=>r.id==='reference');
  if(!reference)return {valid:false,issues:['missing reference']};
  const pairs=[];
  for(const id of ['legacy-small','R1-small']){
    const input=records.find(r=>r.id===id),issues=[];
    if(!input){pairs.push({id,valid:false,issues:['missing input']});continue;}
    if(reference.trace.length!==721||input.trace.length!==721)issues.push('incomplete 0-720');
    if(reference.events.some(e=>e.kind==='impulse-observation')||reference.trace.some(t=>t.observation.controller.targetStart!==null||t.targetAssist.phase!=='NEUTRAL'))issues.push('reference target triggered');
    const identities=[reference.identity,input.identity].map(({returnProfile,...rest})=>rest);
    if(!equal(identities[0],identities[1]))issues.push('different common identity');
    if(!equal(reference.trace.slice(0,121),input.trace.slice(0,121)))issues.push('different pre-input state');
    if(issues.length){pairs.push({id,valid:false,issues});continue;}
    // Explicit, justified reuse: only inert returnProfile metadata differs in R.
    // Raw identities/traces are never edited. The unchanged V2 reader receives its fixed 6s window.
    const pairId=id;
    const v2=comparePair({...reference,role:'reference',pairId,identity:input.identity,trace:reference.trace.slice(0,361)},
      {...input,role:'input',pairId,trace:input.trace.slice(0,361)});
    const windows={};
    for(const [name,start,end] of [['returnHalfSecond',211,240],['after',241,360],['sixToEight',361,480],['eightToTen',481,600],['tenToTwelve',601,720]]){
      windows[name]=Object.fromEntries(POINT_IDS.map(point=>{
        const rows=input.trace.slice(start,end+1).map((t,i)=>{
          const p=t.observation.points[point],r=reference.trace[start+i].observation.points[point];
          return {d:p.position.x-r.position.x,c:r.position.z-p.position.z,y:p.position.y-r.position.y,
            speed:norm({x:p.velocity.x-r.velocity.x,y:p.velocity.y-r.velocity.y,z:p.velocity.z-r.velocity.z}),
            angularSpeed:norm({x:p.angularVelocity.x-r.angularVelocity.x,y:p.angularVelocity.y-r.angularVelocity.y,z:p.angularVelocity.z-r.angularVelocity.z})};
        });
        return [point,{velocityRms:Math.sqrt(rows.reduce((s,r)=>s+r.speed**2,0)/rows.length),angularRms:Math.sqrt(rows.reduce((s,r)=>s+r.angularSpeed**2,0)/rows.length),
          range:Object.fromEntries(['d','c','y'].map(k=>[k,{min:Math.min(...rows.map(r=>r[k])),max:Math.max(...rows.map(r=>r[k]))}]))}];
      }));
    }
    pairs.push({id,valid:v2.Q.valid,issues:v2.Q.issues,referenceReuse:'Explicit shared inert T1 reference: returnProfile never triggered; identical common identity and pre-input trace.',v2,windows,
      throughoutSafe:input.trace.every(t=>!t.invalid&&t.assisted&&t.maxAnchorError<=.15&&!t.metrics.nonFootFloor.length),
      endDisplacement:Object.fromEntries(POINT_IDS.map(p=>[p,Object.fromEntries(['x','y','z'].map(k=>[k,input.trace[720].observation.points[p].position[k]-reference.trace[720].observation.points[p].position[k]]))]))});
  }
  const old=pairs.find(p=>p.id==='legacy-small'),candidate=pairs.find(p=>p.id==='R1-small');
  const comparison=old?.valid&&candidate?.valid?{
    lowerReturnRms:candidate.windows.returnHalfSecond.torso.velocityRms<old.windows.returnHalfSecond.torso.velocityRms,
    lowerAfterRms:candidate.windows.after.torso.velocityRms<old.windows.after.torso.velocityRms,
    noLateRmsGrowth:candidate.windows.tenToTwelve.torso.velocityRms<=candidate.windows.after.torso.velocityRms,
    noLateAmplitudeGrowth:['torso','head'].every(p=>candidate.windows.tenToTwelve[p].range.d.max-candidate.windows.tenToTwelve[p].range.d.min<=candidate.windows.after[p].range.d.max-candidate.windows.after[p].range.d.min)
  }:null;
  return {valid:pairs.every(p=>p.valid),pairs,comparison,H:'unbewertet; no numerical gameplay pass'};
}

import {comparePair,POINT_IDS} from './upright-comparison.js';
const $=id=>document.getElementById(id);
const dataset=new URLSearchParams(location.search).get('evidence')==='t1'?'t1':'v2';
if(dataset==='t1')document.querySelector('h1+p').textContent='Stored B/T1 comparison · unchanged candidate · no live physics · not full gameplay acceptance.';
let data,result,videoGeneration=0;
const clipUrls=new Map();
addEventListener('pagehide',()=>{for(const url of clipUrls.values())URL.revokeObjectURL(url);});
async function decode(buffer,gzip){return JSON.parse(await (gzip?new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(buffer)));}
function showRow(){
  if(!result?.Q.valid)return;
  const row=result.Q.rows[Number($('step').value)];
  $('time').textContent='Step '+row.step+' · t='+row.time.toFixed(3)+' s · τ='+row.tau.toFixed(3)+' s';
  $('points').replaceChildren(...POINT_IDS.map(id=>{
    const tr=document.createElement('tr');
    for(const value of [id,...['d','c','y'].map(k=>(row.points[id].displacement[k]*1000).toFixed(3))]){
      const td=document.createElement('td');td.textContent=value;tr.append(td);
    }return tr;
  }));
  const degrees=v=>v*180/Math.PI;
  $('angles').textContent=['torso','pelvis'].map(id=>id+' Δβ='+degrees(row.tilt[id].beta).toFixed(4)+'° · Δγ='+degrees(row.tilt[id].gamma).toFixed(4)+'° · Up-vector difference='+degrees(row.tilt[id].upDifference).toFixed(4)+'°').join('\n');
  $('windows').textContent=JSON.stringify({windows:result.Q.windows,relativeAtStep:row.relative},null,2);
}
function showPair(){
  const generation=++videoGeneration;
  const id=$('pair').value,R=data.records.find(r=>r.pairId===id&&r.role==='reference'),P=data.records.find(r=>r.pairId===id&&r.role==='input');
  result=comparePair(R,P);
  $('identity').textContent='V2 · Pair '+id+' · Build '+(P?.identity?.build?.revision||'unknown')+' · '+(P?.identity?.environment?.userAgent||'');
  $('status').textContent=result.Q.valid?'Q: valid same-time pair; no automatic gameplay pass':'Q: unavailable · '+result.Q.issues.join(', ');
  $('legacy').textContent=result.Q.valid?'Legacy V1: '+result.Q.legacyV1.additionalTiltDeg.toFixed(5)+'° additional · '+(result.Q.legacyV1.pass?'PASS':'FAIL')+' against unchanged 2°':'Legacy unavailable';
  $('human').textContent=JSON.stringify(data.pairs?.find(p=>p.pairId===id)?.H||result.H);
  $('safety').textContent=JSON.stringify(result.S,null,2);
  for(const [role,record] of [['reference',R],['input',P]]){
    const video=$(role);video.pause();
    if(clipUrls.has(role)){URL.revokeObjectURL(clipUrls.get(role));clipUrls.delete(role);}
    video.removeAttribute('src');
    if(record&&Number.isInteger(record.number)&&record.number>=1&&record.number<=4){
      // The local preview has no byte-range endpoint. Blob playback supports seeking without changing the server.
      fetch('./'+dataset+'-media/sequence-'+record.number+'.webm').then(async response=>{
        if(!response.ok)throw Error('Clip '+response.status);const blob=await response.blob();
        if(generation!==videoGeneration)return;const url=URL.createObjectURL(blob);clipUrls.set(role,url);video.src=url;
      }).catch(error=>{if(generation===videoGeneration)$('status').textContent='Clip data: '+error.message;});
    }
  }
  $('points').replaceChildren();$('angles').textContent='';$('windows').textContent='';showRow();
}
function load(value){
  if(!Array.isArray(value.records))throw Error('Missing V2 records');
  data=value;const ids=[...new Set(data.records.filter(r=>r.pairId).map(r=>r.pairId))];$('pair').replaceChildren();
  for(const id of ids){const option=document.createElement('option');option.value=id;option.textContent=id;$('pair').append(option);}
  showPair();window.uprightComparison=()=>({version:'V2',pairId:result.pairId,valid:result.Q.valid,legacy:result.Q.legacyV1,safety:result.S,simulation:false});
}
$('pair').onchange=showPair;$('step').oninput=showRow;
$('play').onclick=async()=>{try{await Promise.all(['reference','input'].map(id=>{$(id).playbackRate=1;return $(id).play();}));}catch(error){$('status').textContent='Clip playback: '+error.message;}};
$('pause').onclick=()=>['reference','input'].forEach(id=>$(id).pause());
$('file').onchange=async()=>{try{const file=$('file').files[0];if(file)load(await decode(await file.arrayBuffer(),file.name.endsWith('.gz')));}catch(error){$('status').textContent=error.message;}};
try{const response=await fetch('../../'+(dataset==='t1'?'target-finish-evidence.json.gz':'v2-evidence.json.gz'));if(!response.ok)throw Error('No V2 raw evidence in this build. Select a result file.');load(await decode(await response.arrayBuffer(),true));}
catch(error){$('status').textContent=error.message;}

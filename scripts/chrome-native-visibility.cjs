const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),assert=require('node:assert/strict');
const {validateVisibility,validateResume,assess}=require('./chrome-visibility-oracle.cjs');
const os=require('node:os');const identity=require('./chrome-portable.cjs').portableChromeIdentity();const binary=identity.executablePath;
const profile=fs.mkdtempSync(path.join(process.env.GOBLIN_BROWSER_PROFILE_ROOT||os.tmpdir(),'goblin-chrome-visibility-'));
const args=['--user-data-dir='+profile,'--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--no-first-run','--no-default-browser-check','about:blank'];
const child=spawn(binary,args,{stdio:'ignore',windowsHide:false});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let ws,id=0;const pending=new Map();
async function rpc(method,params={},sessionId){return new Promise((resolve,reject)=>{const key=++id,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),10000);pending.set(key,{resolve,reject,timer});ws.send(JSON.stringify({id:key,method,params,sessionId}));});}
async function main(){try{
 let active;for(let i=0;i<100;i++){try{active=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').trim().split('\n');break;}catch{await sleep(100);}}assert.ok(active,'Chrome did not expose its local debug endpoint');
 ws=new WebSocket('ws://127.0.0.1:'+active[0]+active[1]);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 ws.onmessage=e=>{const r=JSON.parse(e.data);if(pending.has(r.id)){const p=pending.get(r.id);clearTimeout(p.timer);pending.delete(r.id);r.error?p.reject(Error(JSON.stringify(r.error))):p.resolve(r.result);}};
 const version=await rpc('Browser.getVersion');assert.equal(version.product,'Chrome/'+identity.version);
 const create=async()=>{const {targetId}=await rpc('Target.createTarget',{url:'about:blank'});const {sessionId}=await rpc('Target.attachToTarget',{targetId,flatten:true});await rpc('Runtime.enable',{},sessionId);await rpc('Page.enable',{},sessionId);return {targetId,sessionId};};
 const lab=await create(),other=await create();const evaluate=async expression=>{const r=await rpc('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},lab.sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const sample=()=>evaluate('({hidden:document.hidden,state:document.visibilityState,focus:document.hasFocus(),now:performance.now(),d:window.standingLab?.diagnostics()})');
 async function observe(isLab){await rpc('Target.activateTarget',{targetId:lab.targetId});await evaluate("window.__events=[];document.addEventListener('visibilitychange',e=>__events.push({trusted:e.isTrusted,hidden:document.hidden,state:document.visibilityState,focus:document.hasFocus(),now:performance.now(),d:window.standingLab?.diagnostics()}))");
  if(isLab){await evaluate("document.querySelector('#mode').value='motor20';document.querySelector('#mode').dispatchEvent(new Event('change'));document.querySelector('#resume').click()");for(let i=0;i<100;i++){if((await sample()).d.step>=10)break;await sleep(20);}}
  const before=await sample();await evaluate('window.__background=[];window.__sampleTimer=setInterval(()=>__background.push({hidden:document.hidden,state:document.visibilityState,focus:document.hasFocus(),now:performance.now(),d:window.standingLab?.diagnostics()}),100)');await rpc('Target.detachFromTarget',{sessionId:lab.sessionId});await rpc('Target.activateTarget',{targetId:other.targetId});await sleep(5500);await rpc('Target.activateTarget',{targetId:lab.targetId});await sleep(100);lab.sessionId=(await rpc('Target.attachToTarget',{targetId:lab.targetId,flatten:true})).sessionId;const background=await evaluate('clearInterval(__sampleTimer);__background');const hidden=background.filter(x=>x.hidden);const returned=await sample();await sleep(500);const still=await sample();const events=await evaluate('__events');return {before,hidden,returned,still,events,background};}
 const standalone=await observe(false);
 await rpc('Page.navigate',{url:'https://bongohorse.github.io/goblin/labs/standing/'},lab.sessionId);for(let i=0;i<200;i++){if(await evaluate('!!window.standingLab'))break;await sleep(50);}assert.equal(await evaluate('!!window.standingLab'),true);
 const live=await observe(true);assert.equal(live.before.hidden,false);assert.equal(live.before.d.paused,false);assert.ok(live.before.d.step>=10);assert.equal(live.before.d.termination,null);
 // Preserve live.still as the automatic-return evidence. Explicitly pause before
 // this separate Resume check even if native visibility was never reached.
 const resume=await evaluate(`new Promise(resolve=>{
  const sample=()=>({hidden:document.hidden,d:standingLab.diagnostics()});
  document.querySelector('#pause').click();const before=sample();
  document.querySelector('#resume').click();const active=sample(),start=performance.now();
  const rows=[{wall_ms:0,...active}];
  function tick(){
   rows.push({wall_ms:performance.now()-start,...sample()});
   if(rows.at(-1).wall_ms>=1000){
    document.querySelector('#pause').click();
    resolve({before,active,rows,after:sample(),delta:rows.at(-1).d.step-rows[0].d.step,
     max_per_frame:Math.max(...rows.slice(1).map((r,i)=>r.d.step-rows[i].d.step))});
   }else requestAnimationFrame(tick);
  }requestAnimationFrame(tick);
 })`);
 const provenance=await evaluate('standingLab.result().then(r=>({git_commit:r.git_commit,dirty:r.dirty,build_id:r.build_id}))');
 const checks={visibility:assess(()=>validateVisibility({standalone,live})),resume:assess(()=>validateResume(resume,live.before.d.run_id))};
 const report={method:'Raw CDP with debugger detached during background interval; trusted in-page observer, no synthetic visibility or emulation',identity,binary,pid:child.pid,profile,args,version,standalone,live,resume,provenance,checks};
 const output=process.env.GOBLIN_VISIBILITY_OUTPUT||path.join(os.tmpdir(),'goblin-chrome-visibility-'+Date.now()+'.json');fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({output,version:version.product,pid:child.pid,standalone_events:standalone.events,lab_events:live.events,resume:{delta:resume.delta,max_per_frame:resume.max_per_frame,wall_ms:resume.rows.at(-1).wall_ms},provenance}));
 console.log(JSON.stringify({checks}));
 assert.equal(checks.resume.status,'pass','Resume oracle: '+checks.resume.reason);
 assert.equal(checks.visibility.status,'pass','Native visibility prerequisite/contract: '+checks.visibility.reason);
 }finally{if(ws?.readyState===1){await rpc('Browser.close').catch(()=>{});ws.close();}else child.kill();}}
main().catch(e=>{console.error(e);process.exitCode=1;});

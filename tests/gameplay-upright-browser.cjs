// Explicitly approved eight-sequence observation, not an automatic npm-test campaign.
// Usage: node tests/gameplay-upright-browser.cjs --run-approved-eight --executable <native Chrome.exe> --out <new evidence directory>
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const flag=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const url='http://127.0.0.1:4174/goblin/gameplay/upright/';
const yielding=process.argv.includes('--run-approved-yield');
const targetTrial=process.argv.includes('--run-approved-target');
const v2=process.argv.includes('--run-approved-v2');
const p95=a=>a.length?a.slice().sort((a,b)=>a-b)[Math.ceil(a.length*.95)-1]:null;

async function runV2({context,identity,out,errors,warnings,badResponses}){
  const {comparePair}=await import('../src/gameplay/upright-comparison.js');
  const records=[],pairs=[];
  const save=async()=>fs.writeFile(path.join(out,'results.json'),JSON.stringify({version:'V2',identity,url:url+'?yield=B&observe=v2',records,pairs,errors,warnings,badResponses}));
  await fs.writeFile(path.join(out,'budget.json'),JSON.stringify({started:0,completed:0,maxSequences:4,secondsPerSequence:6,plan:['R1','P1','R2','P2']}));
  for(let n=1;n<=4;n++){
    const role=n%2?'reference':'input',pairId=String(Math.ceil(n/2));
    console.log('V2 '+n+'/4 '+role+' pair '+pairId);
    const page=await context.newPage(),video=page.video();
    page.on('pageerror',e=>errors.push({number:n,message:e.message}));
    page.on('console',m=>{if(m.type()==='error')errors.push({number:n,message:m.text()});if(m.type()==='warning')warnings.push({number:n,message:m.text()});});
    page.on('response',r=>{if(r.status()>=400)badResponses.push({number:n,url:r.url(),status:r.status()});});
    await page.goto(url+'?yield=B&observe=v2');await page.waitForFunction(()=>window.uprightDiagnostics);
    await page.bringToFront();
    await page.locator('#reset').click();
    const initial=await page.evaluate(()=>uprightDiagnostics());
    if(initial.final.steps!==0||!initial.paused||initial.windowLimit!==360||initial.observationIdentity.yieldProfile!=='B')throw Error('V2 initial window/config invalid; no sequence started');
    if(n===1){
      const cdp=await context.newCDPSession(page);
      const args=await cdp.send('Browser.getBrowserCommandLine');
      identity.launchArguments=args.arguments.map(a=>a.startsWith('--user-data-dir=')?'--user-data-dir=<isolated-profile>':a===flag('--executable')?'<confirmed-native-chrome>':a);
      identity.environment=initial.environment;await cdp.detach();
    }
    if(role==='input')await page.locator('#schedule').check();
    await fs.writeFile(path.join(out,'budget.json'),JSON.stringify({started:n,completed:records.length,maxSequences:4,secondsPerSequence:6,plan:['R1','P1','R2','P2']}));
    await page.locator('#play').click();
    if(role==='input')await page.locator('#small').click();
    await page.waitForFunction(()=>uprightDiagnostics().final.steps>=360||uprightDiagnostics().final.invalid,{},{timeout:30000});
    const end=await page.evaluate(()=>uprightDiagnostics());
    const record={role,pairId,number:n,identity:{...end.observationIdentity,build:end.build,environment:end.environment,viewport:end.viewport},
      camera:end.observationCamera,trace:end.trace,events:end.events,initial:initial.final,final:end.final};
    records.push(record);
    await fs.writeFile(path.join(out,'budget.json'),JSON.stringify({started:n,completed:records.length,maxSequences:4,secondsPerSequence:6,plan:['R1','P1','R2','P2']}));
    await page.screenshot({path:path.join(out,'sequence-'+n+'.png')});
    await save();await page.close();await video.saveAs(path.join(out,'sequence-'+n+'.webm'));
    if(end.final.steps!==360||record.trace.some(t=>t.invalid||t.maxAnchorError>.15)||errors.length||badResponses.length){
      console.log('V2 safety/technical STOP, no replacement');break;
    }
    if(role==='input'){
      const pair=comparePair(records.at(-2),record);pairs.push(pair);await save();
      console.log(JSON.stringify({pairId,valid:pair.Q.valid,issues:pair.Q.issues,legacy:pair.Q.legacyV1,safety:pair.S}));
      if(!pair.Q.valid){console.log('V2 invalid common pairing: STOP');break;}
    }
  }
  await save();console.log('V2 finished '+records.length+'/4; no automatic gameplay PASS.');
}


// Frozen T1 contract:6 starts max; every started world counts, no retry.
async function runTarget({context,identity,out,errors,warnings,badResponses}){
  const {comparePair}=await import('../src/gameplay/upright-comparison.js');
  const records=[],pairs=[];const plan=['B-R','B-P','T1-R','T1-P','T1-grab-off-reset','T1-small-strong'];
  const save=async()=>fs.writeFile(path.join(out,'results.json'),JSON.stringify({version:'V2-T1',identity,plan,records,pairs,errors,warnings,badResponses}));
  const budget=async(started)=>fs.writeFile(path.join(out,'budget.json'),JSON.stringify({started,completed:records.length,maxSequences:6,secondsPerSequence:6,plan}));
  await budget(0);
  for(let n=1;n<=6;n++){
    const reaction=n<=2?'B':'T1',role=n<=4?(n%2?'reference':'input'):'safety',pairId=n<=4?reaction:null;
    console.log('T1 '+n+'/6 '+plan[n-1]);
    const page=await context.newPage(),video=page.video();
    page.on('pageerror',e=>errors.push({number:n,message:e.message}));
    page.on('console',m=>{if(m.type()==='error')errors.push({number:n,message:m.text()});if(m.type()==='warning')warnings.push({number:n,message:m.text()});});
    page.on('response',r=>{if(r.status()>=400)badResponses.push({number:n,url:r.url(),status:r.status()});});
    await page.goto(url+'?reaction='+reaction+'&yield=B&observe=v2');await page.waitForFunction(()=>window.uprightDiagnostics);await page.bringToFront();
    await page.locator('#reset').click();const initial=await page.evaluate(()=>uprightDiagnostics());
    if(initial.final.steps!==0||!initial.paused||initial.windowLimit!==360||initial.observationIdentity.reaction!==reaction)throw Error('Frozen initial identity invalid; not started');
    if(n===1){const cdp=await context.newCDPSession(page);const args=await cdp.send('Browser.getBrowserCommandLine');identity.launchArguments=args.arguments.map(a=>a.startsWith('--user-data-dir=')?'--user-data-dir=<isolated-profile>':a===flag('--executable')?'<confirmed-native-chrome>':a);identity.environment=initial.environment;await cdp.detach();}
    if(role!=='reference')await page.locator('#schedule').check();
    await budget(n);await page.locator('#play').click();
    if(role!=='reference')await page.locator('#small').click();
    const diag=()=>page.evaluate(()=>uprightDiagnostics());const wait=step=>page.waitForFunction(s=>uprightDiagnostics().final.steps>=s||uprightDiagnostics().final.invalid,s,{timeout:30000});
    let interaction=null,reset=null;
    if(n>=5){
      await wait(126);const before=await diag();
      if(before.final.invalid)throw Error('Safety abort before interaction');
      if(n===5){
        const hand=before.parts.find(p=>p.id==='handL').screen;
        await page.mouse.move(hand.x,hand.y);await page.mouse.down();const grabbed=await diag();
        interaction={before:before.final,grabbed:grabbed.final};
        await page.mouse.move(hand.x+100,hand.y-70,{steps:12});await wait(180);await page.mouse.up();
        await page.locator('#assistOff').click();interaction.afterOff=(await diag()).final;
      }else{
        await page.locator('#schedule').uncheck();await page.locator('#strong').click();interaction={before:before.final,after:(await diag()).final};
      }
    }
    await wait(360);const end=await diag();
    if(n===5){await page.locator('#reset').click();reset=(await diag()).final;}
    const record={role,pairId,number:n,identity:{...end.observationIdentity,build:end.build,environment:end.environment,viewport:end.viewport},camera:end.observationCamera,trace:end.trace,events:end.events,initial:initial.final,final:end.final,interaction,reset};
    records.push(record);await budget(n);await page.screenshot({path:path.join(out,'sequence-'+n+'.png')});await save();await page.close();await video.saveAs(path.join(out,'sequence-'+n+'.webm'));
    if(end.final.steps!==360||record.trace.some(t=>t.invalid||t.maxAnchorError>.15)||errors.length||badResponses.length){console.log('Technical/safety STOP; no replacement');break;}
    if(n===2||n===4){
      const p=comparePair(records.at(-2),record);pairs.push(p);await save();console.log(JSON.stringify({pairId,valid:p.Q.valid,legacy:p.Q.legacyV1,safety:p.S}));
      if(!p.Q.valid||!p.S.inputSafe||!p.S.referenceSafe||!p.S.returnEnvelopeAtTwoSeconds){console.log('Invalid/unsafe pair STOP');break;}
    }
    if(n===4){
      console.log('WAITING_FOR_H_REVIEW: clips saved; write decision.json {continueSafety:true} only on visible benefit, else false. No physics while waiting.');
      let decision=null;
      for(let poll=0;poll<900;poll++){try{decision=JSON.parse(await fs.readFile(path.join(out,'decision.json'),'utf8'));break;}catch(e){if(e.code!=='ENOENT')throw e;}await new Promise(r=>setTimeout(r,1000));}
      if(decision?.continueSafety!==true){console.log('No visible benefit or review timeout: STOP after4/6');break;}
    }
  }
  await save();console.log('Target trial finished '+records.length+'/6; no automatic V2 PASS');
}

async function main(){
  if(!process.argv.includes('--run-approved-eight')&&!yielding&&!v2&&!targetTrial)throw Error('Explicit eight-sequence flag required. Never run through npm test.');
  const executable=flag('--executable');if(!executable)throw Error('Confirmed native Chrome executable required.');
  const out=path.resolve(flag('--out')||'');if(!flag('--out'))throw Error('Fresh output directory required.');
  await fs.mkdir(out); // No overwrite/retry after budget expenditure.
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'goblin-B-native-'));
  const ignored=['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding'];
  const context=await chromium.launchPersistentContext(profile,{executablePath:executable,headless:false,
    viewport:{width:1280,height:720},deviceScaleFactor:1,ignoreDefaultArgs:ignored,args:['--enable-automation'],
    recordVideo:{dir:out,size:{width:1280,height:720}}});
  const results=[],errors=[],warnings=[],badResponses=[];let selected=null;
  const browser=context.browser(),identity={version:browser.version(),executable:path.basename(executable),
    executable_sha256:crypto.createHash('sha256').update(await fs.readFile(executable)).digest('hex'),
    profile:'isolated goblin-B-native temporary profile',profile_identity:crypto.createHash('sha256').update(profile).digest('hex'),
    os:os.platform()+' '+os.release()+' '+os.arch(),cpu:os.cpus()[0].model,headless:false,viewport:{width:1280,height:720},dpr:1,
    ignoredDefaultArgs:ignored};
  try{
    if(targetTrial){await runTarget({context,identity,out,errors,warnings,badResponses});return;}
    if(v2){await runV2({context,identity,out,errors,warnings,badResponses});return;}
    // Keep the initial blank tab alive: closing the last tab terminates a persistent Chrome window.
    for(let number=1;number<=8;number++){
      console.log('Starting fixed observation '+number+'/8');
      const page=await context.newPage(),video=page.video();
      page.on('pageerror',e=>errors.push({number,message:e.message}));
      page.on('console',m=>{if(m.type()==='error')errors.push({number,message:m.text()});if(m.type()==='warning')warnings.push({number,message:m.text()});});
      page.on('response',r=>{if(r.status()>=400)badResponses.push({number,url:r.url(),status:r.status()});});
      const profileId=yielding?(number===1?'B':number===2?'Y1':number===3?'Y2':selected):'B';
      await page.goto(url+(yielding?'?yield='+profileId:''));await page.waitForFunction(()=>window.uprightDiagnostics);
      if(number===1){
        const cdp=await context.newCDPSession(page);
        const args=await cdp.send('Browser.getBrowserCommandLine');
        identity.launchArguments=args.arguments.map(a=>a.startsWith('--user-data-dir=')?'--user-data-dir=<isolated-profile>':a===executable?'<confirmed-native-chrome>':a);
        identity.environment=await page.evaluate(()=>uprightDiagnostics().environment);
        await cdp.detach();
      }
      const diagnostic=()=>page.evaluate(()=>uprightDiagnostics());
      const waitStep=step=>page.waitForFunction(n=>uprightDiagnostics().final.steps>=n||uprightDiagnostics().final.invalid,step,{timeout:30000});
      if(!yielding&&number===1)await page.locator('#assisted').uncheck();
      if(!yielding&&number===7)await page.locator('#obstacle').check();
      await page.locator('#reset').click();
      const initial=await diagnostic();
      let inputSnapshot=null,resetSnapshot=null,pauseEvidence=null;
      if(yielding||number===3||number===4||number===5)await page.locator('#schedule').check();
      await fs.writeFile(path.join(out,'budget.json'),JSON.stringify({started:number,completed:results.length,maxSequences:8,mode:yielding?'approved-yield':'original-B'}));
      await page.locator('#play').click();
      if(yielding)await page.locator('#small').click();
      else if(number===3||number===4||number===5)await page.locator(number===5?'#strong':'#small').click();
      if(yielding&&number===5){await waitStep(126);await page.locator('#schedule').uncheck();await page.locator('#strong').click();}
      if(yielding&&number===7){await waitStep(126);await page.locator('#assistOff').click();}
      if(number===6||(!yielding&&number===7)||number===8){
        await waitStep(yielding?126:120);
        const d=await diagnostic(),hand=d.parts.find(p=>p.id==='handL').screen;
        await page.mouse.move(hand.x,hand.y);await page.mouse.down();
        inputSnapshot=await diagnostic();
        const target=number===7?{x:d.blockScreen.x+45,y:d.blockScreen.y-25}:{x:hand.x+130,y:hand.y-85};
        await page.mouse.move(target.x,target.y,{steps:25});
        if(number===8){
          await page.keyboard.press('Escape');const paused=await diagnostic();
          await page.waitForTimeout(350);const still=await diagnostic();
          pauseEvidence={preResetSnapshot:paused,simulatedSeconds:paused.final.time,stepsFrozen:paused.final.steps===still.final.steps,posesFrozen:JSON.stringify(paused.final.parts)===JSON.stringify(still.final.parts),
            counts:still.final.counts,grab:still.final.grab,paused:still.paused};
          await page.mouse.up();await page.locator('#reset').click();resetSnapshot=await diagnostic();
          // Native hidden/visible events, without synthetic dispatch or disabled throttling.
          const blank=await context.newPage();await blank.goto('about:blank');await blank.bringToFront();await page.waitForTimeout(300);
          await page.bringToFront();await blank.close();
          await page.locator('#play').click();await waitStep(120);
        }else{
          await waitStep(number===7?240:210);await page.mouse.up();
        }
      }
      await waitStep(number===5?440:number===6?440:number===8?180:yielding&&number===7?330:600);
      let observed=await diagnostic();
      if(!observed.paused)await page.locator('#play').click(); // Pause before another physics step, no continuation.
      const end=await diagnostic(),trace=await page.evaluate(()=>uprightTrace());
      await page.screenshot({path:path.join(out,'sequence-'+number+'.png')});
      const summary={number,simulatedSeconds:end.final.time+(number===8?(pauseEvidence?.simulatedSeconds||0):0),
        finalState:observed.trace.at(-1).state,finalReason:observed.trace.at(-1).reason,invalid:observed.final.invalid,
        frameIntervalP95Ms:p95(observed.frameIntervals),observerPhysicsPerFrameP95Ms:p95(observed.stepCosts.map(x=>x.ms)),
        maxAnchorError:Math.max(...observed.trace.map(x=>x.maxAnchorError)),inputSnapshot,resetSnapshot,pauseEvidence};
      if(yielding){
        const pre=observed.trace.find(t=>t.step===120);
        const window=observed.trace.filter(t=>t.step>120&&t.step<=240);
        const tail=observed.trace.filter(t=>t.step>=240);
        const additional=(Math.max(...window.map(t=>t.torso.tilt))-(pre?.torso.tilt||0))*180/Math.PI;
        Object.assign(summary,{profileId,additionalTiltDeg:additional,oldTwoDegreePass:additional>=2,
          safeReturn:tail.length>0&&tail.every(t=>t.assisted&&t.pelvis.tilt<=Math.PI/12&&t.torso.tilt<=Math.PI/12&&
            t.metrics.pelvisHeight>=.95&&t.metrics.pelvisHeight<=1.25&&!t.metrics.nonFootFloor.length)&&
            !observed.trace.some(t=>t.invalid||t.maxAnchorError>.15)});
      }
      // Keep actual trace plus API audit. These are command observations, not measured solver motor torques.
      results.push({summary,initial,observed,end,trace});
      await fs.writeFile(path.join(out,'results.json'),JSON.stringify({identity,url,mode:yielding?'approved-yield':'original-B',selected,results,errors,warnings,badResponses}));
      await page.close();await video.saveAs(path.join(out,'sequence-'+number+'.webm'));
      console.log(JSON.stringify({number,seconds:summary.simulatedSeconds,state:summary.finalState,reason:summary.finalReason,invalid:summary.invalid}));
      if(yielding&&number===3){
        const reference=results[0].summary.additionalTiltDeg;
        selected=results.slice(1).find(r=>r.summary.safeReturn&&r.summary.additionalTiltDeg-reference>=.5)?.summary.profileId||null;
        await fs.writeFile(path.join(out,'decision.json'),JSON.stringify({selected,reference,minimumGainDeg:.5}));
        if(!selected){console.log('No measurable safe benefit in either fixed variant: STOP after 3/8.');break;}
      }
      if(summary.invalid||pauseEvidence?.preResetSnapshot?.final.invalid||summary.maxAnchorError>.15||end.final.time+(pauseEvidence?.simulatedSeconds||0)>10||errors.length||badResponses.length){
        console.log('Safety/technical stop: no remaining observation started.');break;
      }
    }
  }finally{await context.close();}
  console.log('Observation complete: '+results.length+'/8. Evidence: '+out);
}
main().catch(e=>{console.error(e);process.exitCode=1;});

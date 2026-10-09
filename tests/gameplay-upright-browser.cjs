// Explicitly approved eight-sequence observation, not an automatic npm-test campaign.
// Usage: node tests/gameplay-upright-browser.cjs --run-approved-eight --executable <native Chrome.exe> --out <new evidence directory>
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const flag=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const url='http://127.0.0.1:4174/goblin/gameplay/upright/';
const yielding=process.argv.includes('--run-approved-yield');
const p95=a=>a.length?a.slice().sort((a,b)=>a-b)[Math.ceil(a.length*.95)-1]:null;
async function main(){
  if(!process.argv.includes('--run-approved-eight')&&!yielding)throw Error('Explicit eight-sequence flag required. Never run through npm test.');
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

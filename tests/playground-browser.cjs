// Manual UI QA only, never a research runner or npm-test campaign.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const arg=name=>process.argv[process.argv.indexOf(name)+1];
async function main(){
  if(!process.argv.includes('--executable')||!process.argv.includes('--url'))throw Error('Confirmed --executable and reachable --url required; no fallback');
  const out=await fs.mkdtemp(path.join(os.tmpdir(),'goblin-playground-qa-'));
  const browser=await chromium.launch({executablePath:arg('--executable'),headless:false,args:['--enable-automation'],
    ignoreDefaultArgs:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,acceptDownloads:true});
  const page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)requests.push({url:r.url(),status:r.status()});});
  const read=()=>page.evaluate(()=>uprightDiagnostics());
  const checks=[];
  try{
    await page.goto(arg('--url'));await page.waitForFunction(()=>window.uprightDiagnostics);
    const initial=await read();assert.equal(initial.final.steps,0);assert.equal(initial.paused,true);assert.equal(initial.pending,null);
    assert.equal(initial.final.grab.active,false);assert.equal(initial.observationIdentity.returnProfile,'R1');assert.equal(initial.trace.length,0);
    const cdp=await context.newCDPSession(page);const launch=await cdp.send('Browser.getBrowserCommandLine');
    const identity={version:browser.version(),executable:path.basename(arg('--executable')),profile:'own temporary Playwright profile',
      launchArguments:launch.arguments.map(a=>a.startsWith('--user-data-dir=')?'--user-data-dir=<temporary-profile>':a===arg('--executable')?'<confirmed-chrome>':a),
      url:arg('--url'),viewport:{width:1280,height:720},environment:initial.environment,build:initial.build};
    if(process.argv.includes('--issue100')){
      const buttons={perspective:'cameraPerspective',front:'cameraFront',side:'side',top:'cameraTop'},saved={};
      for(const id of Object.values(buttons)){const r=await page.locator('#'+id).boundingBox();assert.ok(r.y>=0&&r.y+r.height<=720,'view switches visible on entry');}
      const physics=initial.final,memory=initial.rendererMemory;
      await page.locator('summary').filter({hasText:'Kamera'}).click();
      for(const [mode,id] of Object.entries(buttons)){
        await page.locator('#'+id).click();const view=await read();
        assert.equal(view.observationCamera.mode,mode);assert.equal(view.observationCamera.type,mode==='perspective'?'perspective':'orthographic');
        assert.deepEqual(view.final,physics);assert.deepEqual(view.rendererMemory,memory);
        await page.locator('#cameraFrame').click();assert.deepEqual((await read()).final,physics);
        const rect=await page.locator('canvas').boundingBox(),x=rect.x+rect.width*.3,y=rect.y+rect.height*.35;
        const beforeCamera=(await read()).observationCamera;
        await page.mouse.move(x,y);await page.mouse.down({button:'right'});await page.mouse.move(x+40,y+25,{steps:4});await page.mouse.up({button:'right'});
        const moved=(await read()).observationCamera;
        if(mode==='perspective')assert.notDeepEqual(moved.quaternion,beforeCamera.quaternion);
        else{assert.notDeepEqual(moved.target,beforeCamera.target);assert.ok(moved.quaternion.every((v,i)=>Math.abs(v-beforeCamera.quaternion[i])<1e-12));}
        const panBefore=(await read()).observationCamera.target;
        if(mode==='perspective')await page.keyboard.down('Shift');
        const panButton=mode==='perspective'?'right':'middle';await page.mouse.move(x,y);await page.mouse.down({button:panButton});await page.mouse.move(x+20,y-15);await page.mouse.up({button:panButton});await page.keyboard.up('Shift');
        assert.notDeepEqual((await read()).observationCamera.target,panBefore);
        await page.mouse.wheel(0,100);assert.deepEqual((await read()).final,physics);
        saved[mode]=(await read()).observationCamera;
      }
      for(const [mode,id] of Object.entries(buttons)){
        await page.locator('#'+id).click();assert.deepEqual((await read()).observationCamera,saved[mode]);
        await page.locator('#mark').click();const dp=page.waitForEvent('download');await page.locator('#feedbackExport').click();
        const d=await dp,file=path.join(out,'camera-'+mode+'.json');await d.saveAs(file);
        const payload=JSON.parse(await fs.readFile(file,'utf8'));assert.deepEqual(payload.observation.browser.camera,JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(saved[mode]).filter(([key])=>key!=='canvas')))));
        await page.locator('#cameraReset').click();await page.locator('#cameraFrame').click();
        await page.screenshot({path:path.join(out,'camera-'+mode+'.png')});
        await page.locator('#play').click();const head=(await read()).parts.find(p=>p.id==='head').screen;
        await page.mouse.move(head.x,head.y);await page.mouse.down();const grip=await read();assert.equal(grip.final.grab.active,true);
        const expected=grip.final.parts.find(p=>p.id==='head').handle;assert.equal(grip.final.grab.body,expected);
        for(const action of [...Object.values(buttons),'cameraReset','cameraFrame','cameraMode'])assert.equal(await page.locator('#'+action).isDisabled(),true);
        const attempt=await page.evaluate(()=>{const before=uprightDiagnostics();document.getElementById('cameraFront').onclick();const after=uprightDiagnostics();return {before:before.final,after:after.final,mode:after.observationCamera.mode};});
        assert.deepEqual(attempt.after,attempt.before);assert.equal(attempt.mode,mode);
        await page.mouse.move(head.x+10,head.y+5);await page.mouse.up();assert.equal((await read()).final.grab.active,false);
        const liveChange=await page.evaluate(()=>{const before=uprightDiagnostics().final;document.getElementById('cameraTop').click();return {before,after:uprightDiagnostics().final};});
        assert.deepEqual(liveChange.after,liveChange.before);await page.locator('#reset').click();
      }
      await page.setViewportSize({width:744,height:360});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
      await page.locator('aside').evaluate(a=>{a.scrollTop=0;});
      for(const id of Object.values(buttons)){const r=await page.locator('#'+id).boundingBox();assert.ok(r.y>=0&&r.y+r.height<=360,'landscape switches visible at top');}
      for(const [mode,id] of Object.entries(buttons)){
        await page.locator('#'+id).click();await page.locator('#cameraFrame').click();
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        const before=(await read()).final;await page.locator('#cameraMode').check();
        const rect=await page.locator('canvas').boundingBox(),x=rect.x+rect.width*.3,y=rect.y+rect.height*.3;
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+20,y:y+15}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.deepEqual((await read()).final,before);
        const pinchBefore=(await read()).observationCamera;
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y},{x:x+35,y}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-15,y:y+5},{x:x+55,y:y+5}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        const pinchAfter=(await read()).observationCamera;
        if(mode==='perspective')assert.notDeepEqual(pinchAfter.position,pinchBefore.position);else assert.notEqual(pinchAfter.zoom,pinchBefore.zoom);
        assert.deepEqual((await read()).final,before);
        await page.locator('#cameraMode').uncheck();await page.locator('#cameraFrame').click();
        await page.locator('#play').click();const head=(await read()).parts.find(p=>p.id==='head').screen;
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:head.x,y:head.y}]});assert.equal((await read()).final.grab.active,true);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.locator('#reset').click();
        await page.screenshot({path:path.join(out,'landscape-'+mode+'.png')});
      }
      await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await page.setViewportSize({width:1280,height:720});
      await page.locator('#cameraPerspective').click();await page.locator('#cameraReset').click();
      await page.locator('#play').click();await page.locator('#strong').click();await page.waitForTimeout(1800);await page.locator('#play').click();
      const fallen=(await read()).final;
      for(const id of Object.values(buttons)){await page.locator('#'+id).click();await page.locator('#cameraFrame').click();assert.deepEqual((await read()).final,fallen);}
      await page.screenshot({path:path.join(out,'fallen-top.png')});await page.locator('#reset').click();
      await page.locator('#cameraPerspective').click();await page.locator('#cameraReset').click();
      await page.locator('summary').filter({hasText:'Kamera'}).click();
      checks.push('four true views; paused/live camera state isolation; orbit/pan/zoom and per-view memory; projection in actual downloads; mouse/head picking and active-grip lock in every view; 744x360 touch navigation/picking; fallen framing; bounded GPU counts');
    }
    if(process.argv.includes('--issue99')){
      assert.equal(initial.windowLimit,null);assert.deepEqual(initial.runPolicy,{mode:'free',timerSteps:null});
      if(!process.argv.includes('--skip-long-run')){
      await page.locator('#play').click();
      await page.waitForFunction(()=>uprightStepState().steps>3660,null,{timeout:85000});
      await page.locator('#play').click();const long=await read();
      assert.equal(long.pause.kind,'observation');assert.equal(long.final.invalid,null);
      assert.equal(long.trace.length,0);assert.equal(long.events.length,0);assert.equal(long.lastRun,undefined);
      console.log('Issue99: native free run exceeded 61 simulation seconds');
      checks.push('native foreground free run beyond 10/60 s, no trace/events, observation pause');
      }
      for(const speed of ['0.25','0.5','1']){
        await page.locator('#speed').selectOption(speed);await page.locator('#reset').click();
        await page.locator('#play').click();await page.waitForTimeout(1200);await page.locator('#play').click();
        const d=await read();assert.ok(d.final.steps>=40*Number(speed)&&d.final.steps<=85*Number(speed));
        assert.equal(d.speed,Number(speed));assert.equal(d.observationIdentity.nativeTimestep,initial.observationIdentity.nativeTimestep);
        await page.waitForTimeout(300);assert.deepEqual((await read()).final,d.final);
        await page.locator('#step').click();assert.equal((await read()).final.steps,d.final.steps+1);
      }
      await page.locator('#reset').click();const old=await read();
      await page.locator('#timer').selectOption('10');assert.equal((await read()).runPolicy.timerSteps,null);
      await page.locator('#reset').click();const timed=await read();
      assert.notEqual(timed.runIdentity.run_id,old.runIdentity.run_id);assert.equal(timed.runPolicy.timerSteps,600);
      await page.locator('#play').click();await page.waitForFunction(()=>uprightStepState().steps===600,null,{timeout:20000});
      const expired=await read();assert.equal(expired.pause.kind,'observation');assert.equal(expired.pause.reason,'timer-end');
      assert.equal(expired.final.assisted,true);await page.locator('#step').click();assert.equal((await read()).final.steps,601);
      await page.locator('#play').click();await page.waitForFunction(()=>uprightStepState().steps>601);await page.locator('#play').click();
      await page.locator('#mark').click();const timerDownload=page.waitForEvent('download');
      await page.locator('#feedbackExport').click();const td=await timerDownload,tfile=path.join(out,td.suggestedFilename());
      await td.saveAs(tfile);const payload=JSON.parse(await fs.readFile(tfile,'utf8'));
      assert.equal(payload.identity.run_policy.timerSteps,600);assert.equal(payload.observation.browser.run_controls.speed,1);
      await page.locator('summary').filter({hasText:'Kamera'}).click();await page.locator('#side').click();
      const camera=(await read()).observationCamera,memory=(await read()).rendererMemory;
      for(let i=0;i<5;i++){
        const before=await read();await page.locator('#reset').click();const after=await read();
        assert.notEqual(after.runIdentity.run_id,before.runIdentity.run_id);assert.equal(after.final.steps,0);
        assert.equal(after.pointerId,null);assert.equal(after.pending,null);assert.equal(after.final.grab.active,false);
        assert.deepEqual(after.rendererMemory,memory);assert.deepEqual(after.observationCamera,camera);
        assert.equal(after.final.counts.bodies,15);assert.equal(await page.locator('#feedbackExport').isDisabled(),true);
      }
      await page.locator('summary').filter({hasText:'Kamera'}).click();
      await page.locator('#timer').selectOption('');await page.locator('#reset').click();
      checks.push('slow-motion UI fixed dt/frozen pause/single step; deferred timer, expiry/resume/export; five reset identities, bounded GPU counts and preserved camera');
    }
    await page.locator('#step').click();assert.equal((await read()).final.steps,1);assert.equal((await read()).paused,true);
    await page.locator('#mark').click();await page.locator('#note').fill('Native Prüfung: ein Schritt, keine Nutzerabnahme.');
    await page.locator('#body').selectOption('footL');await page.locator('#category').selectOption('foot');
    const downloadPromise=page.waitForEvent('download');await page.locator('#feedbackExport').click();const download=await downloadPromise;
    const file=path.join(out,download.suggestedFilename());await download.saveAs(file);assert.equal(await download.failure(),null);
    const feedback=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(feedback.observation.step,1);assert.equal(feedback.identity.variant,'R1');assert.equal(feedback.observation.body_id,'footL');assert.equal(feedback.observation.snapshot.parts.length,15);assert.equal(feedback.data_errors.length,0);
    checks.push('single step, marker, native JSON download and payload');
    for(const variant of ['B','T1','R1']){
      await page.locator('#variant').selectOption(variant);const fresh=await read();
      assert.equal(fresh.final.steps,0);assert.equal(fresh.paused,true);assert.equal(fresh.final.grab.active,false);assert.equal(fresh.pending,null);assert.equal(fresh.trial,null);
      assert.equal(await page.locator('#note').inputValue(),'');assert.equal(await page.locator('#feedbackExport').isDisabled(),true);
      assert.equal(fresh.observationIdentity.reaction,variant==='B'?'B':'T1');assert.equal(fresh.observationIdentity.returnProfile,variant==='R1'?'R1':'legacy');
      await page.locator('#play').click();await page.waitForFunction(()=>uprightStepState().steps>=20);
      await page.locator('#small').click();await page.locator('#play').click();const paused=await read();
      assert.equal(paused.pause.kind,'observation');assert.equal(paused.final.assisted,true);
      if(variant!=='B')assert.ok(['RISE','HOLD','RETURN'].includes(paused.final.targetAssist.phase));
      await page.waitForTimeout(1500);assert.deepEqual((await read()).final,paused.final);assert.equal((await read()).pending,paused.pending);
      await page.locator('#step').click();assert.equal((await read()).final.steps,paused.final.steps+1);assert.equal((await read()).paused,true);
      await page.locator('#play').click();await page.waitForFunction(step=>uprightStepState().steps>step,paused.final.steps+1);
      await page.locator('#mark').click();const marked=await read();assert.equal(marked.pause.kind,'observation');
      assert.equal(marked.final.assisted,true);await page.waitForTimeout(300);assert.deepEqual((await read()).final,marked.final);
      const markedDownloadPromise=page.waitForEvent('download');await page.locator('#feedbackExport').click();const markedDownload=await markedDownloadPromise;
      const markedFile=path.join(out,markedDownload.suggestedFilename());await markedDownload.saveAs(markedFile);
      const markedFeedback=JSON.parse(await fs.readFile(markedFile,'utf8'));
      assert.deepEqual(markedFeedback.observation.snapshot,marked.final);assert.equal(markedFeedback.observation.pause.kind,'observation');
      assert.equal(markedFeedback.observation.pause.snapshot_timing,'before-pause-request');assert.equal(markedFeedback.identity.variant,variant);
      await page.locator('#reset').click();assert.equal((await read()).final.steps,0);assert.equal((await read()).final.assisted,true);
    }
    checks.push('B/T1/R1 reaction pause: 1.5 s wall wait, exact frozen snapshot, one step, resume, running marker and actual download');
    // Pending step120 input survives observation, but new paused pushes never queue.
    await page.locator('summary').filter({hasText:'Technische Details'}).click();
    await page.locator('#schedule').check();await page.locator('#play').click();await page.locator('#small').click();
    await page.locator('#play').click();const pendingPause=await read();assert.equal(pendingPause.pending,false);
    await page.waitForTimeout(300);assert.equal((await read()).pending,false);assert.equal(await page.locator('#small').isDisabled(),true);
    await page.locator('#reset').click();assert.equal((await read()).pending,null);await page.locator('#schedule').uncheck();
    // Native keyboard marking while the mouse still holds a grip avoids a hidden release/throw.
    await page.locator('#play').click();const gripHand=(await read()).parts.find(p=>p.id==='handL').screen;
    await page.mouse.move(gripHand.x,gripHand.y);await page.mouse.down();assert.equal((await read()).final.grab.active,true);
    await page.locator('#mark').focus();await page.keyboard.press('Space');const cancelled=await read();
    assert.equal(cancelled.paused,true);assert.equal(cancelled.pause.kind,'safety');assert.equal(cancelled.pause.reason,'marker-active-grab');
    assert.equal(cancelled.final.grab.active,false);assert.equal(cancelled.pointerId,null);assert.equal(cancelled.final.grab.lastRelease.threw,false);
    const cancelledMotion=cancelled.final.parts;await page.mouse.move(gripHand.x+80,gripHand.y-30);await page.mouse.up();
    assert.deepEqual((await read()).final.parts,cancelledMotion);
    const gripDownloadPromise=page.waitForEvent('download');await page.locator('#feedbackExport').click();const gripDownload=await gripDownloadPromise;
    const gripFile=path.join(out,gripDownload.suggestedFilename());await gripDownload.saveAs(gripFile);
    const gripFeedback=JSON.parse(await fs.readFile(gripFile,'utf8'));assert.equal(gripFeedback.observation.snapshot.grab.active,true);
    assert.equal(gripFeedback.observation.pause.kind,'safety');assert.equal(gripFeedback.observation.pause.grab_cancelled,true);
    await page.locator('#play').click();assert.equal((await read()).final.assisted,false);await page.locator('#reset').click();
    await page.locator('#assistOff').click();await page.locator('#step').click();assert.equal((await read()).final.assisted,false);
    await page.locator('#play').click();assert.equal((await read()).final.assisted,false);await page.locator('#safetyStop').click();
    assert.equal((await read()).pause.reason,'manual-safety-stop');await page.locator('#reset').click();
    checks.push('pending input preservation/reset; active-grip keyboard marker pre-safety payload; pointer cleanup/no throw; explicit assist-off and safety stop');
    // Observe native visibility events with normal background throttling, including an already paused run.
    await page.evaluate(()=>{window.nativeVisibility=[];document.addEventListener('visibilitychange',event=>{
      const d=uprightDiagnostics();nativeVisibility.push({hidden:document.hidden,trusted:event.isTrusted,steps:d.final.steps,paused:d.paused,pause:d.pause});
    });});
    await page.locator('#play').click();await page.waitForFunction(()=>uprightStepState().steps>=5);await page.locator('#play').click();
    const hiddenStart=(await read()).final.steps,other=await context.newPage();await other.bringToFront();
    let observedHidden=true;
    try{await page.waitForFunction(()=>document.hidden,null,{polling:100,timeout:5000});}
    catch(error){if(error.name!=='TimeoutError')throw error;observedHidden=false;}
    await page.waitForTimeout(300);
    const hidden=await read();assert.equal(hidden.final.steps,hiddenStart);
    if(observedHidden){assert.equal(hidden.pause.kind,'safety');assert.equal(hidden.final.assisted,false);}
    await page.bringToFront();await page.waitForFunction(()=>!document.hidden);const events=await page.evaluate(()=>nativeVisibility);
    if(observedHidden){assert.ok(events.some(e=>e.hidden&&e.trusted));assert.ok(events.some(e=>!e.hidden&&e.trusted));}
    await page.locator('#play').click();await page.waitForFunction(step=>uprightStepState().steps>step,hiddenStart);
    if(observedHidden)assert.equal((await read()).final.assisted,false);
    await other.close();await page.locator('#reset').click();
    await fs.writeFile(path.join(out,'native-visibility.json'),JSON.stringify(events,null,2));
    checks.push(observedHidden?'native trusted hidden/visible while observation-paused; safety off, frozen step, actual resume progress without assist reactivation':
      'NOT PROVEN native Hidden/Resume: own tab activation produced no hidden event; no synthetic substitute');
    // Camera changes only the view, never the paused physical state.
    await page.locator('summary').filter({hasText:'Kamera'}).click();const physical=(await read()).final;
    await page.locator('#side').click();assert.deepEqual((await read()).final,physical);
    await page.locator('#cameraReset').click();assert.deepEqual((await read()).final,physical);
    await page.locator('#cameraMode').check();const rect=await page.locator('canvas').boundingBox();
    await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.mouse.move(rect.x+rect.width/2+50,rect.y+rect.height/2+20);await page.mouse.up();await page.mouse.wheel(0,150);
    assert.deepEqual((await read()).final,physical);await page.locator('#cameraMode').uncheck();await page.locator('#cameraReset').click();checks.push('side/reset/orbit/zoom leave physical state unchanged');
    // Real pointer grab through the same picking + ContactGrab handlers.
    await page.locator('#play').click();const hand=(await read()).parts.find(p=>p.id==='handL').screen;
    await page.mouse.move(hand.x,hand.y);await page.mouse.down();assert.equal((await read()).final.grab.active,true);assert.equal((await read()).final.assisted,false);
    await page.mouse.move(hand.x+45,hand.y-30,{steps:5});await page.mouse.up();assert.equal((await read()).final.grab.active,false);
    await page.locator('#reset').click();await page.locator('#play').click();await page.locator('#strong').click();assert.equal((await read()).final.assisted,false);await page.locator('#reset').click();
    checks.push('native hand drag/release, strong push and reset');
    await page.screenshot({path:path.join(out,'desktop.png')});
    await page.setViewportSize({width:744,height:360});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.locator('#play').click();const mobileHand=(await read()).parts.find(p=>p.id==='handL').screen;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:mobileHand.x,y:mobileHand.y}]});
    assert.equal((await read()).final.grab.active,true);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:mobileHand.x+25,y:mobileHand.y-10}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal((await read()).final.grab.active,false);
    await page.locator('#reset').click();await page.screenshot({path:path.join(out,'landscape.png')});checks.push('744x360 touch emulation grab/release, scrollable controls, no horizontal overflow');
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await page.setViewportSize({width:1280,height:720});
    await page.goto(new URL('../gameplay/upright/?variant=R1',arg('--url')).href);await page.waitForFunction(()=>window.uprightDiagnostics);
    await page.locator('#play').click();await page.waitForFunction(()=>uprightStepState().steps>=20);
    await page.locator('#small').click();await page.locator('#play').click();const prototypePause=await read();
    assert.equal(prototypePause.pause.kind,'observation');assert.equal(prototypePause.final.assisted,true);
    await page.waitForTimeout(300);assert.deepEqual((await read()).final,prototypePause.final);
    await page.locator('#step').click();assert.equal((await read()).final.steps,prototypePause.final.steps+1);
    await page.locator('#play').click();await page.waitForFunction(step=>uprightStepState().steps>step,prototypePause.final.steps+1);
    await page.locator('#safetyStop').click();assert.equal((await read()).final.assisted,false);
    await page.locator('#reset').click();checks.push('original prototype uses the same observation/step/resume/safety controls');
    assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
    await fs.writeFile(path.join(out,'result.json'),JSON.stringify({identity,checks,errors,requests,feedbackFile:path.basename(file)},null,2));
    console.log(JSON.stringify({out,build:initial.build.build_id,checks,errors,requests}));
  }finally{await context.close();await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

// Scoped #113 follow-up: real production pages, baseline parity and editor edge cases.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const arg=name=>process.argv[process.argv.indexOf(name)+1];
async function main(){
  for(const key of ['--executable','--url','--baseline-url'])if(!process.argv.includes(key))throw Error(key+' required; no browser fallback');
  const out=await fs.mkdtemp(path.join(os.tmpdir(),'goblin-editor-review-'));
  const context=await chromium.launchPersistentContext(path.join(out,'chrome-profile'),{executablePath:arg('--executable'),headless:false,viewport:{width:1280,height:720},acceptDownloads:true,ignoreDefaultArgs:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  const browser=context.browser(),page=context.pages()[0]||await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});
  const read=()=>page.evaluate(()=>uprightDiagnostics());
  const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const open=()=>page.locator('aside > details').evaluateAll(es=>es.forEach(e=>e.open=true));
  const checkpoints=[0,1,40,120,180];
  async function reference(url,label){
    await page.goto(url);await page.waitForFunction(()=>window.uprightDiagnostics);await settle();
    await page.screenshot({path:path.join(out,label+'-desktop.png')});
    const identity=(await read()).build;await open();await page.locator('#inspectBody').selectOption('pelvis');
    // Push in one JS turn before the first rendered tick; every subsequent step is explicit.
    await page.evaluate(()=>{document.getElementById('play').click();document.getElementById('small').click();document.getElementById('play').click();});
    const trace=[];
    for(const step of checkpoints){
      await page.evaluate(n=>{while(uprightDiagnostics().final.steps<n)document.getElementById('step').click();},step);
      trace.push({step,final:(await read()).final});
    }
    await page.locator('#mark').click();const promise=page.waitForEvent('download');await page.locator('#feedbackExport').click();
    const download=await promise,file=path.join(out,label+'-feedback.json');await download.saveAs(file);
    return {identity,trace,feedback:JSON.parse(await fs.readFile(file,'utf8'))};
  }
  try{
    const baseline=await reference(arg('--baseline-url'),'baseline'),candidate=await reference(arg('--url'),'candidate');
    assert.deepEqual(candidate.trace,baseline.trace,'same native input/steps across pre-editor baseline and candidate');
    for(const key of ['feedback_schema_version','context','meaning','data_errors'])assert.deepEqual(candidate.feedback[key],baseline.feedback[key]);
    assert.deepEqual(candidate.feedback.observation.snapshot,baseline.feedback.observation.snapshot);
    assert.deepEqual(candidate.feedback.observation.browser.inspection.readout,baseline.feedback.observation.browser.inspection.readout);
    await fs.writeFile(path.join(out,'native-parity.json'),JSON.stringify({baseline,candidate},null,2));
    const checks=['exact baseline/candidate trace at 0/1/40/120/180 steps with small push; exported snapshot, inspector/joint readout and feedback semantics unchanged'];
    const contrast=await page.evaluate(()=>{
      const lum=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
      return ['#play','#safetyStop','#phaseStatus','#assistStatus','aside summary','#inspectionValues dt'].map(selector=>{const element=document.querySelector(selector),style=getComputedStyle(element);let parent=element,bg;do{bg=getComputedStyle(parent).backgroundColor;parent=parent.parentElement;}while(bg==='rgba(0, 0, 0, 0)'&&parent);const a=lum(style.color),b=lum(bg);return {selector,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});
    });
    for(const row of contrast)assert.ok(row.ratio>=4.5,row.selector+' text contrast');
    await page.locator('#reset').click();await page.locator('#play').focus();await page.keyboard.press('Tab');assert.equal(await page.locator('#step').evaluate(e=>e===document.activeElement),true);
    const outline=await page.locator('#step').evaluate(e=>getComputedStyle(e).outlineStyle);assert.notEqual(outline,'none');await page.keyboard.press('Space');assert.equal((await read()).final.steps,1);
    checks.push('measured key text contrast >=4.5:1, keyboard Tab order and visible focus; keyboard Space advances one paused step');
    await page.locator('#reset').click();await page.locator('#play').click();await page.waitForFunction(()=>uprightDiagnostics().final.steps>=3);
    await page.locator('#note').fill('Editing must preserve the run');await page.keyboard.press('Escape');
    assert.equal((await read()).paused,false);assert.equal((await read()).final.assisted,true);
    await page.evaluate(()=>{const dialog=document.createElement('dialog');dialog.id='testDialog';dialog.innerHTML='<input aria-label="Dialog test">';document.body.append(dialog);dialog.showModal();dialog.querySelector('input').focus();});await page.keyboard.press('Escape');assert.equal(await page.locator('#testDialog').evaluate(e=>e.open),false);assert.equal((await read()).paused,false);await page.locator('#testDialog').evaluate(e=>e.remove());
    await page.locator('#note').fill('');await page.locator('#safetyStop').focus();await page.keyboard.press('Escape');
    assert.equal((await read()).pause.reason,'escape');assert.equal((await read()).final.assisted,false);
    await page.locator('#reset').click();await page.locator('#play').click();await settle();
    const head=(await read()).parts.find(p=>p.id==='head').screen;await page.mouse.move(head.x,head.y);await page.mouse.down();assert.equal((await read()).final.grab.active,true);
    const grabbedView=(await read()).viewports.selected;await page.setViewportSize({width:744,height:360});await settle();assert.equal((await read()).final.grab.active,true);assert.equal((await read()).viewports.selected,grabbedView);assert.ok((await read()).observationCamera.projection.every(Number.isFinite));await page.setViewportSize({width:1280,height:720});await settle();assert.equal((await read()).final.grab.active,true);
    await page.locator('#note').focus();await page.keyboard.press('Escape');assert.equal((await read()).final.grab.active,false);assert.equal((await read()).paused,true);assert.equal((await read()).final.grab.lastRelease.threw,false);await page.mouse.up();
    checks.push('real Escape in textarea preserves running assist; Escape outside form and while grabbing stops safely without a throw');
    await page.locator('#reset').click();const before=(await read()).final,projection=(await read()).observationCamera.projection;
    await page.locator('#view').evaluate(e=>e.style.display='none');await settle();assert.deepEqual((await read()).final,before);assert.deepEqual((await read()).observationCamera.projection,projection);
    await page.locator('#step').click();assert.equal((await read()).final.steps,1,'zero stage adds no hidden step or pause');
    await page.locator('#view').evaluate(e=>e.style.display='');await settle();assert.equal((await read()).final.steps,1);assert.ok((await read()).observationCamera.projection.every(Number.isFinite));
    checks.push('zero-sized stage skips drawing, preserves finite projection and explicit step contract; restoration resumes rendering');
    const visibility=[],cdp=await context.newCDPSession(page);const {windowId}=await cdp.send('Browser.getWindowForTarget');
    for(const running of [true,false]){
      await page.locator('#reset').click();if(running){await page.locator('#play').click();await page.waitForFunction(()=>uprightDiagnostics().final.steps>=3);}
      await page.evaluate(()=>{window.nativeEvents=[];document.addEventListener('visibilitychange',e=>nativeEvents.push({hidden:document.hidden,trusted:e.isTrusted}),{signal:(window.nativeAbort=new AbortController()).signal});});
      // Minimize/restore this test profile's real Chrome window, never dispatch synthetic visibility events.
      await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'minimized'}});let hidden=false;
      try{await page.waitForFunction(()=>document.hidden,null,{timeout:5000});hidden=true;}catch(e){if(e.name!=='TimeoutError')throw e;}
      if(hidden){const state=await read();assert.equal(state.paused,true);assert.equal(state.final.assisted,false);await page.waitForTimeout(200);assert.equal((await read()).final.steps,state.final.steps);}
      await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'normal'}});await page.bringToFront();await page.waitForFunction(()=>!document.hidden);const events=await page.evaluate(()=>{nativeAbort.abort();return nativeEvents;});
      if(hidden){assert.ok(events.some(e=>e.hidden&&e.trusted));assert.ok(events.some(e=>!e.hidden&&e.trusted));const step=(await read()).final.steps;await page.locator('#play').click();await page.waitForFunction(n=>uprightDiagnostics().final.steps>n,step);assert.equal((await read()).final.assisted,false);}
      visibility.push({running,method:'native Chrome window minimize/restore',proven:hidden,events});
    }
    await page.locator('#reset').click();checks.push(visibility.every(v=>v.proven)?'native trusted Hidden/Resume proved for running and observation-paused states; safety off, frozen hidden steps, actual resume progress':'NOT PROVEN native Hidden/Resume; no synthetic substitute');
    // Use Chrome's own zoom control in this disposable profile; renderer key injection does not operate browser chrome.
    const settings=await context.newPage();await settings.goto('chrome://settings/appearance');
    await settings.locator('select').first().waitFor();
    const zoomControl=settings.locator('select').filter({has:settings.locator('option', {hasText:'200%'})}).first();await zoomControl.waitFor();
    const zoomOptions=await zoomControl.locator('option').evaluateAll(es=>es.map(e=>({label:e.textContent,value:e.value})));
    const twice=zoomOptions.find(o=>o.label.includes('200%'));assert.ok(twice,'native Chrome exposes 200% page zoom');await zoomControl.selectOption(twice.value);
    await page.bringToFront();await page.reload();await page.waitForFunction(()=>window.uprightDiagnostics);await open();await settle();
    const zoom=await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio}));
    assert.ok(zoom.width<1280,'native browser zoom must actually change the CSS viewport');
    const safety=await page.locator('#safetyStop').boundingBox();assert.ok(safety.y>=0&&safety.y+safety.height<=zoom.height);
    const overflow=await page.evaluate(()=>{const y=scrollY;scrollTo(10000,y);const result={client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,x:scrollX};scrollTo(0,y);return result;});assert.ok(overflow.scroll<=overflow.client+1,'fractional zoom rounding must not hide real overflow');assert.equal(overflow.x,0,'no horizontal page scroll at actual browser zoom');
    await page.screenshot({path:path.join(out,'zoom.png')});const normal=zoomOptions.find(o=>o.label.includes('100%'));await zoomControl.selectOption(normal.value);await settings.close();await page.bringToFront();await page.reload();await page.waitForFunction(()=>window.uprightDiagnostics);await open();
    await page.setViewportSize({width:390,height:844});await page.locator('#note').scrollIntoViewIfNeeded();await settle();
    const pinned=await page.locator('#safetyStop').boundingBox();assert.ok(pinned.y>=0&&pinned.y+pinned.height<=844);const status=await page.locator('#assistStatus').boundingBox();assert.ok(status.y>=0);
    await page.screenshot({path:path.join(out,'portrait-scrolled.png')});
    await page.setViewportSize({width:480,height:240});await page.evaluate(()=>scrollTo(0,0));await settle();
    const stage=await page.locator('#view').boundingBox();assert.ok(stage.height>=220);assert.ok(stage.width>=450);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(out,'short-landscape.png')});
    checks.push('native browser zoom changes CSS viewport with reachable Safety; portrait scroll keeps Run/Safety/Assist pinned; short landscape retains scrollable 220px stage');
    assert.deepEqual(errors,[]);
    const result={out,browser:browser.version(),baseline:baseline.identity,candidate:candidate.identity,zoom,contrast,visibility,checks,errors};await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({out,baseline:baseline.identity.revision,candidate:candidate.identity.revision,build:candidate.identity.build_id,zoom,contrast,visibility,checks,errors}));
  }finally{await context.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

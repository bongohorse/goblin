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
    if(process.argv.includes('--issue100')&&!process.argv.includes('--issue101'))await page.locator('#cameraSingle').click();
    const initial=await read();assert.equal(initial.final.steps,0);assert.equal(initial.paused,true);assert.equal(initial.pending,null);
    assert.equal(initial.final.grab.active,false);assert.equal(initial.observationIdentity.returnProfile,'R1');assert.equal(initial.trace.length,0);
    const cdp=await context.newCDPSession(page);const launch=await cdp.send('Browser.getBrowserCommandLine');
    const identity={version:browser.version(),executable:path.basename(arg('--executable')),profile:'own temporary Playwright profile',
      launchArguments:launch.arguments.map(a=>a.startsWith('--user-data-dir=')?'--user-data-dir=<temporary-profile>':a===arg('--executable')?'<confirmed-chrome>':a),
      url:arg('--url'),viewport:{width:1280,height:720},environment:initial.environment,build:initial.build};


    if(process.argv.includes('--issue102')){
      const open=()=>page.locator('#inspectionPanel').evaluate(e=>{e.open=true;});
      const toggle=(key,on)=>page.locator('[data-inspection='+key+']').setChecked(on);
      const keys=['mesh','wireframe','colliders','joints','floor','grid','velocity','commands'];
      const defaults={mesh:true,wireframe:false,colliders:false,joints:false,floor:true,grid:true,velocity:false,commands:false};
      const settings=async all=>{for(const key of keys)await toggle(key,all?true:defaults[key]);};
      await open();const physical=initial.final;
      for(const key of keys){await toggle(key,!defaults[key]);assert.deepEqual((await read()).final,physical);await toggle(key,defaults[key]);}
      assert.equal(initial.inspection.resources,0);await settings(true);await page.locator('#inspectMode').check();
      for(const mode of ['perspective','front','side','top']){
        const view=(await read()).viewports.views.find(v=>v.id===mode),head=view.parts.find(p=>p.id==='head').screen;
        await page.mouse.click(head.x,head.y);const selected=await read();
        assert.equal(selected.inspection.selected,'head');assert.equal(selected.final.grab.active,false);assert.deepEqual(selected.final,physical);
        assert.equal(selected.inspection.readout.body_id,'head');assert.equal(selected.inspection.readout.joints[0].id,'neck');
      }
      await page.locator('#inspectBody').selectOption('footL');await page.locator('#inspectJoint').selectOption('ankleL');
      const foot=await read();assert.equal(foot.inspection.readout.floor_relation,'separated');assert.ok(Math.abs(foot.inspection.readout.floor_gap.value-.02)<1e-6);
      assert.equal(foot.inspection.readout.foot_load.value,null);assert.equal(foot.inspection.readout.first_contact_time.value,null);
      await page.locator('#step').click();const stepped=await read();assert.equal(stepped.inspection.readout.step,1);assert.equal(stepped.final.steps,1);
      await page.locator('#mark').click();const downloadPromise=page.waitForEvent('download');await page.locator('#feedbackExport').click();
      const download=await downloadPromise,filename=path.join(out,'inspection-feedback.json');await download.saveAs(filename);
      const payload=JSON.parse(await fs.readFile(filename,'utf8'));assert.equal(payload.observation.browser.inspection.readout.step,payload.observation.step);
      assert.equal(payload.observation.browser.inspection.readout.body_id,'footL');
      await page.screenshot({path:path.join(out,'inspection-quad.png')});
      await page.locator('#reset').click();assert.equal((await read()).inspection.selected,null);assert.equal((await read()).inspection.readout,null);
      // Exact native browser parity at 40 steps with all display settings, inspector and vectors off/on.
      await settings(false);await page.locator('#inspectMode').uncheck();
      const advance=()=>page.evaluate(()=>{for(let i=0;i<40;i++)document.getElementById('step').click();return uprightDiagnostics().final;});
      const without=await advance();await page.locator('#reset').click();await settings(true);await page.locator('#inspectBody').selectOption('pelvis');
      const withDisplay=await advance();assert.deepEqual(withDisplay,without);
      const command=await read();assert.equal(command.inspection.readout.assist.support.quality,'command');assert.ok(command.inspection.readout.assist.support.value>0);
      assert.equal(command.inspection.readout.joints[0].motor.cap.quality,'command');assert.equal(command.inspection.readout.joints[0].motor.solver_torque.value,null);
      // Inspect while running and switch modes without reactivating or cancelling the physical assist.
      await page.locator('#inspectMode').check();await page.locator('#play').click();
      const h=(await read()).parts.find(p=>p.id==='head').screen;await page.mouse.click(h.x,h.y);
      assert.equal((await read()).final.assisted,true);assert.equal((await read()).final.grab.active,false);
      await page.locator('#play').click();await page.locator('#cameraSingle').click();await page.locator('#cameraFront').click();
      await page.screenshot({path:path.join(out,'inspection-single.png')});await page.locator('#cameraQuad').click();
      // Bounded native GPU-resource proxies across resetting and toggling every overlay.
      await page.locator('#reset').click();await page.locator('#inspectBody').selectOption('pelvis');await page.waitForTimeout(100);const memory=(await read()).rendererMemory;
      for(let i=0;i<5;i++){await settings(false);await settings(true);await page.locator('#reset').click();await page.locator('#inspectBody').selectOption('pelvis');await page.waitForTimeout(100);assert.deepEqual((await read()).rendererMemory,memory);}
      // Read-only cost comparison: all overlays plus inspector, same running scene.
      const costs={},summary=(a,key)=>{const v=a.map(x=>x[key]).filter(Number.isFinite).sort((a,b)=>a-b);return {median:v[Math.floor(v.length*.5)],p95:v[Math.floor(v.length*.95)],samples:v.length};};
      for(const on of [false,true]){
        await settings(on);await toggle('wireframe',false);await page.locator('#reset').click();if(on)await page.locator('#inspectBody').selectOption('pelvis');
        await page.locator('#play').click();await page.waitForTimeout(2200);const d=await read(),samples=d.renderSamples.filter(s=>s.step>20).slice(-120);
        assert.equal(d.final.invalid,null);assert.ok(d.final.steps>=90&&d.final.steps<=160);assert.ok(samples.length>=50);
        costs[on?'on':'off']={steps:d.final.steps,cpuMs:summary(samples,'cpuMs'),renderSubmitMs:summary(samples,'renderSubmitMs'),intervalMs:summary(samples,'intervalMs'),calls:samples.at(-1).calls,triangles:samples.at(-1).triangles,memory:d.rendererMemory};
        await page.locator('#play').click();
      }
      await fs.writeFile(path.join(out,'inspection-costs.json'),JSON.stringify({identity,costs},null,2));console.log('Inspection costs',JSON.stringify(costs));
      // Stress view: actual strong-push fall, non-contact/safety/command fields remain separate.
      await page.locator('#reset').click();await page.locator('#inspectBody').selectOption('pelvis');await page.locator('#play').click();await page.locator('#strong').click();await page.waitForTimeout(1600);await page.locator('#play').click();
      const fallen=await read();assert.equal(fallen.inspection.readout.run.assist_enabled,false);assert.equal(fallen.inspection.readout.assist.support.value,0);
      for(const mode of ['perspective','front','side','top']){await page.locator('#'+({perspective:'cameraPerspective',front:'cameraFront',side:'side',top:'cameraTop'}[mode])).click();await page.locator('#cameraFrame').click();}
      await page.screenshot({path:path.join(out,'inspection-fallen.png')});await page.locator('#reset').click();
      // Small single-view touch inspection works while paused, then grab still works when inspect is disabled.
      await page.setViewportSize({width:744,height:360});await page.locator('#cameraSingle').click();await page.locator('#cameraFront').click();
      await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});await page.locator('#inspectMode').check();
      const touchHead=(await read()).parts.find(p=>p.id==='head').screen;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchHead.x,y:touchHead.y}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal((await read()).inspection.selected,'head');assert.equal((await read()).final.steps,0);
      assert.equal((await read()).final.grab.active,false);await page.locator('#inspectMode').uncheck();await page.locator('#play').click();
      const gripHead=(await read()).parts.find(p=>p.id==='head').screen;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:gripHead.x,y:gripHead.y}]});assert.equal((await read()).final.grab.active,true);assert.equal(await page.locator('#inspectMode').isDisabled(),true);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.locator('#reset').click();await page.locator('#inspectBody').selectOption('head');
      await page.screenshot({path:path.join(out,'inspection-landscape.png')});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      const uiText=await page.evaluate(()=>document.body.innerText+' '+[...document.querySelectorAll('[aria-label],[title],[placeholder]')].map(e=>e.getAttribute('aria-label')||e.title||e.placeholder).join(' '));
      assert.ok(!/\b(Kamera|Schritt|K?rper|Gelenke|Sicherheitsstopp|Hilfe|markieren|verf?gbar|Pausiert|Start erforderlich)\b/.test(uiText));assert.equal(await page.locator('html').getAttribute('lang'),'en');
      await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await page.setViewportSize({width:1280,height:720});
      await settings(false);await page.locator('#inspectBody').selectOption('');await page.locator('#cameraPerspective').click();await page.locator('#cameraQuad').click();await page.locator('#inspectionPanel').evaluate(e=>{e.open=false;});
      checks.push('Issue102: separate shared display toggles, all-view inspect picking without physics input; stable body/joint IDs, explicit units/sources/unavailable load, current marker payload; exact 40 native-step display parity; zero-effect paused selection; opt-in vectors/strong-push stress; bounded resources; small-view touch inspect and grab; English touched UI; measured overlay CPU submission/frame costs');
    }
    if(process.argv.includes('--issue101')){
      const buttons={perspective:'cameraPerspective',front:'cameraFront',side:'side',top:'cameraTop'};
      const initialPhysics=initial.final,memory=initial.rendererMemory;
      const views=d=>d.viewports.views;
      const pose=c=>({position:c.position,quaternion:c.quaternion,target:c.target,zoom:c.zoom});
      for(const id of ['cameraQuad','cameraSingle',...Object.values(buttons)]){const r=await page.locator('#'+id).boundingBox();assert.ok(r.y>=0&&r.y+r.height<=720,'layout and camera switches visible on entry');}
      assert.equal(initial.viewports.layout,'quad');assert.deepEqual(views(initial).map(v=>v.id),Object.keys(buttons));
      assert.equal(await page.locator('canvas').count(),1);assert.equal(await page.locator('.cameraSurface:visible').count(),4);
      await page.locator('summary').filter({hasText:'Camera'}).click();
      for(const [mode,id] of Object.entries(buttons)){
        await page.locator('#'+id).click();const d=await read(),v=views(d).find(v=>v.id===mode);
        const rect=await page.locator('[data-camera='+mode+']').boundingBox();
        const before=Object.fromEntries(views(d).map(v=>[v.id,pose(v.camera)]));
        const x=rect.x+rect.width*.3,y=rect.y+rect.height*.4;
        await page.mouse.move(x,y);await page.mouse.down({button:'right'});
        assert.equal(await page.locator('#cameraSingle').isDisabled(),true);
        // A keyboard/programmatic layout attempt during camera drag cannot hide its capture surface.
        await page.evaluate(()=>document.getElementById('cameraSingle').onclick());
        assert.equal((await read()).viewports.layout,'quad');
        await page.mouse.move(x+35,y+20,{steps:3});await page.mouse.up({button:'right'});
        await page.mouse.wheel(0,90);const after=await read();
        assert.notDeepEqual(pose(views(after).find(v=>v.id===mode).camera),before[mode]);
        for(const other of views(after).filter(v=>v.id!==mode))assert.deepEqual(pose(other.camera),before[other.id],'unhit cameras unchanged');
        assert.deepEqual(after.final,initialPhysics);
        const saved=pose(after.observationCamera);
        await page.locator('#cameraSingle').click();assert.equal((await read()).viewports.layout,'single');
        assert.equal(await page.locator('.cameraSurface:visible').count(),1);assert.deepEqual(pose((await read()).observationCamera),saved);
        await page.locator('#cameraQuad').click();assert.deepEqual(pose((await read()).observationCamera),saved);
        await page.locator('#cameraReset').click();await page.locator('#cameraFrame').click();
        await page.locator('#play').click();const head=views(await read()).find(v=>v.id===mode).parts.find(p=>p.id==='head').screen;
        await page.mouse.move(head.x,head.y);await page.mouse.down();const grip=await read();assert.equal(grip.final.grab.active,true);
        assert.equal(grip.final.grab.body,grip.final.parts.find(p=>p.id==='head').handle);
        assert.equal(await page.locator('#cameraSingle').isDisabled(),true);
        await page.evaluate(()=>{document.getElementById('cameraSingle').onclick();document.getElementById('cameraTop').onclick();});
        assert.equal((await read()).viewports.layout,'quad');assert.equal((await read()).viewports.selected,mode);
        await page.setViewportSize({width:1281,height:721});assert.equal((await read()).final.grab.active,true);
        // Capture keeps the original camera/ray even when dragging across a different viewport.
        const otherRect=await page.locator('[data-camera='+(mode==='top'?'front':'top')+']').boundingBox();
        await page.mouse.move(otherRect.x+otherRect.width/2,otherRect.y+otherRect.height/2,{steps:4});
        assert.equal((await read()).viewports.selected,mode);assert.equal((await read()).final.grab.active,true);
        await page.mouse.up();assert.equal((await read()).final.grab.active,false);assert.equal((await read()).cameraPointers,0);
        await page.setViewportSize({width:1280,height:720});await page.locator('#reset').click();assert.deepEqual((await read()).rendererMemory,memory);
      }
      // Keyboard selection, exact one-step synchronization, reset keeps cameras but replaces run/world.
      await page.locator('[data-camera=front]').focus();await page.keyboard.press('Enter');assert.equal((await read()).viewports.selected,'front');
      const beforeStep=await read();await page.locator('#step').click();const stepped=await read();
      assert.equal(stepped.final.steps,beforeStep.final.steps+1);assert.ok(views(stepped).every(v=>v.step===stepped.final.steps));
      const run=stepped.runIdentity.run_id;await page.locator('#reset').click();assert.notEqual((await read()).runIdentity.run_id,run);
      assert.deepEqual(views(await read()).map(v=>pose(v.camera)),views(beforeStep).map(v=>pose(v.camera)));
      for(let i=0;i<6;i++){await page.locator('#cameraSingle').click();await page.locator('#cameraQuad').click();await page.locator('#reset').click();}
      assert.deepEqual((await read()).rendererMemory,memory);
      await page.screenshot({path:path.join(out,'quad-desktop.png')});
      await page.locator('#mark').click();const downloadPromise=page.waitForEvent('download');await page.locator('#feedbackExport').click();
      const download=await downloadPromise,file=path.join(out,'quad-feedback.json');await download.saveAs(file);
      const payload=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(payload.observation.browser.viewports.layout,'quad');assert.equal(payload.observation.browser.viewports.cameras.length,4);
      // Read-only CPU submission/frame cost, same scene and shared running simulation. No GPU-time claim.
      const costs={};const summary=(samples,key)=>{const a=samples.map(s=>s[key]).filter(Number.isFinite).sort((a,b)=>a-b);return {median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],samples:a.length};};
      for(const layout of ['single','quad']){
        await page.locator('#'+(layout==='single'?'cameraSingle':'cameraQuad')).click();await page.locator('#reset').click();await page.locator('#play').click();
        await page.waitForTimeout(2200);const d=await read(),samples=d.renderSamples.filter(s=>s.layout===layout&&s.step>20).slice(-120);
        assert.ok(samples.length>=50);assert.ok(d.final.steps>80&&d.final.steps<180,'one physics clock, not multiplied by views');
        assert.ok(views(d).every(v=>v.step===d.final.steps));assert.equal(d.final.invalid,null);
        costs[layout]={steps:d.final.steps,tickMs:summary(samples,'tickMs'),cpuMs:summary(samples,'cpuMs'),renderSubmitMs:summary(samples,'renderSubmitMs'),intervalMs:summary(samples,'intervalMs'),calls:samples.at(-1).calls,triangles:samples.at(-1).triangles};
        await page.locator('#play').click();await page.locator('#reset').click();
      }
      await fs.writeFile(path.join(out,'viewport-costs.json'),JSON.stringify({identity,costs},null,2));console.log('Viewport costs',JSON.stringify(costs));
      // Automatic layout on a fresh document; manually chosen layouts persist across resize.
      await page.reload();await page.waitForFunction(()=>window.uprightDiagnostics);
      await page.setViewportSize({width:744,height:360});await page.waitForFunction(()=>uprightDiagnostics().viewports.layout==='single');
      await page.locator('aside').evaluate(a=>{a.scrollTop=0;});
      for(const id of ['cameraQuad','cameraSingle',...Object.values(buttons)]){const r=await page.locator('#'+id).boundingBox();assert.ok(r.y>=0&&r.y+r.height<=360,'mobile camera/layout switches visible');}
      await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
      await page.locator('summary').filter({hasText:'Camera'}).click();await page.locator('#cameraMode').check();
      await page.locator('#cameraFront').click();let r=await page.locator('[data-camera=front]').boundingBox();const x=r.x+r.width*.3,y=r.y+r.height*.3;
      const preTouch=(await read()).observationCamera;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y},{x:x+40,y}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-15,y:y+10},{x:x+60,y:y+10}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.notEqual((await read()).observationCamera.zoom,preTouch.zoom);
      await page.locator('#cameraMode').uncheck();await page.locator('#cameraFrame').click();await page.locator('#play').click();
      const head=(await read()).parts.find(p=>p.id==='head').screen;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:head.x,y:head.y}]});assert.equal((await read()).final.grab.active,true);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.locator('#reset').click();
      await page.screenshot({path:path.join(out,'single-landscape.png')});
      await page.locator('#cameraQuad').click();assert.equal(await page.locator('.cameraSurface:visible').count(),4);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.join(out,'quad-small.png')});
      await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await page.setViewportSize({width:1281,height:721});
      assert.equal((await read()).viewports.layout,'quad');
      // DPR cap and viewport rectangles in CSS space, using a separate confirmed-Chrome context.
      const dense=await browser.newContext({viewport:{width:1281,height:721},deviceScaleFactor:2}),densePage=await dense.newPage();
      await densePage.goto(arg('--url'));await densePage.waitForFunction(()=>window.uprightDiagnostics);
      const dd=await densePage.evaluate(()=>({d:uprightDiagnostics(),buffer:{w:document.querySelector('canvas').width,h:document.querySelector('canvas').height},css:{w:document.querySelector('canvas').clientWidth,h:document.querySelector('canvas').clientHeight}}));
      assert.equal(dd.d.environment.renderDpr,1.5);assert.equal(dd.buffer.w,Math.floor(dd.css.w*1.5));assert.equal(dd.buffer.h,Math.floor(dd.css.h*1.5));
      assert.ok(views(dd.d).every(v=>v.camera.projection.every(Number.isFinite)));await dense.close();await page.bringToFront();
      await page.setViewportSize({width:1280,height:720});await page.locator('#cameraPerspective').click();await page.locator('#play').click();await page.locator('#strong').click();await page.waitForTimeout(1500);await page.locator('#play').click();
      for(const id of Object.values(buttons)){await page.locator('#'+id).click();await page.locator('#cameraFrame').click();}
      await page.screenshot({path:path.join(out,'quad-fallen.png')});await page.locator('#reset').click();
      const teardownRect=await page.locator('[data-camera=top]').boundingBox();await page.mouse.move(teardownRect.x+20,teardownRect.y+50);await page.mouse.down({button:'right'});
      await page.reload();await page.mouse.up({button:'right'});await page.waitForFunction(()=>window.uprightDiagnostics);assert.equal((await read()).cameraPointers,0);assert.deepEqual((await read()).rendererMemory,memory);
      await page.locator('summary').filter({hasText:'Camera'}).click();
      // Leave the legacy shared UI regression in a large single perspective view.
      await page.locator('#cameraPerspective').click();await page.locator('#cameraSingle').click();await page.locator('#cameraReset').click();
      await page.locator('summary').filter({hasText:'Camera'}).click();
      checks.push('Issue101: one canvas/shared step, four simultaneous views; viewport-only orbit/pan/zoom; mouse head picking/capture across boundaries; guarded view changes; camera retention, keyboard selection, resize/DPR2 cap, mobile single/touch and explicit quad; bounded reset resources; actual feedback includes all cameras; measured single/quad CPU submission and foreground frame intervals');
    }
    if(process.argv.includes('--issue100')){
      const buttons={perspective:'cameraPerspective',front:'cameraFront',side:'side',top:'cameraTop'},saved={};
      for(const id of Object.values(buttons)){const r=await page.locator('#'+id).boundingBox();assert.ok(r.y>=0&&r.y+r.height<=720,'view switches visible on entry');}
      const physics=initial.final,memory=initial.rendererMemory;
      await page.locator('summary').filter({hasText:'Camera'}).click();
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
      await page.locator('summary').filter({hasText:'Camera'}).click();
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
      await page.locator('summary').filter({hasText:'Camera'}).click();await page.locator('#side').click();
      const camera=(await read()).observationCamera,memory=(await read()).rendererMemory;
      for(let i=0;i<5;i++){
        const before=await read();await page.locator('#reset').click();const after=await read();
        assert.notEqual(after.runIdentity.run_id,before.runIdentity.run_id);assert.equal(after.final.steps,0);
        assert.equal(after.pointerId,null);assert.equal(after.pending,null);assert.equal(after.final.grab.active,false);
        assert.deepEqual(after.rendererMemory,memory);assert.deepEqual(after.observationCamera,camera);
        assert.equal(after.final.counts.bodies,15);assert.equal(await page.locator('#feedbackExport').isDisabled(),true);
      }
      await page.locator('summary').filter({hasText:'Camera'}).click();
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
    await page.locator('summary').filter({hasText:'Technical details'}).click();
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
    await page.locator('summary').filter({hasText:'Camera'}).click();const physical=(await read()).final;
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

// Targeted native production UI QA; no physics study, controller writes or G2 acceptance.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const arg=name=>process.argv[process.argv.indexOf(name)+1];
async function main(){
 if(!process.argv.includes('--executable')||!process.argv.includes('--url'))throw Error('Confirmed --executable and --url required');
 const out=await fs.mkdtemp(path.join(os.tmpdir(),'goblin-anchor-gap-'));
 const browser=await chromium.launch({executablePath:arg('--executable'),headless:false,args:['--enable-automation'],ignoreDefaultArgs:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
 const context=await browser.newContext({viewport:{width:1280,height:720},acceptDownloads:true}),page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)requests.push(r.url());});
 const read=()=>page.evaluate(()=>uprightDiagnostics()),toggle=on=>page.locator('[data-inspection=anchorGap]').setChecked(on);
 const exact=async()=>page.waitForFunction(()=>{const d=uprightDiagnostics();return d.inspection.anchorGap?.step===d.final.steps&&(!d.inspection.readout||d.inspection.readout.step===d.final.steps);});
 const result={checks:[],costs:[],errors,requests};
 try{
 await page.goto(arg('--url'));await page.waitForFunction(()=>window.uprightDiagnostics);await page.bringToFront();const initial=await read();
 const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');const launch=await cdp.send('Browser.getBrowserCommandLine');
 result.identity={version:browser.version(),executable:arg('--executable'),profile:'own temporary Playwright profile',launchArguments:launch.arguments.map(a=>a.startsWith('--user-data-dir=')?'--user-data-dir=<temporary>':a),url:arg('--url'),environment:initial.environment,build:initial.build};
 assert.equal(initial.inspection.settings.anchorGap,false);assert.equal(initial.inspection.anchorGap,null);assert.equal(initial.inspection.resources,0);
 await page.locator('#inspectionPanel').evaluate(e=>e.open=true);const physical=initial.final;
 await page.locator('[data-inspection=anchorGap]').focus();await page.keyboard.press('Space');await exact();assert.deepEqual((await read()).final,physical);assert.equal((await read()).inspection.resources,1);
 const ids=(await page.locator('#inspectBody option').evaluateAll(es=>es.map(e=>e.value))).filter(Boolean),seen=new Set();
 for(const id of ids){await page.locator('#inspectBody').selectOption(id);const d=await read();for(const j of d.inspection.readout.joints){seen.add(j.id);const sample=d.inspection.anchorGap.joints.find(s=>s.id===j.id);assert.deepEqual(j.anchor_gap,sample.anchor_gap);assert.equal(sample.start,d.inspection.anchorGap.joints.indexOf(sample)*10);}
   for(const id of d.inspection.readout.joints.map(j=>j.id)){await page.locator('#inspectJoint').selectOption(id);const selected=await read(),sample=selected.inspection.anchorGap.joints.find(j=>j.id===id);assert.equal(selected.inspection.selectedJoint,id);const text=await page.locator('#inspectionValues dt').filter({hasText:/^Anchor gap$/}).evaluate(e=>e.nextElementSibling.textContent);assert.ok(text.includes(sample.level.label));assert.ok(text.includes('step '+sample.anchor_gap.step));assert.ok(text.includes('mm'));}
 }
 assert.equal(ids.length,15);assert.equal(seen.size,14);result.checks.push('All15 body segments/all14 connected joints: ID/range/derived mm/step/selected line');
 await page.locator('#inspectBody').selectOption('head');await page.locator('#inspectJoint').selectOption('neck');await page.locator('#step').click();await exact();assert.equal((await read()).final.steps,1);
 await page.locator('aside > details').filter({has:page.locator('summary').filter({hasText:/^Run settings$/})}).evaluate(e=>e.open=true);
 for(const variant of ['B','T1','R1']){await page.locator('#variant').selectOption(variant);await exact();assert.equal((await read()).final.steps,0);assert.equal((await read()).inspection.selected,null);for(let i=0;i<3;i++)await page.locator('#step').click();await exact();await page.locator('#reset').click();await exact();assert.equal((await read()).inspection.anchorGap.joints.length,14);}
 for(const action of ['small','strong']){await page.locator('#reset').click();await page.locator('#inspectBody').selectOption('torso');await page.locator('#play').click();await page.locator('#'+action).click();await page.waitForTimeout(350);await page.locator('#play').click();await exact();const d=await read();assert.equal(d.paused,true);assert.equal(d.inspection.readout.step,d.inspection.anchorGap.step);assert.ok(d.inspection.anchorGap.joints.every(j=>j.anchor_gap.value===null||Number.isFinite(j.anchor_gap.value)));}
 await page.locator('#safetyStop').click();await exact();assert.match(await page.locator('#phaseStatus').innerText(),/Safety/);assert.ok((await read()).inspection.anchorGap);await page.locator('#reset').click();
 result.checks.push('Pause/Step, small/strong push, Safety, reset and fresh B/T1/R1 variants, same closed step');
 for(const layout of ['cameraQuad','cameraSingle']){await page.locator('#'+layout).click();for(const id of ['cameraPerspective','cameraFront','side','cameraTop']){await page.locator('#'+id).click();await page.locator('#cameraFrame').click();await page.locator('#inspectBody').selectOption('head');await exact();assert.equal((await read()).final.steps,0);assert.equal((await read()).inspection.anchorGap.joints.length,14);}}
 await page.locator('#cameraQuad').click();await page.locator('#cameraPerspective').click();await page.locator('#cameraReset').click();await page.locator('#inspectBody').selectOption('head');await page.locator('#inspectJoint').selectOption('neck');
 await page.locator('aside > details').evaluateAll(es=>{for(const e of es)e.open=e.id==='inspectionPanel';});await page.locator('[data-inspection=anchorGap]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'desktop.png')});
 // Actual native grab/hold/release with D1 enabled; no G2 angular acceptance study.
 await page.locator('#play').click();const h=(await read()).viewports.views.find(v=>v.id==='perspective').parts.find(p=>p.id==='head').screen;
 await page.mouse.move(h.x,h.y);await page.mouse.down();assert.equal((await read()).final.grab.active,true);await page.mouse.move(h.x+12,h.y-5,{steps:3});await page.waitForTimeout(120);await page.screenshot({path:path.join(out,'hold.png')});await page.mouse.up();assert.equal((await read()).final.grab.active,false);await page.locator('#play').click();await exact();
 await page.locator('#mark').click();const downloading=page.waitForEvent('download');await page.locator('#feedbackExport').click();const download=await downloading,file=path.join(out,'feedback.json');await download.saveAs(file);const payload=JSON.parse(await fs.readFile(file,'utf8'));assert.deepEqual(payload.data_errors,[]);assert.equal(payload.observation.browser.inspection.anchorGap.step,payload.observation.step);assert.equal(payload.observation.browser.inspection.readout.step,payload.observation.step);
 await page.locator('#reset').click();
 for(const size of [{width:1280,height:720},{width:744,height:360}]){
   await page.setViewportSize(size);await page.locator('#cameraQuad').click();await page.locator('#inspectBody').selectOption('');
   for(const on of [false,true]){await toggle(on);await page.waitForTimeout(2200);await cdp.send('HeapProfiler.collectGarbage');const d=await read(),metrics=await cdp.send('Performance.getMetrics'),s=d.renderSamples.slice(-180),stats=key=>{const xs=s.map(v=>v[key]).sort((a,b)=>a-b);return {median:xs[Math.floor(xs.length/2)],p95:xs[Math.floor(xs.length*.95)]};};
     result.costs.push({size,on,step:d.final.steps,samples:s.length,resources:d.inspection.resources,memory:d.rendererMemory,calls:d.renderSamples.at(-1).calls,cpuMs:stats('cpuMs'),renderSubmitMs:stats('renderSubmitMs'),intervalMs:stats('intervalMs'),heapUsedBytes:metrics.metrics.find(m=>m.name==='JSHeapUsedSize').value});}
 }
 await page.locator('#cameraSingle').click();await page.locator('#cameraFront').click();await page.locator('#cameraFrame').click();await page.locator('#inspectMode').check();await page.locator('#inspectBody').selectOption('head');
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});const p=(await read()).parts.find(p=>p.id==='head').screen;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal((await read()).inspection.selected,'head');assert.equal((await read()).final.grab.active,false);await page.locator('#inspectJoint').selectOption('neck');await exact();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(out,'landscape.png')});
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await page.locator('#inspectMode').uncheck();await page.setViewportSize({width:1280,height:720});await page.locator('#cameraQuad').click();
 for(let i=0;i<12;i++){await page.locator('#reset').click();await toggle(false);assert.equal((await read()).inspection.resources,0);await toggle(true);assert.equal((await read()).inspection.resources,1);}
 await toggle(false);assert.match(await page.locator('#anchorGapStatus').innerText(),/OFF/);assert.equal((await read()).inspection.anchorGap,null);
 result.checks.push('All Quad/Single cameras, native hold/release, keyboard toggle, emulated touch inspection, small landscape,12 reset/toggle cycles with zero retained overlay resources');
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);result.status='PASS';
 }catch(e){result.status='FAIL';result.failure=e.stack;throw e;}
 finally{await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({out,...result},null,2));await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

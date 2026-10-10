// Targeted native Windows production QA, not G2/Hidden/Resume acceptance.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const arg=name=>process.argv[process.argv.indexOf(name)+1],ids=['head','torso','pelvis','handL','handR','footL','footR'];
async function main(){
 if(!process.argv.includes('--url')||!process.argv.includes('--executable'))throw Error('Verified --url and --executable required');
 const out=await fs.mkdtemp(path.join(os.tmpdir(),'goblin-trails-'));
 const browser=await chromium.launch({executablePath:arg('--executable'),headless:false,args:['--enable-automation'],ignoreDefaultArgs:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
 const context=await browser.newContext({viewport:{width:1280,height:720},acceptDownloads:true}),page=await context.newPage(),errors=[],requests=[],result={checks:[],costs:[],errors,requests};
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)requests.push(r.url());});
 const read=()=>page.evaluate(()=>uprightDiagnostics()),toggle=(id,on)=>page.locator('[data-trail="'+id+'"]').setChecked(on),settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 try{
 await page.goto(arg('--url'));await page.waitForFunction(()=>window.uprightDiagnostics);await page.bringToFront();const initial=await read();
 const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');const command=await cdp.send('Browser.getBrowserCommandLine');
 result.identity={version:browser.version(),executable:arg('--executable'),profile:'own temporary Playwright profile',launchArguments:command.arguments.map(a=>a.startsWith('--user-data-dir=')?'--user-data-dir=<temporary>':a),url:arg('--url'),environment:initial.environment,build:initial.build};
 assert.equal(initial.trails.enabled,false);assert.equal(initial.trails.count,0);assert.equal(initial.trails.resources,0);
 await page.locator('#inspectionPanel').evaluate(e=>e.open=true);await page.locator('#trailPanel').evaluate(e=>e.open=true);
 await page.locator('[data-trail=enabled]').focus();await page.keyboard.press('Space');const enabled=await read();assert.deepEqual(enabled.final,initial.final);assert.equal(enabled.trails.count,1);assert.deepEqual(enabled.trails.visible,['head','footL','footR']);
 for(let i=0;i<4;i++)await page.locator('#step').click();assert.equal((await read()).trails.count,5);
 const paused=await read();await page.waitForTimeout(300);assert.deepEqual((await read()).trails,paused.trails);
 for(const mode of ['cameraQuad','cameraSingle']){await page.locator('#'+mode).click();for(const id of ['cameraPerspective','cameraFront','side','cameraTop']){await page.locator('#'+id).click();await page.locator('#cameraFrame').click();await settle();assert.deepEqual((await read()).trails,paused.trails);}}
 // World-coordinate endpoint/reference from all IDs; none of the hidden bodies lost data.
 for(const l of paused.trails.lines){const p=paused.final.parts.find(p=>p.id===l.id).position;assert.deepEqual(l.points.at(-1).position,[p.x,p.y,p.z]);assert.deepEqual(l.points.map(p=>p.step),[0,1,2,3,4]);}
 await page.locator('#cameraQuad').click();await page.locator('#cameraPerspective').click();await page.locator('#cameraReset').click();
 await page.locator('#play').click();await page.waitForFunction(()=>uprightStepState().steps>=660,{},{timeout:30000});await page.locator('#play').click();const full=await read();assert.equal(full.final.invalid,null);assert.equal(full.trails.count,600);assert.equal(full.trails.oldestStep,full.final.steps-599);
 for(const l of full.trails.lines){assert.equal(l.points.length,600);assert.equal(l.points.at(-1).step,full.final.steps);assert.ok(l.points.every((p,i)=>p.time_s===p.step/60&&(!i||p.step===l.points[i-1].step+1)));}
 await page.locator('#trailSeconds').selectOption('10');for(const id of ids)await toggle(id,true);await toggle('monochrome',true);assert.equal((await read()).trails.count,600);await toggle('monochrome',false);
 await page.locator('#play').click();await page.locator('#strong').click();await page.waitForTimeout(700);await page.locator('#play').click();const stress=await read();assert.equal(stress.final.invalid,null);
 for(const mode of ['cameraQuad','cameraSingle']){await page.locator('#'+mode).click();for(const id of ['cameraPerspective','cameraFront','side','cameraTop']){await page.locator('#'+id).click();await page.locator('#cameraFrame').click();await settle();assert.deepEqual((await read()).trails,stress.trails);}}
 await page.locator('#cameraQuad').click();await page.locator('#cameraPerspective').click();await page.locator('#cameraFrame').click();
 await page.locator('#mark').click();const marked=await read();assert.equal(marked.final.steps,stress.final.steps);assert.equal(marked.trails.count,600);
 const downloading=page.waitForEvent('download');await page.locator('#feedbackExport').click();const download=await downloading,file=path.join(out,'feedback.json');await download.saveAs(file);const payload=JSON.parse(await fs.readFile(file,'utf8'));assert.deepEqual(payload.data_errors,[]);assert.equal(payload.observation.step,stress.final.steps);
 await page.locator('#inspectionPanel').evaluate(e=>e.open=true);await page.locator('#trailPanel').evaluate(e=>e.open=true);await page.locator('[data-trail=enabled]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'desktop.png')});
 result.checks.push('Default OFF, keyboard enable, initial+single steps, paused/camera/marker zero duplicates, all7 native origins, 600 ring on unrestricted run, feedback export');
 // Full 600-step geometry, paused and active; CPU submit is not GPU time/FPS. No concurrent tests.
 for(const size of [{width:1280,height:720},{width:744,height:360}]){
   await page.setViewportSize(size);await settle();await page.locator('#cameraQuad').click();
   for(const state of ['paused','running']){
   for(const lines of [1,7]){
     for(const id of ids)await toggle(id,lines===7||id==='head');await page.bringToFront();if(state==='running')await page.locator('#play').click();await page.waitForTimeout(3300);
     const gcStart=performance.now();await cdp.send('HeapProfiler.collectGarbage');const gcRoundTripMs=performance.now()-gcStart,d=await read(),metrics=await cdp.send('Performance.getMetrics'),s=d.renderSamples.slice(-180),stats=key=>{const xs=s.map(v=>v[key]).filter(Number.isFinite).sort((a,b)=>a-b);return {median:xs[Math.floor(xs.length/2)],p95:xs[Math.floor(xs.length*.95)]};};
     assert.equal(d.final.invalid,null);result.costs.push({size,state,lines,paused:d.paused,step:d.final.steps,samples:s.length,historySeconds:d.trails.seconds,positionsPerBody:d.trails.count,storageBytes:d.trails.storageBytes,bufferBytes:d.trails.bufferBytes,resources:d.trails.resources,memory:d.rendererMemory,calls:s.at(-1).calls,cpuMs:stats('cpuMs'),renderSubmitMs:stats('renderSubmitMs'),intervalMs:stats('intervalMs'),heapUsedBytes:metrics.metrics.find(m=>m.name==='JSHeapUsedSize').value,forcedGcProtocolRoundTripMs:gcRoundTripMs});
     if(state==='running')await page.locator('#play').click();
   }
   }
 }
 for(let i=0;i<result.costs.length;i+=2)assert.equal(result.costs[i+1].calls-result.costs[i].calls,24);
 await page.locator('#cameraSingle').click();await page.locator('#cameraFront').click();await page.locator('#cameraFrame').click();await settle();
 await toggle('monochrome',true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.locator('[data-trail=enabled]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'landscape.png')});
 await page.locator('#reset').click();await page.locator('#cameraFrame').click();await settle();
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});await page.locator('#inspectMode').check();await settle();const h=(await read()).parts.find(p=>p.id==='head').screen;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:h.x,y:h.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal((await read()).inspection.selected,'head');assert.equal((await read()).final.grab.active,false);
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await page.locator('#inspectMode').uncheck();await page.setViewportSize({width:1280,height:720});await settle();await page.locator('#reset').click();
 await page.locator('#cameraPerspective').click();await page.locator('#cameraFrame').click();await settle();await page.locator('#play').click();const screen=(await read()).parts.find(p=>p.id==='head').screen;
 await page.mouse.move(screen.x,screen.y);await page.mouse.down();assert.equal((await read()).final.grab.active,true);await page.mouse.move(screen.x+16,screen.y-8,{steps:3});await page.waitForTimeout(120);await page.screenshot({path:path.join(out,'hold.png')});await page.mouse.up();assert.equal((await read()).final.grab.active,false);await page.locator('#play').click();
 await page.locator('#cameraMode').check();const viewport=(await read()).viewports.views[0];await page.mouse.move(viewport.x+30,viewport.y+180);await page.mouse.down();await page.mouse.move(viewport.x+80,viewport.y+190,{steps:3});await page.mouse.up();await page.locator('#cameraMode').uncheck();assert.equal((await read()).final.grab.active,false);
 await page.locator('#safetyStop').click();assert.match(await page.locator('#phaseStatus').innerText(),/Safety/);const safety=await read();await page.waitForTimeout(150);assert.deepEqual((await read()).trails,safety.trails);
 await page.locator('aside > details').filter({has:page.locator('summary').filter({hasText:/^Run settings$/})}).evaluate(e=>e.open=true);
 for(const variant of ['B','T1','R1']){await page.locator('#variant').selectOption(variant);const d=await read();assert.equal(d.final.steps,0);assert.equal(d.trails.count,1);assert.ok(d.trails.lines.every(l=>l.points.length===1&&l.points[0].initial));assert.equal(d.trails.resources,8);}
 const memories=[];
 for(let i=0;i<12;i++){await page.locator('#reset').click();await toggle('enabled',false);await settle();assert.equal((await read()).trails.resources,0);memories.push((await read()).rendererMemory.geometries);await toggle('enabled',true);assert.equal((await read()).trails.count,1);}
 assert.ok(memories.every(n=>n===memories[0]));result.resetGeometryCounts=memories;
 await page.locator('#play').click();await page.waitForTimeout(150);await toggle('enabled',false);await page.waitForTimeout(150);const off=await read();assert.equal(off.trails.count,0);await toggle('enabled',true);await page.locator('#play').click();const resumed=await read();assert.ok(resumed.trails.lines.every(l=>l.points.every(p=>p.step>off.final.steps&&!p.initial)));
 result.checks.push('1vs7 real draw/CPU/heap proxies desktop+landscape, monochrome, touch inspection, native grab/release, camera gesture, Safety,3 variants,12 reset/OFF cycles, no mid-run backfill');
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);result.status='PASS';
 }catch(e){result.status='FAIL';result.failure=e.stack;throw e;}
 finally{await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({out,...result},null,2));await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

// Manual UI QA only, never a research runner or npm-test campaign.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const arg=name=>process.argv[process.argv.indexOf(name)+1];
async function main(){
  if(!process.argv.includes('--executable')||!process.argv.includes('--url'))throw Error('Confirmed --executable and reachable --url required; no fallback');
  const out=await fs.mkdtemp(path.join(os.tmpdir(),'goblin-playground-qa-'));
  const browser=await chromium.launch({executablePath:arg('--executable'),headless:false,args:['--enable-automation']});
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
      await page.waitForTimeout(100);assert.deepEqual((await read()).final.parts,paused.final.parts);assert.equal((await read()).final.assisted,false);
      await page.locator('#reset').click();assert.equal((await read()).final.steps,0);assert.equal((await read()).final.assisted,true);
    }
    checks.push('B/T1/R1 fresh runs, small pushes, pause and reset');
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
    assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
    await fs.writeFile(path.join(out,'result.json'),JSON.stringify({identity,checks,errors,requests,feedbackFile:path.basename(file)},null,2));
    console.log(JSON.stringify({out,build:initial.build.build_id,checks,errors,requests}));
  }finally{await context.close();await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

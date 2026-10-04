// Built artifact only; ephemeral server, no existing processes or ports touched.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const os=require('node:os');
const {chromium}=require('playwright');

async function main(){
  const {compareResults}=await import('../src/labs/standing/compare.js');
  const {validateResultProvenance}=await import('../src/labs/standing/config.js');
  const {standingBuild}=await import('../scripts/standing-provenance.js');
  const harness=standingBuild();
  const directory=process.env.GOBLIN_STANDING_EVIDENCE_DIR||'docs/research/standing-lab';
  fs.mkdirSync(directory,{recursive:true});
  const root=path.resolve('dist');
  const server=http.createServer((req,res)=>{
    let relative=new URL(req.url,'http://local').pathname.replace(/^\/goblin\//,'');
    if(!relative||relative.endsWith('/'))relative+='index.html';
    const file=path.resolve(root,relative);
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}/goblin/`;
  let browser;
  try{
    const options={headless:process.env.GOBLIN_HEADED_BROWSER!=='1'};
    if(process.env.GOBLIN_CHROMIUM_EXECUTABLE)options.executablePath=process.env.GOBLIN_CHROMIUM_EXECUTABLE;
    else if(os.platform()==='win32')options.executablePath='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    browser=await chromium.launch(options);
    const context=await browser.newContext({viewport:{width:1280,height:800}});
    const page=await context.newPage(),errors=[],warnings=[],failedResponses=[];
    const monitor=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});p.on('response',r=>{if(r.status()>=400)failedResponses.push(r.url());});};
    monitor(page);
    const diag=()=>page.evaluate(()=>standingLab.diagnostics());
    await page.goto(base+'labs/standing/');await page.waitForFunction(()=>window.standingLab);
    const initial=await page.evaluate(()=>standingLab.snapshot());
    assert.equal((await diag()).step,0);
    await page.locator('#step').click();assert.equal((await diag()).step,1);
    await page.locator('#resume').click();await page.waitForFunction(()=>standingLab.diagnostics().step>=10);
    await page.locator('#pause').click();const paused=await diag();
    await page.waitForTimeout(350);assert.equal((await diag()).step,paused.step);
    await page.setViewportSize({width:744,height:360});assert.equal((await diag()).step,paused.step);
    await page.setViewportSize({width:1280,height:800});assert.equal((await diag()).step,paused.step);
    const other=await context.newPage();await other.goto('about:blank');await other.bringToFront();
    await page.waitForTimeout(100);const actualHidden=await page.evaluate(()=>document.hidden);
    await page.bringToFront();await page.waitForTimeout(100);assert.equal((await diag()).step,paused.step);
    // Also verify the installed visibility handler, explicitly separate from native visibility.
    await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
    assert.equal((await diag()).paused,true);await other.close();
    await page.locator('#resume').click();await page.waitForFunction(n=>standingLab.diagnostics().step>n,paused.step);
    await page.locator('#pause').click();const resumed=await diag();assert.ok(resumed.step-paused.step<=6,'resume has bounded work, no pause catch-up');

    await page.locator('#reset').click();assert.deepEqual(await page.evaluate(()=>standingLab.snapshot()),initial);
    const warm=await diag(),resetSamples=[];
    for(let i=0;i<20;i++){
      await page.locator('#step').click();await page.locator('#reset').click();
      await page.evaluate(()=>new Promise(requestAnimationFrame));const d=await diag();resetSamples.push(d);
      assert.equal(d.step,0);assert.equal(d.paused,true);assert.equal(d.invalid,null);assert.notEqual(d.run_id,warm.run_id);
      for(const k of ['bodies','colliders','joints','listeners','geometries','textures','programs'])assert.equal(d[k],warm[k],k+' stable across reset');
    }
    assert.equal(new Set(resetSamples.map(r=>r.run_id)).size,20);
    const rendered=[];
    for(const enabled of [true,false]){
      await page.locator('#reset').click();await page.locator('#render').setChecked(enabled);
      await page.evaluate(async()=>{for(let i=0;i<70;i++){document.querySelector('#step').click();await new Promise(requestAnimationFrame);}});
      const r=await page.evaluate(()=>standingLab.result());await validateResultProvenance(r);rendered.push(r);
      assert.equal(r.termination_reason,'non_foot_contact');assert.equal(r.simulation_steps,70);assert.deepEqual(r.failure_bodies,['handL']);
      await page.locator('#step').click();assert.equal((await diag()).step,70);
    }
    assert.equal(compareResults(rendered[0],rendered[1]).pass,true);
    const nodeBaseline=JSON.parse(fs.readFileSync('docs/research/standing-lab/review-39/baseline/run-1.json','utf8'));
    const nodeComparison=compareResults(nodeBaseline,rendered[0]);assert.equal(nodeComparison.pass,true);
    const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();
    const download=await downloadPromise;const downloaded=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    await validateResultProvenance(downloaded);assert.deepEqual(downloaded,rendered[1]);
    await page.locator('#render').check();await page.evaluate(()=>new Promise(requestAnimationFrame));
    await page.screenshot({path:directory+'/passive-fall.png'});
    await page.reload();await page.waitForFunction(()=>window.standingLab);assert.equal((await diag()).step,0);

    // Issue44: only normal UI modes, with the existing clock and step path.
    const motorResults=[],modeSamples=[];
    const initialPassive=await diag();
    for(let i=0;i<20;i++){
      const mode=i%3===0?'passive':i%3===1?'motor20':'motor1';await page.locator('#mode').selectOption(mode);await page.evaluate(()=>new Promise(requestAnimationFrame));
      const d=await diag();modeSamples.push(d);assert.equal(d.step,0);assert.equal(d.paused,true);assert.equal(d.motor_entries,mode==='passive'?0:14);assert.equal(d.solver,mode==='passive'?8:32);
      assert.equal(d.invalid,null);assert.notEqual(d.run_id,initialPassive.run_id);
      for(const k of ['bodies','colliders','joints','listeners','geometries','textures','programs'])assert.equal(d[k],initialPassive[k],k+' stable on mode changes');
      await page.locator('#step').click();await page.locator('#reset').click();assert.equal((await diag()).step,0);
    }
    await page.locator('#mode').selectOption('motor20');
    const exportRace=await page.evaluate(async()=>{const pending=standingLab.result();const mode=document.querySelector('#mode');mode.value='passive';mode.dispatchEvent(new Event('change'));return {result:await pending,current:standingLab.diagnostics()};});
    await validateResultProvenance(exportRace.result);assert.equal(exportRace.result.schema_version,2);assert.equal(exportRace.result.config.actuation.max_torque_Nm,20);assert.equal(exportRace.current.mode,'passive');assert.equal(exportRace.current.motor_entries,0);

    // Genuine resumed60s simulation; not an accelerated harness standing claim.
    await page.locator('#mode').selectOption('motor20');await page.locator('#step').click();
    await page.locator('#resume').click();await page.waitForFunction(()=>standingLab.diagnostics().step>=10);await page.locator('#pause').click();
    const motorPause=await diag();await page.waitForTimeout(200);assert.equal((await diag()).step,motorPause.step);
    await page.locator('#reset').click();await page.locator('#resume').click();
    const wallStart=Date.now();await page.waitForFunction(()=>standingLab.diagnostics().termination!==null,null,{timeout:180000});
    const motor20WallSeconds=(Date.now()-wallStart)/1000;
    const m20=await page.evaluate(()=>standingLab.result());await validateResultProvenance(m20);assert.equal(m20.simulation_steps,3600);assert.equal(m20.termination_reason,'timeout');assert.equal(m20.standing_time,60);motorResults.push(m20);
    await page.screenshot({path:directory+'/motor20-time-criterion.png'});
    const motorCPU=[{cap:20,samples:await page.evaluate(()=>standingLab.timings())}];
    let promise=page.waitForEvent('download');await page.locator('#export').click();let file=await promise;const downloaded20=JSON.parse(fs.readFileSync(await file.path()));await validateResultProvenance(downloaded20);assert.deepEqual(downloaded20,m20);

    await page.locator('#mode').selectOption('motor1');await page.locator('#resume').click();await page.waitForFunction(()=>standingLab.diagnostics().termination!==null);
    const m1=await page.evaluate(()=>standingLab.result());await validateResultProvenance(m1);assert.equal(m1.simulation_steps,187);assert.deepEqual(m1.failure_bodies,['handL','handR']);assert.equal(m1.standing_time,187/60);motorResults.push(m1);
    await page.waitForTimeout(300);assert.equal((await diag()).step,187,'normal UI never continues after contact');
    motorCPU.push({cap:1,samples:await page.evaluate(()=>standingLab.timings())});await page.screenshot({path:directory+'/motor1-contact-end.png'});
    promise=page.waitForEvent('download');await page.locator('#export').click();file=await promise;await validateResultProvenance(JSON.parse(fs.readFileSync(await file.path())));
    await page.locator('#mode').selectOption('passive');await page.evaluate(()=>{for(let i=0;i<70;i++)document.querySelector('#step').click();});const afterMotor=await page.evaluate(()=>standingLab.result());await validateResultProvenance(afterMotor);assert.equal(afterMotor.schema_version,1);assert.equal(afterMotor.controller_id,'none');assert.equal(compareResults(nodeBaseline,afterMotor).pass,true);
    await page.reload();await page.waitForFunction(()=>window.standingLab);assert.equal((await diag()).mode,'passive');assert.equal((await diag()).step,0);
    const quantiles=xs=>{const s=xs.slice().sort((a,b)=>a-b);return {count:s.length,median:s[Math.floor(s.length/2)],p95:s[Math.floor(s.length*.95)],max:s.at(-1)};};
    const motorCPUSummary=motorCPU.map(({cap,samples})=>({cap,warmup_discarded_steps:20,physics:quantiles(samples.physics.slice(20)),commands:quantiles(samples.commands.slice(20)),observation:quantiles(samples.observation.slice(20)),scope:'Browser wall time; world.step separate from commands/observation, rendering excluded; full trajectory, not Node43 matched60-step benchmark',samples}));

    // Issue48: separate schema3 identities; normal clock/termination, no contact continuation.
    const studyResults=[];
    if(process.env.GOBLIN_MODEL_OUTPUT){
      for(const [label,model,calibrated] of [['force','ForceBased',false],['acceleration','AccelerationBased',false],['calibrated','AccelerationBased',true]])for(const cap of [20,1]){
        const mode=`study-${label}-${cap}`;await page.locator('#mode').selectOption(mode);
        await page.locator('#step').click();await page.locator('#step').click();
        const partial=await page.evaluate(()=>standingLab.result());await validateResultProvenance(partial);
        assert.equal(partial.schema_version,3);assert.equal(partial.simulation_steps,2);assert.equal(partial.config.actuation.model,model);
        await page.locator('#reset').click();assert.equal((await diag()).step,0);
        await page.locator('#resume').click();await page.waitForFunction(()=>standingLab.diagnostics().step>=10||standingLab.diagnostics().termination!==null);
        await page.locator('#pause').click();const stopped=await diag();await page.waitForTimeout(100);assert.equal((await diag()).step,stopped.step);
        await page.locator('#reset').click();await page.locator('#resume').click();
        await page.waitForFunction(()=>standingLab.diagnostics().termination!==null,null,{timeout:180000});
        const result=await page.evaluate(()=>standingLab.result());await validateResultProvenance(result);
        const expected=JSON.parse(fs.readFileSync(`${process.env.GOBLIN_MODEL_OUTPUT}/${model}-${cap}-${calibrated?'calibrated':'numbers'}-normal-1.json`)).result;
        const comparison=compareResults(expected,result);assert.equal(comparison.pass,true);
        const endStep=(await diag()).step;await page.locator('#step').click();assert.equal((await diag()).step,endStep);
        const pending=page.waitForEvent('download');await page.locator('#export').click();const exported=await pending;
        assert.deepEqual(JSON.parse(fs.readFileSync(await exported.path())),result);
        await page.screenshot({path:directory+`/${mode}.png`});
        studyResults.push({mode,result,comparison});
        console.log(JSON.stringify({study_mode:mode,steps:result.simulation_steps,termination:result.termination_reason,browser_node_match:comparison.pass}));
      }
      await page.locator('#mode').selectOption('passive');await page.reload();await page.waitForFunction(()=>window.standingLab);assert.equal((await diag()).mode,'passive');
    }

    const mobileContext=await browser.newContext({viewport:{width:744,height:360},hasTouch:true,isMobile:true,deviceScaleFactor:2});
    const mobile=await mobileContext.newPage();monitor(mobile);await mobile.goto(base+'labs/standing/');await mobile.waitForFunction(()=>window.standingLab);
    await mobile.locator('#step').tap();assert.equal((await mobile.evaluate(()=>standingLab.diagnostics())).step,1);
    await mobile.locator('#reset').tap();assert.equal((await mobile.evaluate(()=>standingLab.diagnostics())).step,0);
    await mobile.locator('#mode').selectOption(process.env.GOBLIN_MODEL_OUTPUT?'study-calibrated-20':'motor1');await mobile.locator('#step').tap();assert.equal((await mobile.evaluate(()=>standingLab.diagnostics())).step,1);
    await mobile.locator('#reset').tap();assert.equal((await mobile.evaluate(()=>standingLab.diagnostics())).motor_entries,14);
    await mobile.screenshot({path:directory+'/motor-mobile-landscape.png'});
    const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
    await mobileContext.close();

    const game=await context.newPage();monitor(game);await game.goto(base+'?debug');await game.waitForFunction(()=>window.goblinDiagnostics);
    await game.locator('#startBtn').click();await game.locator('#resetBtn').click();const gameStart=await game.evaluate(()=>goblinDiagnostics());
    assert.equal(gameStart.parts.length,15);assert.equal(gameStart.time,60);assert.equal(gameStart.score,0);
    const head=gameStart.parts.find(p=>p.id==='head').screen;await game.mouse.click(head.x,head.y);assert.ok((await game.evaluate(()=>goblinDiagnostics())).score>0);
    await game.locator('#resetBtn').click();assert.equal((await game.evaluate(()=>goblinDiagnostics())).score,0);await game.close();
    const disposal=await page.evaluate(()=>{const retained=standingLab;retained.destroy();let rejects=false;try{retained.snapshot();}catch{rejects=true;}return {removed:!window.standingLab,canvasRemoved:document.querySelectorAll('canvas').length===0,retainedRejects:rejects};});
    assert.deepEqual(disposal,{removed:true,canvasRemoved:true,retainedRejects:true});
    assert.deepEqual(errors,[]);assert.deepEqual(failedResponses,[]);
    const report={command:'npm run lab:browser',method:'Playwright direct',playwright_version:require('playwright/package.json').version,executable_path:options.executablePath||chromium.executablePath(),headless:options.headless,harness_provenance:harness,node:process.version,platform:`${os.platform()} ${os.release()} ${os.arch()}`,browser:await browser.version(),mode:(options.headless?'headless':'headed')+' production build; not GPU performance',build_provenance:{git_commit:rendered[0].git_commit,dirty:rendered[0].dirty,build_id:rendered[0].build_id},checks:['Pages direct/reload/assets','pause/resume bounded','single-step','resize while paused','visibility handler','20 fresh resets/counts stable','render on/off','Node/browser checkpoints','failure/export','touch landscape','production start/pointer/reset','destroy/retained refs'],native_tab_hidden_observed:actualHidden,synthetic_visibility_handler_checked:true,resource_samples:resetSamples.map(({generation,bodies,colliders,joints,listeners,geometries,textures,programs})=>({generation,bodies,colliders,joints,listeners,geometries,textures,programs})),standing_time:rendered[0].standing_time,failure_bodies:rendered[0].failure_bodies,node_comparison:nodeComparison,disposal,errors,warnings,failedResponses};
    Object.assign(report,{study_results:studyResults,motor20_wall_seconds:motor20WallSeconds,motor_mode_samples:modeSamples,motor_results:motorResults.map(({config_id,experiment_id,schema_version,simulation_steps,standing_time,failure_bodies,telemetry})=>({config_id,experiment_id,schema_version,simulation_steps,standing_time,failure_bodies,telemetry})),motor_export_race:{old_schema:exportRace.result.schema_version,current_mode:exportRace.current.mode},motor_cpu:motorCPUSummary});
    fs.writeFileSync(directory+'/browser-qa.json',JSON.stringify(report)+'\n');for(const r of motorResults)fs.writeFileSync(directory+`/browser-motor${r.config.actuation.max_torque_Nm}.json`,JSON.stringify(r)+'\n');
    console.log(JSON.stringify({browser:report.browser,build_provenance:report.build_provenance,native_hidden:report.native_tab_hidden_observed,errors,warnings,failedResponses,motor20_wall_seconds:motor20WallSeconds,motor_steps:motorResults.map(r=>r.simulation_steps),motor_cpu:motorCPUSummary.map(({samples,...s})=>s)}));
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

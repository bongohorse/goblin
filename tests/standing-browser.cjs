// Built artifact only; ephemeral server, no existing processes or ports touched.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const os=require('node:os');
const {chromium}=require('playwright');

async function main(){
  const {compareResults}=await import('../src/labs/standing/compare.js');
  const {validateResult}=await import('../src/labs/standing/config.js');
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
    else if(os.platform()==='win32')options.channel='msedge';
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
      const r=await page.evaluate(()=>standingLab.result());validateResult(r);rendered.push(r);
      assert.equal(r.termination_reason,'non_foot_contact');assert.equal(r.simulation_steps,70);assert.deepEqual(r.failure_bodies,['handL']);
      await page.locator('#step').click();assert.equal((await diag()).step,70);
    }
    assert.equal(compareResults(rendered[0],rendered[1]).pass,true);
    const nodeBaseline=JSON.parse(fs.readFileSync('docs/research/standing-lab/baseline/run-1.json','utf8'));
    const nodeComparison=compareResults(nodeBaseline,rendered[0]);assert.equal(nodeComparison.pass,true);
    const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();
    const download=await downloadPromise;const downloaded=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    validateResult(downloaded);assert.deepEqual(downloaded,rendered[1]);
    await page.locator('#render').check();await page.evaluate(()=>new Promise(requestAnimationFrame));
    const directory='docs/research/standing-lab';
    await page.screenshot({path:directory+'/passive-fall.png'});
    await page.reload();await page.waitForFunction(()=>window.standingLab);assert.equal((await diag()).step,0);

    const mobileContext=await browser.newContext({viewport:{width:744,height:360},hasTouch:true,isMobile:true,deviceScaleFactor:2});
    const mobile=await mobileContext.newPage();monitor(mobile);await mobile.goto(base+'labs/standing/');await mobile.waitForFunction(()=>window.standingLab);
    await mobile.locator('#step').tap();assert.equal((await mobile.evaluate(()=>standingLab.diagnostics())).step,1);
    await mobile.locator('#reset').tap();assert.equal((await mobile.evaluate(()=>standingLab.diagnostics())).step,0);
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
    const report={platform:`${os.platform()} ${os.release()} ${os.arch()}`,browser:await browser.version(),mode:(options.headless?'headless':'headed')+' production build; not GPU performance',build_provenance:{git_commit:rendered[0].git_commit,dirty:rendered[0].dirty,build_id:rendered[0].build_id},checks:['Pages direct/reload/assets','pause/resume bounded','single-step','resize while paused','visibility handler','20 fresh resets/counts stable','render on/off','Node/browser checkpoints','failure/export','touch landscape','production start/pointer/reset','destroy/retained refs'],native_tab_hidden_observed:actualHidden,synthetic_visibility_handler_checked:true,resource_samples:resetSamples.map(({generation,bodies,colliders,joints,listeners,geometries,textures,programs})=>({generation,bodies,colliders,joints,listeners,geometries,textures,programs})),standing_time:rendered[0].standing_time,failure_bodies:rendered[0].failure_bodies,node_comparison:nodeComparison,disposal,errors,warnings,failedResponses};
    fs.writeFileSync(directory+'/browser-qa.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

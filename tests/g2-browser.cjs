const assert=require('node:assert/strict');
const length=v=>Math.hypot(v.x,v.y,v.z);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const state=page=>page.evaluate(()=>window.goblinDiagnostics());
const frames=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function reset(page){await page.locator('#resetBtn').click();await frames(page);}
async function grabAt(page,id,offset=0){
  await reset(page);const before=await state(page);
  const entity=id==='prop'?before.entities.find(e=>!e.part&&e.position.x<0&&e.position.z<0):before.parts.find(p=>p.id===id);
  const p={x:entity.screen.x+offset,y:entity.screen.y};
  await page.mouse.move(p.x,p.y);await page.mouse.down();
  const selected=await state(page);assert.equal(selected.grabbed,true,`grab ${id}`);
  assert.equal(selected.grab.body,id==='prop'?entity.handle:entity.body,`select ${id}`);
  return {before,entity,p,selected};
}
async function core(page){
  await page.locator('[data-tool=hand]').click();const results=[];
  // All semantic IDs plus a persistent prop are actually selected with native pointer input.
  for(const id of (await state(page)).parts.map(p=>p.id).concat('prop')){
    const picked=await grabAt(page,id);await page.mouse.up();results.push(id);
  }
  const drags=[];
  for(const id of ['head','handL','lowerArmR','torso','upperLegL','footR','prop']){
    const picked=await grabAt(page,id,id==='head'?14:3);
    const local=picked.selected.grab.local;
    await page.mouse.move(picked.p.x+70,picked.p.y-35,{steps:14});await page.waitForTimeout(350);
    const pulled=await state(page),entity=pulled.entities.find(e=>e.handle===pulled.grab.body);
    assert.deepEqual(pulled.grab.local,local,'local point retained');assert.ok(pulled.grab.forceLimit<=120+1e-6);
    assert.ok(length(entity.velocity)<=10.01,`${id} representative linear stability`);assert.ok(length(entity.angularVelocity)<=18.01,`${id} representative angular stability`);
    assert.ok(distance(pulled.grab.anchor,picked.selected.grab.anchor)>.02,`${id} point moves`);
    assert.ok(length(entity.angularVelocity)>.01,`${id} torque rotates body`);
    const transientError=distance(pulled.grab.anchor,pulled.grab.target);
    await page.waitForTimeout(3650);const held=await state(page),error=distance(held.grab.anchor,held.grab.target);
    assert.ok(error<.12,`${id} loaded point holds within 12cm after 4s: ${error}m`);
    drags.push({id,transientError,error,forceLimit:held.grab.forceLimit,angularSpeed:length(entity.angularVelocity)});
    await page.mouse.up();assert.equal((await state(page)).grab.connections,0);
  }
  const slow=await grabAt(page,'head',12);
  for(let i=1;i<=20;i++){await page.mouse.move(slow.p.x+i,slow.p.y);await page.waitForTimeout(30);}
  await page.waitForTimeout(200);await page.mouse.up();const slowRelease=(await state(page)).grab.lastRelease;
  const fast=await grabAt(page,'head',12);
  for(let i=1;i<=8;i++){await page.mouse.move(fast.p.x+i*15,fast.p.y-20);await page.waitForTimeout(8);}
  await page.mouse.up();const fastRelease=(await state(page)).grab.lastRelease;
  assert.equal(slowRelease.threw,false);assert.equal(fastRelease.threw,true);assert.ok(fastRelease.speed>slowRelease.speed+1);assert.ok(fastRelease.speed<=10.01);
  const cameras=[];
  for(let i=0;i<3;i++){
    const picked=await grabAt(page,'head',8);await page.mouse.move(picked.p.x+50,picked.p.y-20,{steps:6});
    const moved=await state(page);assert.ok(moved.grab.target.x!==picked.selected.grab.target.x);
    const delta=Object.fromEntries(['x','y','z'].map(k=>[k,moved.grab.target[k]-picked.selected.grab.target[k]]));
    assert.ok(Math.abs(delta.x*moved.camera.planeNormal.x+delta.y*moved.camera.planeNormal.y+delta.z*moved.camera.planeNormal.z)<1e-6,'movement stays in selected camera plane');
    assert.deepEqual(moved.camera.position,picked.selected.camera.position,'camera position frozen');assert.deepEqual(moved.camera.rotation,picked.selected.camera.rotation,'camera direction frozen');
    cameras.push(moved.camMode);await page.mouse.up();
    await page.locator('#cameraBtn').click();await page.waitForTimeout(500);
  }
  await reset(page);const uiBefore=await state(page);await page.locator('[data-tool=hammer]').click();const uiAfter=await state(page);
  assert.equal(uiAfter.phase,uiBefore.phase);assert.equal(uiAfter.score,uiBefore.score);assert.equal(uiAfter.grabbed,false);await page.locator('[data-tool=hand]').click();
  return {selected:results,drags,slowRelease,fastRelease,cameras};
}
async function cleanup(page){
  await page.locator('[data-tool=hand]').click();const baseline=await state(page);
  for(let j=0;j<20;j++){
    await grabAt(page,'head',10);await page.mouse.move(730,250);await page.locator('#resetBtn').evaluate(e=>e.click());await page.mouse.up();await frames(page);
    const s=await state(page);assert.equal(s.grab.connections,0);assert.equal(s.grabbed,false);assert.equal(s.pointerDown,false);
    assert.equal(s.bodies,26);assert.equal(s.joints,14);assert.equal(s.geometries,baseline.geometries);assert.equal(s.textures,baseline.textures);
    for(const e of s.entities){assert.equal(length(e.force),0);assert.equal(length(e.torque),0);}
  }
  const cancellations=[];
  for(const reason of ['pointercancel','lostpointercapture','blur','pause','tool','camera','resize','ui','ui-background']){
    const picked=await grabAt(page,'head',10);await page.mouse.move(picked.p.x+60,picked.p.y-20);
    if(reason==='pointercancel')await page.evaluate(()=>document.querySelector('canvas').dispatchEvent(new PointerEvent('pointercancel',{pointerId:1})));
    if(reason==='lostpointercapture'){await page.mouse.move(picked.p.x+61,picked.p.y);await page.evaluate(()=>document.querySelector('canvas').releasePointerCapture(1));await page.mouse.move(picked.p.x+62,picked.p.y);}
    if(reason==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    if(reason==='pause')await page.locator('#helpBtn').evaluate(e=>e.click());
    if(reason==='tool')await page.locator('[data-tool=hammer]').evaluate(e=>e.click());
    if(reason==='camera')await page.locator('#cameraBtn').evaluate(e=>e.click());
    if(reason==='resize'){await page.setViewportSize({width:1279,height:720});await frames(page);}
    if(reason==='ui'){const b=await page.locator('#resetBtn').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.up();}
    if(reason==='ui-background'){const b=await page.locator('#toolbar').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+5);await page.mouse.up();}
    const cancelled=await state(page);assert.equal(cancelled.grab.connections,0,reason);assert.equal(cancelled.pointerDown,false,reason);assert.equal(cancelled.grab.lastRelease.threw,false,reason);
    if(reason.startsWith('ui'))assert.equal(cancelled.grab.lastRelease.reason,'ui');
    cancellations.push({reason,release:cancelled.grab.lastRelease});await page.mouse.up();
    if(reason==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    if(reason==='pause')await page.locator('#closeHelp').click();
    await page.locator('[data-tool=hand]').click();await page.setViewportSize({width:1280,height:720});await page.waitForTimeout(100);
  }
  await grabAt(page,'head');
  const immediate=await page.evaluate(()=>{
    document.querySelector('#resetBtn').click();const s=window.goblinDiagnostics(),p=s.parts.find(p=>p.id==='head').screen,c=document.querySelector('canvas');
    c.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,isPrimary:true,button:0,clientX:p.x,clientY:p.y}));const picked=window.goblinDiagnostics();c.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1}));return {picked:picked.hitParts,grabbed:picked.grabbed};
  });await page.mouse.up();assert.equal(immediate.grabbed,true);assert.deepEqual(immediate.picked,['head']);
  await page.locator('#helpBtn').click();await page.locator('#resetBtn').evaluate(e=>e.click());const paused=await state(page);await page.waitForTimeout(600);const still=await state(page);
  assert.equal(still.paused,true);assert.deepEqual(still.parts.map(p=>[p.position,p.rotation]),paused.parts.map(p=>[p.position,p.rotation]));assert.equal(still.grab.connections,0);
  await page.locator('#closeHelp').click();assert.equal((await state(page)).paused,false);
  const owned=await grabAt(page,'head',10),owner=owned.selected.activePointer;
  await page.evaluate(({owner,p})=>{
    const c=document.querySelector('canvas');
    for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])c.dispatchEvent(new PointerEvent(type,{pointerId:owner+1,isPrimary:false,button:0,clientX:p.x+100,clientY:p.y-100}));
  },{owner,p:owned.p});
  const foreign=await state(page);assert.equal(foreign.activePointer,owner);assert.deepEqual(foreign.grab.target,owned.selected.grab.target,'second pointer cannot move/release/replace grip');assert.equal(foreign.score,owned.selected.score);
  const coalesced=await page.evaluate(({owner,p})=>{
    const c=document.querySelector('canvas'),now=performance.now(),event=new PointerEvent('pointermove',{pointerId:owner,clientX:p.x,clientY:p.y});
    const samples=[10,40].map((dx,i)=>({clientX:p.x+dx,clientY:p.y,timeStamp:now-4+i*3}));
    Object.defineProperty(event,'getCoalescedEvents',{value:()=>samples});c.dispatchEvent(event);
    return window.goblinDiagnostics().grab.target;
  },{owner,p:owned.p});assert.ok(distance(coalesced,foreign.grab.target)>.1,'coalesced samples are consumed rather than outer repeated coordinate');
  await page.evaluate(owner=>document.querySelector('canvas').dispatchEvent(new PointerEvent('pointercancel',{pointerId:owner})),owner);
  await page.mouse.move(owned.p.x+100,owned.p.y);await page.mouse.up();const ended=await state(page);
  assert.equal(ended.activePointer,null);assert.equal(ended.grab.connections,0);assert.equal(ended.grab.lastRelease.threw,false);assert.equal(ended.score,foreign.score,'old pointer events cannot restart a cancelled action');
  return {cycles:20,cancellations,immediate,pausedReset:true,secondPointer:true,coalesced:true,noRestart:true};
}
async function mobile(page){
  const context=await page.context().browser().newContext({viewport:{width:360,height:744},hasTouch:true,isMobile:true,deviceScaleFactor:3});
  const mobile=await context.newPage(),errors=[];mobile.on('pageerror',e=>errors.push(e.message));mobile.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});
  try{
    await mobile.goto(page.url());await mobile.waitForFunction(()=>window.goblinDiagnostics);await mobile.locator('#startBtn').tap();
    const cdp=await context.newCDPSession(mobile),results=[];
    for(const size of [{width:360,height:744},{width:744,height:360}]){
      await mobile.setViewportSize(size);await mobile.locator('#resetBtn').tap();await frames(mobile);
      const h=(await state(mobile)).parts.find(p=>p.id==='head').screen;
      const touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y,id:1}]});
      await touch('touchStart',h.x+5,h.y);assert.equal((await state(mobile)).grabbed,true,`touch grab ${size.width}`);
      for(let j=1;j<=6;j++){await touch('touchMove',h.x+5+j*10,h.y-15);await mobile.waitForTimeout(10);}
      await touch('touchEnd');const released=(await state(mobile)).grab;assert.equal(released.connections,0);assert.equal(released.lastRelease.threw,true,`touch throw ${size.width}: ${JSON.stringify(released)}`);
      await mobile.locator('#resetBtn').tap();await frames(mobile);const head=(await state(mobile)).parts.find(p=>p.id==='head').screen;
      await touch('touchStart',head.x,head.y);await touch('touchMove',head.x+20,head.y);await touch('touchCancel');const cancel=(await state(mobile)).grab;
      assert.equal(cancel.connections,0);assert.equal(cancel.lastRelease.threw,false);
      const layout=await mobile.evaluate(()=>{const a=document.querySelector('#actions').getBoundingClientRect(),b=document.querySelector('#toolbar').getBoundingClientRect(),c=document.querySelector('canvas').getBoundingClientRect();return {overlap:!(a.right<=b.left||a.bottom<=b.top||a.left>=b.right||a.top>=b.bottom),canvas:[c.width,c.height],viewport:[innerWidth,innerHeight]};});
      assert.equal(layout.overlap,false);assert.deepEqual(layout.canvas,layout.viewport);results.push({size,released,cancel,layout});
    }
    assert.deepEqual(errors,[]);return {emulation:true,results,errors};
  }finally{await context.close();}
}
module.exports={core,cleanup,mobile};

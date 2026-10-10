import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import R from '@dimforge/rapier3d-compat';
import {createUprightRun} from '../src/gameplay/upright-run.js';
import {variantOptions} from '../src/gameplay/upright-variants.js';
import {PlaygroundTrails,TRAIL_IDS} from '../src/gameplay/playground-trails.js';
import {PlaygroundTrailView} from '../src/gameplay/playground-trail-view.js';
await R.init();
const create=id=>createUprightRun(variantOptions(id),{audit:false,record:false,runPolicy:{mode:'free'}});

test('actual native multi-step frame, terminal step and no phantom attempts',()=>{
  const {session,sim}=create('B'),trail=new PlaygroundTrails();
  try{
    trail.rebind(session);assert.equal(session.stepObservers.size,0);trail.setEnabled(true);
    assert.equal(trail.count,1);assert.equal(trail.snapshot(true).lines[0].points[0].initial,true);
    session.clock.maxSteps=4;session.resume();session.tick(0);session.tick(4/60);
    assert.equal(sim.steps,4);assert.deepEqual(trail.snapshot(true).lines[0].points.map(p=>p.step),[0,1,2,3,4]);
    session.observePause();const before=trail.snapshot(true);session.tick(50);session.tick(100);
    assert.deepEqual(trail.snapshot(true),before);session.singleStep();assert.equal(trail.lastStep,5);
    session.resume();session.tick(200);assert.equal(sim.steps,5,'resume discards paused wall time');
    session.tick(300);assert.equal(sim.steps,9,'maxSteps discards excess wall time without fabricated samples');
    sim.safety=()=> 'test-terminal';session.singleStep(); // Running -> refused, no phantom.
    assert.equal(trail.lastStep,9);session.observePause();session.singleStep();
    assert.equal(sim.steps,10);assert.equal(trail.lastStep,10);assert.equal(trail.safety,'test-terminal');
    assert.ok(trail.snapshot(true).lines.every(l=>l.points.at(-1).terminal&&l.points.at(-1).position));
    assert.equal(session.advanceStep(),false);assert.equal(trail.count,11);
    assert.deepEqual(session.trace,[]);assert.deepEqual(session.events,[]);assert.equal(session.audit,null);
  }finally{trail.dispose();session.dispose();}
});

for(const variant of ['B','T1','R1'])test(variant+': trail reads preserve exact native/controller state, reference and speed',()=>{
  const a=create(variant),b=create(variant),trail=new PlaygroundTrails();
  try{
    trail.rebind(b.session);trail.setEnabled(true);
    for(const r of [a,b]){r.session.setSpeed(.5);r.session.resume();r.session.tick(0);}
    for(let frame=1;frame<=180;frame++){
      if(frame===40){a.session.push(false,true);b.session.push(false,true);}
      a.session.tick(frame/60);b.session.tick(frame/60);
      assert.deepEqual(b.sim.snapshot(),a.sim.snapshot());assert.equal(b.session.pending,a.session.pending);
      assert.equal(trail.lastStep,b.sim.steps);assert.equal(trail.count,b.sim.steps+1);
    }
    const data=trail.snapshot(true);for(const l of data.lines){const p=b.sim.rig.byId.get(l.id).body.translation();assert.deepEqual(l.points.at(-1).position,[p.x,p.y,p.z]);assert.equal(l.points.at(-1).time_s,b.sim.steps/60);}
    const preserved=data;b.session.observePause('marker');b.session.report();b.session.setSpeed(.25);
    assert.deepEqual(trail.snapshot(true),preserved,'marker/report/speed changes do not sample');
  }finally{trail.dispose();a.session.dispose();b.session.dispose();}
});

test('600 ring, simulation windows, free-run overflow, OFF clear and no mid-run backfill',()=>{
  const {session,sim}=create('B'),trail=new PlaygroundTrails();
  try{
    trail.rebind(session);trail.setEnabled(true);
    for(let i=0;i<730;i++)session.singleStep();
    assert.equal(sim.steps,730);assert.equal(session.windowLimit,Infinity);assert.equal(trail.count,600);
    assert.equal(trail.snapshot().oldestStep,131);assert.equal(trail.snapshot().storageBytes,109800);
    for(const [seconds,count] of [[1,61],[3,181],[10,600]]){const steps=[];trail.visit('head',seconds,(_,step)=>steps.push(step));assert.equal(steps.length,count);assert.equal(steps.at(-1),730);}
    trail.setEnabled(false);assert.equal(session.stepObservers.size,0);assert.equal(trail.count,0);
    for(let i=0;i<5;i++)session.singleStep();assert.equal(trail.count,0);
    trail.setEnabled(true);assert.equal(trail.count,0);assert.equal(session.stepObservers.size,1);
    session.singleStep();assert.equal(trail.count,1);assert.equal(trail.lastStep,736);
    session.reset({assisted:true,obstacle:false});assert.equal(trail.count,1);assert.equal(trail.lastStep,0);
    assert.equal(session.stepObservers.size,1);session.singleStep();assert.equal(trail.count,2);
    session.dispose();assert.equal(trail.session,null);assert.equal(trail.count,0);assert.equal(session.stepObservers.size,0);
  }finally{trail.dispose();if(trail.session)session.dispose();}
});

test('shared GPU buffers, gaps, visibility preserves hidden history, monochrome and disposal',()=>{
  const {session,sim}=create('B'),scene=new THREE.Scene();let listener;
  const status={textContent:''},panel={querySelector:()=>status,addEventListener:(_,fn)=>{listener=fn;},removeEventListener:(_,fn)=>{assert.equal(fn,listener);listener=null;}};
  const view=new PlaygroundTrailView(scene,panel),change=(key,value)=>listener({target:{dataset:{trail:key},checked:value,value:String(value)}});
  try{
    view.rebind(session);change('enabled',true);
    for(let i=0;i<5;i++)session.singleStep();view.update(1000,true);
    const line=view.objects.get('head'),geometry=line.geometry,positions=geometry.attributes.position;
    assert.equal(geometry.drawRange.count,10);const count=view.collector.count;
    change('head',false);assert.equal(line.visible,false);assert.equal(view.collector.count,count);
    session.singleStep();change('head',true);assert.equal(view.collector.count,count+1);assert.equal(view.objects.get('head'),line);
    // Nonfinite input test uses an observed position only; no native pose write.
    const body=sim.rig.byId.get('head').body,translation=body.translation;
    body.translation=()=>({x:NaN,y:0,z:0});session.singleStep();body.translation=translation;
    // If the native safety guard ended this step, it must still have a visible gap.
    view.update(1100,true);const points=view.snapshot(true).lines.find(l=>l.id==='head').points;
    assert.equal(points.at(-1).position,null);assert.equal(view.collector.gaps,1);assert.match(status.textContent,/gaps: 1/);
    assert.ok([...positions.array].every(Number.isFinite));assert.equal(view.endpoints.geometry.drawRange.count,2);
    change('handR',true);assert.equal(view.objects.get('handR').material.isLineDashedMaterial,true);
    change('monochrome',true);assert.equal(view.monochrome,true);assert.equal(view.objects.get('head'),line);
    let geometryDisposed=0,materialDisposed=0;geometry.addEventListener('dispose',()=>geometryDisposed++);line.material.addEventListener('dispose',()=>materialDisposed++);
    change('enabled',false);assert.equal(scene.children.length,0);assert.equal(geometryDisposed,1);assert.equal(materialDisposed,1);
    assert.equal(view.snapshot().resources,0);assert.equal(session.stepObservers.size,0);
    session.reset({assisted:true,obstacle:false});change('enabled',true);assert.equal(view.collector.count,1);
    view.dispose();view.dispose();assert.equal(scene.children.length,0);assert.equal(listener,null);assert.equal(session.stepObservers.size,0);
  }finally{view.dispose();session.dispose();}
});

test('full ring draws bounded windows and reuses geometry across fresh variant worlds',()=>{
  let run=create('B');const scene=new THREE.Scene(),panel={querySelector:()=>({textContent:''}),addEventListener(){},removeEventListener(){}},view=new PlaygroundTrailView(scene,panel);
  try{
    view.rebind(run.session);view.visible=new Set(TRAIL_IDS);view.collector.setEnabled(true);
    for(let i=0;i<730;i++)run.session.singleStep();view.seconds=10;view.update(1000);
    assert.equal(view.snapshot().bufferBytes,234976);assert.equal(view.objects.size,7);
    const head=view.objects.get('head');assert.equal(head.geometry.drawRange.count,1198);
    for(const [seconds,vertices] of [[1,120],[3,360],[10,1198]]){view.seconds=seconds;view.lastVersion=-1;view.update(1100);assert.equal(head.geometry.drawRange.count,vertices);assert.equal(view.collector.count,600);}
    for(const variant of ['T1','R1','B']){run.session.dispose();assert.equal(view.collector.session,null);run=create(variant);view.rebind(run.session);assert.equal(view.collector.count,1);assert.equal(view.collector.lastStep,0);assert.equal(run.session.stepObservers.size,1);assert.equal(view.objects.get('head'),head);assert.equal(head.geometry.drawRange.count,0);}
  }finally{view.dispose();run.session.dispose();}
});

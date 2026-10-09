import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import R from '@dimforge/rapier3d-compat';
import {UprightSlice} from '../src/gameplay/upright-assist.js';
import {CONFIG_B,UprightSession} from '../src/gameplay/upright-session.js';

await R.init();
test('browser base gains equal archived B; historical evidence stays negative',()=>{
  const evidence=JSON.parse(fs.readFileSync(new URL('../docs/development/gameplay-upright-evidence.json',import.meta.url)));
  assert.deepEqual(CONFIG_B,evidence.configs.find(c=>c.id==='B'));
  assert.equal(evidence.provenance.reviewed_controller_sha256,'4b3117d5584eab803ccb94ad611c5361ef5e80f1496982bfc59a2e90ddc5df71');
});
test('scene recorder forwards native commands; pause and reset remain step-free',()=>{
  const sim=new UprightSlice({config:CONFIG_B}),session=new UprightSession(sim);
  try{
    assert.equal(session.paused,true);
    assert.equal(session.audit.ledger.size,22);
    const bind=sim.snapshot().parts;
    sim.preStep(); // Native commands only, no world.step / behavioral trial.
    assert.equal([...session.audit.ledger.values()].filter(c=>c.cap===20&&c.stiffness===40&&c.damping===2).length,22);
    session.pause();
    assert.ok([...session.audit.ledger.values()].every(c=>c.cap===0&&c.stiffness===0&&c.damping===0));
    assert.ok(session.events.filter(e=>e.kind==='interrupt').every(e=>e.motionUnchanged));
    session.resume();session.push(false,true);assert.equal(session.pending,false);
    session.pause();assert.equal(session.pending,null);
    session.lastRun={old:true};session.reset({assisted:false,obstacle:true});
    assert.equal(session.lastRun,null);assert.equal(session.paused,true);assert.equal(sim.enabled,false);
    assert.deepEqual(sim.snapshot().parts,bind);
    assert.equal(sim.steps,0);assert.equal(session.trace.length,1);
    let stepCalls=0;const old=sim.step;sim.step=()=>{stepCalls++;};
    session.tick(20);session.tick(40);assert.equal(stepCalls,0,'paused clock cannot step');
    sim.step=old;
  }finally{session.dispose();}
});

import {comparePair,projectPoint,POINT_IDS} from '../src/gameplay/upright-comparison.js';
const identityMatrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function fixture(role='reference',pairId='one'){
  return {role,pairId,identity:{config:CONFIG_B,dt:1/60,mass:9.06,sources:{rig:'fixture'}},
    camera:{projection:identityMatrix.slice(),view:identityMatrix.slice(),canvas:{width:1280,height:720}},
    events:role==='input'?[{kind:'impulse-observation',step:120,strength:.4,direction:{x:1,y:0,z:0},localPoint:{x:0,y:.3,z:0},point:{x:0,y:1.7,z:0},deltaVelocity:{x:.2,y:0,z:0},deltaAngularVelocity:{x:0,y:0,z:-1}}]:[],
    trace:Array.from({length:361},(_,step)=>({step,time:step/60,state:'ASSISTED_READY',assisted:true,invalid:null,maxAnchorError:0,
      torso:{tilt:0},pelvis:{tilt:0},commands:{support:0,motorCap:20,torques:{}},
      metrics:{pelvisHeight:1.12,feet:[{id:'footL',distance:0},{id:'footR',distance:0}],nonFootFloor:[]},
      observation:{controller:{config:CONFIG_B},bodies:Array.from({length:15},(_,i)=>({id:'fixture-'+i,state:'synthetic-step-free'})),
        points:Object.fromEntries(POINT_IDS.map(id=>[id,{position:{x:0,y:id==='head'?2:id==='torso'?1.5:1,z:0},
          rotation:{x:0,y:0,z:0,w:1},velocity:{x:0,y:0,z:0},angularVelocity:{x:0,y:0,z:0}}]))}}))};
}
test('V2 pairs by explicit role/id and identical complete prefix; no peak or time shifting',()=>{
  const R=fixture(),P=fixture('input'),before=JSON.stringify([R,P]),comparison=comparePair(R,P);
  assert.equal(comparison.Q.valid,true);assert.equal(comparison.Q.rows.length,361);
  assert.deepEqual(comparison.Q.rows[121].points.torso.displacement,{d:0,c:0,y:0});
  assert.equal(comparison.Q.legacyV1.additionalTiltDeg,0);assert.equal(comparison.Q.legacyV1.pass,false);
  assert.equal(comparison.H.status,'unbewertet');assert.equal(comparison.S.returnEnvelopeAtTwoSeconds,true);
  assert.equal(JSON.stringify([R,P]),before,'analysis cannot mutate records');
  P.pairId='other';assert.equal(comparePair(R,P).Q.valid,false);
  P.pairId='one';P.trace[120].observation.points.footR.position.x=.01;
  assert.match(comparePair(R,P).Q.issues.join(),/pre-input/);
});
test('V2 signs are world +X / -Z; includes feet, relative motion, angle wrapping and canvas scale',()=>{
  const R=fixture(),P=fixture('input');
  for(const t of P.trace.slice(121)){
    t.observation.points.head.position.x=.3;t.observation.points.torso.position.x=.2;
    t.observation.points.pelvis.position.x=.1;
    t.observation.points.footL.position.x=.04;t.observation.points.footR.position.x=.06;
    t.observation.points.torso.position.z=.07;
    t.observation.points.torso.rotation={x:0,y:0,z:-Math.sin(.05),w:Math.cos(.05)};
    t.torso.tilt=.1;
  }
  let c=comparePair(R,P),row=c.Q.rows[121];
  assert.ok(Math.abs(row.tilt.torso.beta-.1)<1e-12);assert.equal(row.tilt.torso.gamma,0);
  assert.deepEqual(row.points.torso.displacement,{d:.2,c:-.07,y:0});
  assert.ok(Math.abs(row.relative['torso-pelvis'].displacement.d-.1)<1e-12);
  assert.ok(Math.abs(row.relative['head-feet'].displacement.d-.25)<1e-12);
  assert.equal(row.points.footR.displacement.d,.06);
  assert.deepEqual(projectPoint({x:0,y:0,z:0},P.camera),{x:640,y:360});
  assert.equal(row.points.torso.screenDeltaPx.x,128);
  assert.ok(Math.abs(c.Q.legacyV1.additionalTiltDeg-.1*180/Math.PI)<1e-12);
  // Crossing the atan2 branch must not look like an artificial full turn.
  for(const [step,angle] of [[121,Math.PI-.01],[122,Math.PI+.01]]){
    P.trace[step].observation.points.torso.rotation={x:0,y:0,z:-Math.sin(angle/2),w:Math.cos(angle/2)};
  }
  c=comparePair(R,P);assert.ok(Math.abs(c.Q.rows[122].tilt.torso.beta-(Math.PI+.01))<1e-12);
});
test('V2 refuses absent, duplicate, mistimed and nonfinite data instead of defaulting to zero',()=>{
  for(const corrupt of [
    P=>P.trace.splice(129,1),
    P=>P.trace[129]=null,
    P=>P.trace[129].commands.torques={torso:null},
    P=>P.events.push(null),
    P=>P.trace[129].step=128,
    P=>P.trace[129].time+=.01,
    P=>delete P.trace[129].observation.points.head,
    P=>P.trace[129].observation.points.footL.position.x=NaN,
    P=>P.camera.view=[],
    P=>delete P.trace[129].metrics.feet,
    P=>P.events[0].step=121,
    P=>P.role='reference',
    P=>P.identity.dt=1/30]){
    const R=fixture(),P=fixture('input');corrupt(P);
    const c=comparePair(R,P);assert.equal(c.Q.valid,false);assert.ok(c.Q.issues.length);assert.equal(c.S.status,'unbewertbar');
  }
});
test('V2 capture reads native state without writes or a physics step',()=>{
  const sim=new UprightSlice({config:CONFIG_B}),session=new UprightSession(sim);
  try{
    const before=sim.snapshot(),step=sim.step;sim.step=()=>{throw Error('observer must never step');};
    session.capture();assert.deepEqual(sim.snapshot(),before);
    const obs=session.trace.at(-1).observation;
    assert.deepEqual(Object.keys(obs.points),POINT_IDS);assert.equal(obs.bodies.length,15);
    assert.ok(obs.bodies.every(p=>typeof p.sleeping==='boolean'));
    session.resume();session.push(false);
    const input=session.events.find(e=>e.kind==='impulse-observation');
    assert.ok(Math.abs(input.deltaVelocity.x-.2)<1e-6);assert.ok(input.deltaAngularVelocity.z<0);
    assert.equal(sim.steps,0);sim.step=step;
  }finally{session.dispose();}
});

test('stored native V2 pairs stay aligned and retain the archived B trajectory and FAIL',()=>{
  const data=JSON.parse(gunzipSync(fs.readFileSync(new URL('../docs/development/gameplay-upright-v2-evidence.json.gz',import.meta.url))));
  assert.equal(data.records.length,4);
  const archive=JSON.parse(gunzipSync(fs.readFileSync(new URL('../docs/development/gameplay-upright-browser-evidence.json.gz',import.meta.url))));
  for(let i=0;i<4;i+=2){
    const c=comparePair(data.records[i],data.records[i+1]);assert.equal(c.Q.valid,true);
    assert.equal(c.Q.legacyV1.pass,false);assert.equal(c.S.inputSafe,true);
    const old=archive.results[2].observed.trace;
    for(const row of data.records[i+1].trace)assert.deepEqual(row.torso,old[row.step].torso,'read-only recording does not change native B');
  }
});

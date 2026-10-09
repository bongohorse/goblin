import test from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {UprightReturnSlice} from '../src/gameplay/upright-return.js';
import {UprightSession,CONFIG_B} from '../src/gameplay/upright-session.js';
import {PlaygroundFeedback} from '../src/gameplay/playground-feedback.js';
import {variantOptions,optionsFromSearch} from '../src/gameplay/upright-variants.js';
await R.init();
test('shared R1 default and explicit archived URLs retain their intended variant',()=>{
  assert.deepEqual(optionsFromSearch(''),variantOptions('R1'));
  assert.deepEqual(optionsFromSearch('?yield=B'),variantOptions('B'));
  assert.deepEqual(optionsFromSearch('?reaction=T1'),variantOptions('T1'));
  assert.deepEqual(optionsFromSearch('?variant=R1'),variantOptions('R1'));
  assert.throws(()=>variantOptions('new'));
});
test('all three variants follow identical native motion with recorder on/off and fixed/single stepping',()=>{
  for(const variant of ['B','T1','R1']){
    const a=new UprightReturnSlice({config:CONFIG_B,...variantOptions(variant)});
    const b=new UprightReturnSlice({config:CONFIG_B,...variantOptions(variant)});
    const prototype=new UprightSession(a),playground=new UprightSession(b,{record:false,audit:false});
    try{
      prototype.resume();prototype.tick(0);
      for(let step=1;step<=32;step++){
        if(step===20){prototype.push(false);playground.resume();playground.push(false);playground.paused=true;}
        prototype.tick(step/60+.000001);assert.equal(playground.singleStep(),true);
        assert.equal(a.steps,step);assert.equal(b.steps,step);assert.deepEqual(b.snapshot(),a.snapshot());
      }
      assert.equal(playground.paused,true);assert.equal(playground.trace.length,0);assert.equal(playground.events.length,0);
      playground.resume();assert.equal(playground.singleStep(),false);
      playground.pause();const motion=b.snapshot();playground.tick(10);assert.deepEqual(b.snapshot(),motion);
      playground.reset({assisted:true,obstacle:false});assert.equal(b.steps,0);assert.equal(playground.pending,null);assert.equal(playground.trial,null);
      assert.equal(b.grab.active,false);assert.equal(playground.paused,true);
    }finally{prototype.dispose();playground.dispose();}
  }
});
test('feedback is copied, run-bound, finite, limited, and exports snapshot failures honestly',()=>{
  const f=new PlaygroundFeedback(),identity={build:{build_id:'test'},variant:'R1',run_id:'one'};
  const snapshot={parts:[{id:'head',position:{x:1,y:2,z:3}}]};
  f.mark(identity,7,()=>snapshot,()=>({camera:{x:1}}));snapshot.parts[0].position.x=99;
  const fields={note:'Beobachtung',body_id:'head',category:'head'};
  const report=f.report(identity,fields,['head']);
  assert.equal(report.report.observation.snapshot.parts[0].position.x,1);
  assert.equal(report.report.observation.step,7);assert.equal(report.report.identity.variant,'R1');
  assert.equal(JSON.parse(report.json).observation.note,'Beobachtung');
  assert.throws(()=>f.report({...identity,run_id:'two'},fields,['head']),/anderen Run/);
  assert.throws(()=>f.report(identity,{...fields,note:'a'.repeat(2001)},['head']),/2000/);
  assert.throws(()=>f.report(identity,{...fields,body_id:'missing'},['head']),/Körperteil/);
  f.mark(identity,8,()=>({x:NaN}),()=>({}));const diagnostic=f.report(identity,fields,['head']);
  assert.equal(diagnostic.diagnostic,true);assert.equal(diagnostic.report.observation.snapshot,null);
  assert.match(diagnostic.report.data_errors[0].reason,/Non-finite/);
  f.clear();assert.throws(()=>f.report(identity,fields,['head']),/zuerst/);
});

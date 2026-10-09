import test from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {UprightReturnSlice} from '../src/gameplay/upright-return.js';
import {UprightSession,CONFIG_B} from '../src/gameplay/upright-session.js';
import {PlaygroundFeedback} from '../src/gameplay/playground-feedback.js';
import {variantOptions} from '../src/gameplay/upright-variants.js';
await R.init();

const create=variant=>new UprightSession(new UprightReturnSlice({config:CONFIG_B,...variantOptions(variant)}));

function uninstrumentedPhysics(s){
  const sim=s.sim;
  return {snapshot:sim.snapshot(),pending:s.pending,trial:structuredClone(s.trial),
    controller:{yieldStart:sim.yieldStart,targetStart:sim.targetStart,noSupport:sim.noSupport,
      rest:sim.rest,lastHit:structuredClone(sim.lastHit)},
    sleeping:[...sim.rig.byId.values()].map(({body})=>body.isSleeping())};
}

// P0 production configuration: recorder and motor-command audit are both OFF.
// Compare directly with the instrumented original session, including pending
// input and actual native state, rather than assuming the test recorder is inert.
for(const variant of ['B','T1','R1'])test(variant+': lightweight Playground pause/marker/step/resume equals instrumented uninterrupted motion',()=>{
  const normal=create(variant);
  const lightweight=new UprightSession(new UprightReturnSlice({config:CONFIG_B,...variantOptions(variant)}),
    {record:false,audit:false});
  const feedback=new PlaygroundFeedback(),identity={run_id:'light-'+variant,variant};
  try{
    normal.resume();lightweight.resume();normal.tick(0);lightweight.tick(0);
    let wall=0;
    for(let step=1;step<=144;step++){
      if(step===21){
        assert.equal(normal.push(false),true);
        assert.equal(lightweight.push(false),true);
      }
      if(step===25){
        assert.equal(normal.push(false,true),true);
        assert.equal(lightweight.push(false,true),true);
      }
      if([23,51,119].includes(step)){
        const before=uninstrumentedPhysics(lightweight),markedStep=lightweight.sim.steps;
        const marker=feedback.mark(identity,markedStep,()=>lightweight.sim.snapshot(),
          ()=>({}),()=>lightweight.observePause('marker'));
        assert.equal(marker.step,markedStep);
        assert.deepEqual(marker.snapshot,before.snapshot);
        assert.equal(marker.pause.kind,'observation');
        assert.deepEqual(uninstrumentedPhysics(lightweight),before);
        assert.equal(lightweight.paused,true);
        assert.equal(lightweight.push(true),false,'paused push cannot be queued');
        lightweight.tick(wall+5);lightweight.tick(wall+10);
        assert.deepEqual(uninstrumentedPhysics(lightweight),before,'paused wall time must not advance physics');
        assert.equal(lightweight.singleStep(),true);
        assert.equal(lightweight.paused,true);
        normal.tick(step/60+.000001);
        assert.deepEqual(uninstrumentedPhysics(lightweight),uninstrumentedPhysics(normal));
        lightweight.resume();wall+=10;lightweight.tick(wall);
        assert.deepEqual(uninstrumentedPhysics(lightweight),uninstrumentedPhysics(normal),
          'first frame after resume must not catch up');
      }else{
        normal.tick(step/60+.000001);
        wall+=1/60;lightweight.tick(wall+.000001);
      }
      assert.equal(lightweight.sim.steps,step);
      assert.deepEqual(uninstrumentedPhysics(lightweight),uninstrumentedPhysics(normal),
        'native, controller and pending state must match with instrumentation off');
      assert.equal(lightweight.events.length,0);
      assert.equal(lightweight.trace.length,0);
      assert.equal(lightweight.audit,null);
      if(step===118)assert.equal(lightweight.pending,false,'scheduled input remains queued');
      if(step===121){
        assert.equal(lightweight.pending,null,'scheduled input applied once');
        assert.equal(lightweight.sim.lastHit.step,120);
      }
    }
    const result=feedback.report(identity,{note:'Playground ohne Recorder'},[...lightweight.sim.rig.byId.keys()]);
    assert.equal(result.report.observation.step,118);
    assert.equal(result.report.observation.pause.kind,'observation');
    assert.equal(result.report.observation.snapshot.steps,118,'feedback remains pinned to the marked step');
  }finally{normal.dispose();lightweight.dispose();}
});

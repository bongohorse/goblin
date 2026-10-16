import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PostureState} from '../src/posture-state.js';
const stand={phase:'ready',paused:false,upY:1,headY:2.3,speed:0,angularSpeed:0,supported:true,grounded:true,held:false,hit:false,outside:false,blocked:false,pose:null,readyToRise:false};
const lying={...stand,upY:0,headY:.5,supported:false,pose:'back'};
function advance(c,seconds,s){for(let i=0;i<Math.round(seconds*60);i++)c.update(1/60,s);return c.state;}
test('ready idle and noisy thresholds have dwell times; stronger disturbance loses support',()=>{
  const c=new PostureState();assert.equal(advance(c,60,stand),'standing');
  for(let i=0;i<30;i++){c.update(1/60,{...stand,upY:.97});c.update(1/60,stand);}assert.equal(c.state,'standing');
  assert.equal(advance(c,.12,{...stand,upY:.97}),'swaying');
  assert.equal(advance(c,.5,stand),'swaying');assert.equal(advance(c,.12,stand),'standing');
  assert.equal(advance(c,.2,{...stand,supported:false}),'falling');
});
test('lying needs actual contact, orientation and continuous rest; both supported poses require a controller',()=>{
  for(const pose of ['back','belly']){
    const c=new PostureState();advance(c,.2,lying);
    assert.equal(advance(c,2,{...lying,pose,grounded:false}),'falling');
    assert.equal(advance(c,.7,{...lying,pose}),'falling');
    c.update(1/60,{...lying,speed:1});assert.equal(advance(c,.7,{...lying,pose}),'falling');
    assert.equal(advance(c,.12,{...lying,pose}),'lying');
    assert.equal(advance(c,.5,{...lying,pose}),'lying');
    c.update(1/60,{...lying,pose,readyToRise:true});assert.equal(c.state,'rising');
    assert.equal(advance(c,.62,stand),'standing');
  }
});
test('hold suppresses get-up and recovery; hit/hold interrupt rise; block returns to lying',()=>{
  for(const interrupt of [{hit:true},{held:true},{blocked:true}]){
    const c=new PostureState();advance(c,1.1,lying);
    assert.equal(advance(c,5,{...lying,held:true,readyToRise:true,outside:true}),'lying');
    c.update(1/60,{...lying,readyToRise:true});assert.equal(c.state,'rising');
    c.update(1/60,{...lying,...interrupt});assert.equal(c.state,interrupt.blocked?'lying':'falling');
  }
});
test('pause/end freeze timers; reset and disposal leave no pending recovery or transition',()=>{
  const c=new PostureState();advance(c,.2,lying);const elapsed=c.elapsed;
  advance(c,20,{...lying,paused:true});advance(c,20,{...lying,phase:'ended'});
  assert.equal(c.state,'falling');assert.equal(c.elapsed,elapsed);
  advance(c,.8,lying);assert.equal(c.state,'lying');
  c.reset('ready');assert.equal(c.state,'standing');assert.equal(c.elapsed,0);assert.equal(c.reason,null);
  c.dispose();advance(c,2,lying);assert.equal(c.state,'preparing');assert.equal(c.timers.size,0);
});
test('recovery has explicit reasons and never reports a successful regular get-up',()=>{
  for(const [sample,seconds,reason] of [[{...stand,outside:true},.6,'arena-exit'],[{...lying,pose:null},4.2,'unsupported-pose'],[{...lying,blocked:true},5.2,'blocked']]){
    const c=new PostureState();advance(c,seconds,sample);assert.equal(c.state,'recovery');assert.equal(c.reason,reason);
  }
  const c=new PostureState();advance(c,1.1,lying);c.update(1/60,{...lying,readyToRise:true});
  advance(c,8.1,lying);assert.equal(c.state,'recovery');assert.equal(c.reason,'rise-timeout');
});
test('arena-exit deadline survives a simultaneous standing-to-falling transition',()=>{
  const c=new PostureState();advance(c,.2,{...lying,outside:true});assert.equal(c.state,'falling');
  assert.equal(advance(c,.3,{...lying,outside:true}),'recovery');assert.equal(c.reason,'arena-exit');
});

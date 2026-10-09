import test from 'node:test';
import assert from 'node:assert/strict';
import {viewportRects,pointerNdc} from '../src/gameplay/playground-viewports.js';

test('2x2 viewports partition odd CSS sizes without gaps and have fixed view order',()=>{
  const views=viewportRects(911,721,'quad','side');assert.deepEqual(views.map(v=>v.id),['perspective','front','side','top']);
  assert.equal(views.reduce((n,r)=>n+r.width*r.height,0),911*721);
  assert.deepEqual(views.map(v=>[v.x,v.y,v.width,v.height]),[[0,0,455,360],[455,0,456,360],[0,360,455,361],[455,360,456,361]]);
  assert.deepEqual(viewportRects(444,360,'single','top'),[{id:'top',x:0,y:0,width:444,height:360}]);
});
test('pointer normalization uses each actual viewport, including edge and outside drag',()=>{
  for(const r of viewportRects(911,721,'quad','perspective')){
    assert.deepEqual(pointerNdc(r,r.x+r.width/2,r.y+r.height/2),{x:0,y:0});
    assert.deepEqual(pointerNdc(r,r.x,r.y),{x:-1,y:1});
    assert.deepEqual(pointerNdc(r,r.x+r.width,r.y+r.height),{x:1,y:-1});
    assert.deepEqual(pointerNdc(r,r.x+r.width*1.5,r.y+r.height*1.5),{x:2,y:-2});
  }
});

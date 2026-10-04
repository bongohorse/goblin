import test from 'node:test';
import assert from 'node:assert/strict';
import {Quaternion,Vector3} from 'three';
import {hingeOracle} from '../scripts/motor-rig-oracle.js';
const axis=(x,y,z,angle)=>new Quaternion().setFromAxisAngle(new Vector3(x,y,z),angle);
const identity=new Quaternion();
test('independent matrix oracle resolves signed hinge twists, world/bind frames and quaternion wrapping',()=>{
  const base=axis(0,1,0,.8).multiply(axis(0,0,1,-.6)),frame=axis(0,0,1,.5);
  for(const angle of [-3.14,-.45,-.1,0,.1,.45,3.14]){
    const child=base.clone().multiply(frame).multiply(axis(1,0,0,angle)).multiply(frame.clone().invert());
    for(const sign of [1,-1]){const b=new Quaternion(child.x*sign,child.y*sign,child.z*sign,child.w*sign),o=hingeOracle(base,b,frame,frame);assert.ok(Math.abs(o.angle-angle)<1e-12);assert.ok(o.axis_error<1e-12);assert.ok(Math.abs(o.engine_angle-angle)<1e-11);}
  }
});
test('oracle distinguishes hinge twist from forbidden swing and pinned asin semantics',()=>{
  const child=axis(1,0,0,.4).multiply(axis(0,1,0,.3)),o=hingeOracle(identity,child,identity,identity);
  assert.ok(Math.abs(o.angle-.4)<1e-12);assert.ok(o.axis_error>.29);assert.ok(Math.abs(o.engine_angle-o.angle)>.004);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {config,initial,command,matrix,stateMetrics} from '../scripts/smalltilt79-model.mjs';
import {axis,capsule} from '../scripts/torso-torque60-oracle.js';
import {CONFIG,torque} from '../scripts/torso-torque60-contract.js';
import {aq,av,normalize,rotate,mul,ov,length,dot} from '../scripts/finite-step66-reference.js';
import {exactWithinCap} from '../scripts/review-actuation74.mjs';
export function seed(c){const i=initial(c);return [CONFIG.torso,CONFIG.partner].map((s,j)=>({id:s.id,mass:s.mass,anchor:s.anchor,inertia:{...capsule(s)},principal_frame:{x:0,y:0,z:0,w:1},rotation:i.rotation,world_com:ov(mul(rotate(normalize(aq(i.rotation)),av(s.anchor)),-1)),angular_velocity:i.angular[j],linear_velocity:i.linear[j]}));}
test('79 frozen matrix and independent pure geometry; zero worlds',()=>{
 assert.equal(matrix().length,75);assert.equal(new Set(matrix().map(c=>c.id)).size,75);assert.equal(matrix().filter(c=>c.kind==='motion').length,15);assert.equal(matrix().filter(c=>c.kind==='negative').length,10);assert.equal(matrix().filter(c=>c.kind==='core').length,50);
 for(const c of matrix()){
  const s=seed(c),a=command(c,s),signed=structuredClone(s);for(const b of signed)for(const k of ['x','y','z','w'])b.rotation[k]*=-1;assert.deepEqual(command(c,signed),a);
  for(const v of a.encoded_pair)assert.ok(exactWithinCap(v,.15));assert.ok(a.encoded_pair[0].every((v,j)=>Math.abs(v)<=Math.abs(a.requested_world_Nm[j])));
  assert.ok(initial(c).ideal_anchor_velocity_gap<=1e-10);assert.ok(stateMetrics(s).invariants.anchor_gap_m<1e-15);
  if(c.kind==='motion'){const expected=c.tilt==='co-rotation'?-.134:0;assert.equal(a.law.torso_world_Nm.x,expected);assert.equal(a.law.torso_world_Nm.y,0);assert.equal(a.law.torso_world_Nm.z,0);}
  if(c.mode!=='missing-reaction')assert.ok(a.partner_sum.every(v=>v===0));else assert.deepEqual(a.encoded_pair[1],[0,0,0]);
  if(c.kind==='core'&&c.mode==='on')assert.ok(dot(av(a.law.error_world_rad),a.requested_world_Nm)>0);
 }
});
test('79 world damping, yaw covariance/null, domain and units controls',()=>{
 const q=axis(1,0,0,.08),w={x:0,y:0,z:0},a=torque(q,w),yaw=axis(0,1,0,.7),b=torque(yaw.clone().multiply(q),w),expected=rotate(aq(yaw),av(a.torso_world_Nm));assert.ok(length(expected.map((v,j)=>v-av(b.torso_world_Nm)[j]))<1e-14);
 assert.deepEqual(torque(yaw,{x:0,y:.1,z:0}).torso_world_Nm,{x:0,y:0,z:0});assert.throws(()=>torque(axis(1,0,0,.201),w));
 const c=matrix()[0],s=seed(c),cmd=command(c,s);assert.equal(cmd.api,'addTorque');assert.equal(cmd.units,'Nm');assert.equal(cmd.requested_world_Nm[0],-.134);assert.notEqual(cmd.encoded_pair[0][0],Math.fround(-.134/60));
});

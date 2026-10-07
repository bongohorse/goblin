import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CONFIG,torque,upright} from '../scripts/torso-torque60-contract.js';
import {axis} from '../scripts/torso-torque60-oracle.js';
const zero={x:0,y:0,z:0};
test('upright yaw and quaternion sign invariance; bounded vector and out-of-domain rejection',()=>{
  for(const a of [0,.7,-2])assert.equal(upright(axis(0,1,0,a)).theta,0);
  const q=axis(1,0,0,.08),neg={x:-q.x,y:-q.y,z:-q.z,w:-q.w};assert.deepEqual(upright(q),upright(neg));
  const c=torque(q,{x:20,y:0,z:20});assert.ok(Math.hypot(...Object.values(c.torso_world_Nm))<=CONFIG.cap_Nm+1e-12);
  for(const k of ['x','y','z'])assert.equal(c.partner_world_Nm[k],-c.torso_world_Nm[k]);
  assert.throws(()=>upright(axis(1,0,0,Math.PI)));assert.throws(()=>upright(axis(1,0,0,.21)));assert.throws(()=>upright({x:0,y:0,z:0,w:0}));
});
test('world torso damping responds to co-rotation and leaves axial yaw free',()=>{
  const q={x:0,y:0,z:0,w:1};assert.equal(torque(q,{x:.1,y:0,z:0}).torso_world_Nm.x,-.134);
  assert.deepEqual(torque(q,{x:0,y:.1,z:0}).torso_world_Nm,zero);assert.deepEqual(torque(q,zero,'off').torso_world_Nm,zero);
  assert.ok(torque(axis(1,0,0,.08),zero).torso_world_Nm.x<0);assert.ok(torque(axis(1,0,0,.08),zero,'wrong-sign').torso_world_Nm.x>0);
});

import {initRapier} from '../src/labs/standing/simulation.js';
import {verifyFirstSteps,fixture} from '../scripts/torso-torque60-fixtures.js';
import {validateFirstSteps} from '../scripts/torso-torque60-reader.js';
await initRapier();
test('public mass initialization and rotated anisotropic impulse controls; preregistered misses remain failures',()=>{
  const f=fixture({connected:false,synthetic:true});try{assert.ok(f.state().every(s=>s.mass>0&&Object.values(s.inertia).every(v=>v>0)));assert.equal(f.world.bodies.len(),2);assert.equal(f.world.impulseJoints.len(),0);}finally{f.dispose();}
  const cases=verifyFirstSteps();validateFirstSteps(cases);assert.equal(cases.filter(c=>c.method==='impulse'&&c.pass).length,8);assert.equal(cases.filter(c=>!c.missing_reaction&&c.method==='torque'&&!c.pass).length,16);assert.equal(cases.at(-1).pass,true);
  for(const corrupt of [c=>c.pop(),c=>c[0].pre[0].mass=0,c=>c[0].pre[0].rotation.x=NaN,c=>c[0].post[0].inertia.x=Infinity,c=>c[0].pass=true,c=>c[0].direction.x=-1,c=>c[0].extra=0,c=>c[0].post[1].unknown=0,c=>c[0].discrete_momentum_residual=0]){const bad=structuredClone(cases);corrupt(bad);assert.throws(()=>validateFirstSteps(bad));}
});

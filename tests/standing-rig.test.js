import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import R from '@dimforge/rapier3d-compat';
import {StandingSimulation,initRapier} from '../src/labs/standing/simulation.js';
import {BASELINE,validateConfig} from '../src/labs/standing/config.js';
import {LabClock} from '../src/labs/standing/clock.js';
import {jointObservation,norm,sub,point,rotationDistance} from '../src/labs/standing/math.js';
await initRapier();
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);

test('lab config is immutable, validated and transitively independent from production',()=>{
  assert.ok(Object.isFrozen(BASELINE.bodies[0]));
  for(const mutate of [c=>c.bodies[0].mass=-1,c=>c.bodies[0].id='footL',c=>c.bodies[0].rotation.w=2,c=>c.joints[0].anchorA.x+=.1,c=>c.bodies[0].shape.radius=0,c=>c.fixed_dt=.01]){const c=structuredClone(BASELINE);mutate(c);assert.throws(()=>validateConfig(c));}
  const visited=new Set();
  function inspect(file){if(visited.has(file))return;visited.add(file);const source=fs.readFileSync(file,'utf8');for(const m of source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)){const dep=m[1];if(dep.startsWith('.')){const next=path.resolve(path.dirname(file),dep);assert.ok(next.includes(path.join('src','labs','standing'))||next.includes(path.join('docs','research','standing-lab')),next);if(next.endsWith('.js'))inspect(next);}else assert.ok(['ajv','@dimforge/rapier3d-compat'].includes(dep),dep);}}
  inspect(path.resolve('src/labs/standing/simulation.js'));
});

test('actual passive rig mass, COM, analytic inertia, anchors, limits and collisions match contract',()=>{
  const s=new StandingSimulation();try{
    assert.deepEqual(s.counts(),{bodies:15,colliders:16,joints:14});
    close([...s.bodies.values()].reduce((sum,e)=>sum+e.body.mass(),0),9.06);
    for(const {body,spec,collider} of s.bodies.values()){
      assert.equal(body.bodyType(),R.RigidBodyType.Dynamic);close(body.mass(),spec.mass);close(norm(sub(body.worldCom(),spec.position)),0);assert.equal(collider.parent().handle,body.handle);
      const sh=spec.shape,m=spec.mass;let expected;
      if(sh.type==='ball')expected=[.4*m*sh.radius**2,.4*m*sh.radius**2,.4*m*sh.radius**2];
      if(sh.type==='cuboid'){const h=sh.half;expected=[m*(h.y*h.y+h.z*h.z)/3,m*(h.x*h.x+h.z*h.z)/3,m*(h.x*h.x+h.y*h.y)/3];}
      if(sh.type==='capsule'){const r=sh.radius,h=sh.half,mc=m*(2*h)/(2*h+4*r/3),ms=m-mc;const transverse=mc*(r*r/4+h*h/3)+ms*(.4*r*r+h*h+.75*h*r);expected=[transverse,.5*mc*r*r+.4*ms*r*r,transverse];}
      // Principal axes may be permuted by Rapier. Compare unordered eigenvalues.
      const actual=Object.values(body.principalInertia()).sort((a,b)=>a-b);expected.sort((a,b)=>a-b);actual.forEach((n,i)=>close(n,expected[i]));
      assert.ok(Object.values(body.linvel()).every(n=>n===0));
    }
    for(const j of s.joints.values()){const o=jointObservation(j);assert.ok(o.anchor_error<1e-6);assert.equal(j.joint.contactsEnabled(),false);if(j.spec.limits){assert.ok(o.axis_error<1e-6);assert.ok(o.limit_violation<1e-6);close(j.joint.limitsMin(),j.spec.limits[0]);close(j.joint.limitsMax(),j.spec.limits[1]);}}
    for(const [key,value] of Object.entries(BASELINE.solver_config))if(key!=='additionalSolverIterations')close(s.world.integrationParameters[key],value);
    const hand=s.bodies.get('handL'),head=s.bodies.get('head');hand.body.setTranslation(head.body.translation(),true);s.world.propagateModifiedBodyPositionsToColliders();s.world.step();let n=0;s.world.contactPair(hand.collider,head.collider,m=>n+=m.numContacts());assert.ok(n>0,'nonadjacent collision remains active');
  }finally{s.dispose();}
});

test('fresh reset discards entire old world, events and maps over 20 cycles',()=>{
  const s=new StandingSimulation();try{
    const start=s.snapshot();const ids=new Set();for(let cycle=0;cycle<20;cycle++){
      const world=s.world,events=s.events,map=s.bodies;ids.add(s.runId);for(let i=0;i<60;i++)s.step();
      s.reset();assert.notEqual(s.world,world);assert.notEqual(s.events,events);assert.notEqual(s.bodies,map);assert.equal(map.size,0);assert.equal(world.bodies,undefined);assert.equal(s.steps,0);assert.equal(s.physicsTimes.length,0);assert.equal(s.invalid,null);assert.equal(s.paused,true);assert.deepEqual(s.snapshot(),start);assert.deepEqual(s.counts(),{bodies:15,colliders:16,joints:14});
    }assert.equal(ids.size,20);
  }finally{s.dispose();s.dispose();assert.throws(()=>s.step());assert.throws(()=>s.reset());}
});

test('one fixed step path, pause/resume/stall discard and passive fall remain bounded',()=>{
  const a=new StandingSimulation(),b=new StandingSimulation(),clock=new LabClock(BASELINE.fixed_dt);
  try{
    clock.advance(0,false,()=>a.step());for(let i=1;i<=60;i++)clock.advance(i/60,false,()=>a.step());for(let i=0;i<60;i++)b.step();assert.deepEqual(a.snapshot(),b.snapshot());
    const steps=a.steps;clock.advance(100,true,()=>a.step());clock.advance(200,false,()=>a.step());assert.equal(a.steps,steps);clock.advance(300,false,()=>a.step());assert.equal(a.steps,steps+3);a.step();assert.equal(a.steps,steps+4);
    for(let i=0;i<400;i++){a.step();assert.equal(a.invalid,null);}assert.ok(a.bodies.get('head').body.translation().y<1,'passive fall');
  }finally{a.dispose();b.dispose();}
});

test('hinge diagnostic reports real twist and asymmetric stops under torque',()=>{
  for(const [id,sign] of [['kneeL',1],['kneeL',-1],['elbowL',-1],['elbowL',1]]){
    const s=new StandingSimulation();try{
      s.world.gravity={x:0,y:0,z:0};const j=s.joints.get(id),parent=j.joint.body1(),child=j.joint.body2();
      for(const {body} of [...s.bodies.values()])if(body.handle!==parent.handle&&body.handle!==child.handle)s.world.removeRigidBody(body);
      parent.setBodyType(R.RigidBodyType.Fixed,true);child.applyTorqueImpulse({x:sign*.15,y:0,z:0},true);
      for(let i=0;i<360;i++)s.world.step();const o=jointObservation(j);assert.ok(o.limit_violation<.025);assert.ok(o.anchor_error<.005);
      if((id.startsWith('knee')&&sign===1)||(id.startsWith('elbow')&&sign===-1))assert.ok(Math.abs(o.angle)>.5);else assert.ok(Math.abs(o.angle)<.08);
      const independent=child.rotation();close(rotationDistance(independent,{x:Math.sin(o.angle/2),y:0,z:0,w:Math.cos(o.angle/2)}),0,.03);
      assert.ok(norm(sub(point(parent,j.joint.anchor1()),point(child,j.joint.anchor2())))<.005);
    }finally{s.dispose();}
  }
});

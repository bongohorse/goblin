import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {StandingSimulation,initRapier} from '../src/labs/standing/simulation.js';
import {BASELINE,validateResult,configIdentity} from '../src/labs/standing/config.js';
import {floorContacts,centreOfMass,termination,timingStats} from '../src/labs/standing/measurement.js';
import {vec,norm,sub,jointObservation} from '../src/labs/standing/math.js';
await initRapier();
const near=(a,b,eps=1e-4)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
function blockFixture(reverse=false,height=.5,gravity=-9.81){
  const world=new R.World(vec(0,gravity));world.timestep=BASELINE.fixed_dt;
  let floor;const addFloor=()=>world.createCollider(R.ColliderDesc.cuboid(3,.2,3).setTranslation(0,-.2,0));
  if(!reverse)floor=addFloor();
  const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,height,0).setCanSleep(false));
  const collider=world.createCollider(R.ColliderDesc.cuboid(.5,.5,.5).setMass(1),body);
  if(reverse)floor=addFloor();
  return {world,floor,body,collider,entries:[{spec:{id:'footL',collider_id:'collider:footL'},body,collider}]};
}

test('normal impulses, world points and signs calibrate 1 kg weight in either internal order',()=>{
  const rows=[];
  for(const reverse of [false,true]){const f=blockFixture(reverse);try{
    for(let i=0;i<240;i++)f.world.step();const contacts=floorContacts(f.world,f.floor,f.entries);
    assert.ok(contacts.length>=1);const force=contacts.reduce((sum,c)=>sum+c.normal_load,0);
    near(force,9.81,.02);for(const c of contacts){near(c.normal.y,1);near(c.normal.x,0);assert.ok(Math.abs(c.point.y)<.006);assert.ok(c.normal_impulse>=0);near(c.normal_load,c.normal_impulse/f.world.timestep);}
    rows.push({reverse,normal_load_N:force,contacts:contacts.length});
  }finally{f.world.free();}}
  console.log('Load calibration',rows);
});

test('exact initial contact detects touching/penetration; predictive gap never counts actual contact',()=>{
  const contact=blockFixture(false,.5);try{const c=floorContacts(contact.world,contact.floor,contact.entries,true);assert.ok(c.length);assert.equal(c[0].normal_load,null);assert.equal(c[0].normal_impulse,null);}finally{contact.world.free();}
  const gap=blockFixture(false,.51,0);try{
    gap.world.step();let pairPoints=0;gap.world.contactPair(gap.floor,gap.collider,m=>{pairPoints+=m.numContacts();for(let i=0;i<m.numContacts();i++)assert.ok(m.contactDist(i)>0);});assert.ok(pairPoints>0,'negative control actually has speculative manifold');assert.deepEqual(floorContacts(gap.world,gap.floor,gap.entries),[]);
  }finally{gap.world.free();}
});

test('COM velocity uses Rapier mass-centre velocity, not rotating body-origin velocity',()=>{
  const world=new R.World(vec());try{
    const a=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(1,2,0));world.createCollider(R.ColliderDesc.ball(.2).setTranslation(.5,0,0).setMass(2),a);
    const b=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(-1,0,0));world.createCollider(R.ColliderDesc.ball(.2).setMass(1),b);
    a.setLinvel(vec(1),true);a.setAngvel(vec(0,0,2),true);b.setLinvel(vec(0,3),true);
    const measured=centreOfMass([{body:a},{body:b}]);near(measured.com.x,2/3);near(measured.com.y,4/3);near(measured.com_velocity.x,2/3);near(measured.com_velocity.y,1);
    near(a.velocityAtPoint(a.worldCom()).y,0);near(a.velocityAtPoint(a.translation()).y,-1);
    const before={...measured.com};world.step();const after=centreOfMass([{body:a},{body:b}]);
    near((after.com.x-before.x)/world.timestep,measured.com_velocity.x);near((after.com.y-before.y)/world.timestep,measured.com_velocity.y);
  }finally{world.free();}
  const sim=new StandingSimulation();try{for(const {body} of sim.bodies.values())body.setTranslation({...body.translation(),x:body.translation().x+3,z:body.translation().z+4},true);const current=centreOfMass(sim.bodies.values());near(Math.hypot(current.com.x-sim.initialCom.x,current.com.z-sim.initialCom.z),5);const j=sim.joints.get('neck');j.joint.setAnchor1({...j.joint.anchor1(),x:.02});near(jointObservation(j).anchor_error,.02,1e-5);}finally{sim.dispose();}
});

test('feet allowed, simultaneous nonfeet canonically latched once, endstep contact beats timeout',async()=>{
  const f=blockFixture();try{
    for(let i=0;i<30;i++)f.world.step();const feet=floorContacts(f.world,f.floor,f.entries);assert.ok(feet.length);assert.equal(termination(feet,BASELINE,30),null);
    const nonfeet=feet.flatMap(c=>[{...c,body_id:'handR'},{...c,body_id:'handL'}]);const t=termination(nonfeet,BASELINE,3600);
    assert.equal(t.termination_reason,'non_foot_contact');assert.deepEqual(t.failure_bodies,['handL','handR']);assert.equal(t.failure_body,'handL');assert.equal(t.standing_time,60);
  }finally{f.world.free();}
  // Two real non-foot bodies touch in the same Rapier step; insertion order is reversed.
  const world=new R.World(vec(0,-9.81));try{
    const floor=world.createCollider(R.ColliderDesc.cuboid(3,.2,3).setTranslation(0,-.2,0));const entries=[];
    for(const [id,x] of [['handR',-1],['handL',1]]){const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x,.5,0));const collider=world.createCollider(R.ColliderDesc.ball(.5).setMass(1),body);entries.push({spec:{id,collider_id:'collider:'+id},body,collider});}
    world.step();const contacts=floorContacts(world,floor,entries);assert.deepEqual([...new Set(contacts.map(c=>c.body_id))],['handL','handR']);assert.deepEqual(termination(contacts,BASELINE,3600).failure_bodies,['handL','handR']);
  }finally{world.free();}
  const sim=new StandingSimulation();try{while(!sim.terminal)sim.step();assert.equal(sim.terminal.termination_reason,'non_foot_contact');const before=await sim.result();assert.equal(sim.step(),false);assert.deepEqual(await sim.result(),before);assert.ok(before.simulation_steps>0);assert.equal(before.failure_step,before.simulation_steps);near(before.standing_time,before.simulation_steps/60,1e-12);assert.equal(sim.invalid,null);}finally{sim.dispose();}
});

test('nonfoot start contact has time zero with all IDs; zero-gravity calibration timeout has 3600 steps',async()=>{
  const shifted=structuredClone(BASELINE);for(const b of shifted.bodies)b.position.y-=1;for(const j of shifted.joints)j.position.y-=1;
  const s=new StandingSimulation(shifted);try{assert.equal(s.terminal.termination_reason,'invalid_start');assert.equal(s.steps,0);assert.equal(s.terminal.standing_time,0);assert.ok(s.terminal.failure_bodies.includes('handL'));assert.equal(s.step(),false);validateResult(await s.result());}finally{s.dispose();}
  const c=structuredClone(BASELINE);c.gravity=vec();const timeout=new StandingSimulation(c);try{while(!timeout.terminal)timeout.step();assert.equal(timeout.steps,3600);assert.equal(timeout.terminal.termination_reason,'timeout');assert.equal(timeout.terminal.standing_time,60);assert.deepEqual(timeout.terminal.failure_bodies,[]);}finally{timeout.dispose();}
});

test('invalid/missing body never exports success, hashes deterministic and snapshot result immutable',async()=>{
  const s=new StandingSimulation();try{
    assert.equal((await s.result()).standing_time,null);s.world.removeRigidBody(s.bodies.get('head').body);s.step();const r=await s.result();assert.equal(r.termination_reason,'invalid_simulation');assert.equal(r.standing_time,null);assert.equal(r.telemetry,null);assert.ok(Object.isFrozen(r.config.bodies));assert.ok(r.invalid_detail);validateResult(r);
    const a=await configIdentity(BASELINE),b=await configIdentity(JSON.parse(JSON.stringify(BASELINE)));assert.deepEqual(a,b);
    const altered=structuredClone(BASELINE);altered.gravity.x=.1;assert.notEqual((await configIdentity(altered)).config_id,a.config_id);
    const bad=structuredClone(r);bad.extra=true;assert.throws(()=>validateResult(bad));
    const captured=s.result();s.reset();assert.equal((await captured).run_id,r.run_id,'reset cannot mix async export');
  }finally{s.dispose();}
  assert.deepEqual(timingStats([]),{count:0,min:null,mean:null,p95:null,max:null});assert.equal(timingStats([1,3,2]).mean,2);
});

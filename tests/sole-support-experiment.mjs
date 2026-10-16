import R from '@dimforge/rapier3d-compat';
import {Quaternion} from 'three';
import {writeFileSync} from 'node:fs';
import {fallenCase} from './getup-fixture.js';
import {SoleSupportRise} from '../src/sole-support-rise.js';
import {ContactGetup} from '../src/contact-getup.js';
import {observeGetup,jointRotation} from '../src/getup-observation.js';
import {plannedBodies,plannedSelfContacts,actualSelfContacts} from '../src/pose-audit.js';
await R.init();const dt=1/60;
export function jointErrors(rig,motors){return Object.fromEntries(Object.entries(motors).map(([id,goal])=>{
 const {spec}=rig.joints.get(id),a=rig.byId.get(spec.parent).body,b=rig.byId.get(spec.child).body;
 const error=typeof goal==='number'?Math.abs(Math.atan2(Math.sin(jointRotation(rig,spec).x-goal),Math.cos(jointRotation(rig,spec).x-goal))):new Quaternion().copy(a.rotation()).invert().multiply(new Quaternion().copy(b.rotation())).angleTo(new Quaternion().copy(goal));
 return [id,error];
}));}
export function soleAttempt({friction=null,unloadDiagnostic=false}={}){
 const f=fallenCase(R,-1);let c,free;
 try{if(friction!==null){f.floor.setFriction(friction);for(const {collider} of f.rig.byId.values())collider.setFriction(friction);}
  c=new SoleSupportRise(R,f.world,f.rig,f.floor);const trace=[];let lastGoals;
  for(let i=0;i<420&&!c.disposed;i++){
   for(const {body} of f.rig.byId.values())body.resetTorques(false);
   const pre={time:i*dt,observation:observeGetup(f.world,f.rig,f.floor)};c.step(dt);lastGoals=structuredClone(c.planning?.motors);
   const actuation={time:i*dt,active:!c.disposed,commands:Object.fromEntries([...c.motors].map(([id,m])=>[id,{goal:structuredClone(m.command?.target),limitedGoal:m.spec.type==='spherical'?{...m.joint.frameX1()}:m.current,perAxisCap:m.command?.force}]))};
   f.world.step();const post={time:(i+1)*dt,observation:observeGetup(f.world,f.rig,f.floor),errors:jointErrors(f.rig,lastGoals),bodies:Object.fromEntries([...f.rig.byId].map(([id,{body}])=>[id,{position:{...body.translation()},rotation:{...body.rotation()}}]))};
   if(i%15===14||c.disposed)trace.push({pre,actuation,post,phase:c.phase,progress:c.progress,dwell:c.dwell,feedback:c.feedback,planned:structuredClone(c.planning),plannedSelfContacts:plannedSelfContacts(f.rig,plannedBodies(f.rig,c.pose,lastGoals)),actualSelfContacts:actualSelfContacts(f.world,f.rig)});
  }
  const result={direction:-1,friction,phase:c.phase,time:c.elapsed,progress:c.progress,dwell:c.dwell,trace};
  if(unloadDiagnostic){
   // Decisive control experiment only, AFTER failed actual-load attempt.
   // No pose reset. Remove external load/contact; do not count this as support/get-up.
   c.stop('diagnostic-boundary');f.world.gravity={x:0,y:0,z:0};f.floor.setSensor(true);
   free=new ContactGetup(R,f.world,f.rig,f.floor);
   const before=jointErrors(f.rig,lastGoals);
   for(let i=0;i<600;i++){for(const [id,goal] of Object.entries(lastGoals))free.motor(id,goal,['spine','neck','wristL','wristR','ankleL','ankleR'].includes(id)?12:20);free.flush(dt);f.world.step();}
   result.unloadedDiagnostic={before,after:jointErrors(f.rig,lastGoals),selfContacts:actualSelfContacts(f.world,f.rig)};
   // Second control isolates self-contact, not a proposed collision policy.
   for(const {collider} of f.rig.byId.values())collider.setSensor(true);
   for(let i=0;i<600;i++){for(const [id,goal] of Object.entries(lastGoals))free.motor(id,goal,['spine','neck','wristL','wristR','ankleL','ankleR'].includes(id)?12:20);free.flush(dt);f.world.step();}
   result.unloadedDiagnostic.sensorOnlyErrors=jointErrors(f.rig,lastGoals);
  }
  result.bodies=f.world.bodies.len();result.joints=f.world.impulseJoints.len();return result;
 }finally{free?.stop('teardown');c?.stop('teardown');f.world.free();}
}
if(process.argv[1]?.endsWith('sole-support-experiment.mjs')){const results=[soleAttempt(),soleAttempt({friction:2})];if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({phase:r.phase,time:r.time,progress:r.progress,friction:r.friction,last:r.trace.at(-1)})),null,2));}

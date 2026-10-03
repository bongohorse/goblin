import R from '@dimforge/rapier3d-compat';
import {writeFileSync} from 'node:fs';
import {fallenCase} from './getup-fixture.js';
import {observeGetup} from '../src/getup-observation.js';
import {ContactGetup} from '../src/contact-getup.js';
await R.init();
function trial(direction){
 const {world,rig,floor}=fallenCase(R,direction);let controller;
 try{
  const initial=observeGetup(world,rig,floor);controller=new ContactGetup(R,world,rig,floor);
  const sample=time=>({time,phase:controller.phase,footStep:structuredClone(controller.footStep),targets:structuredClone(controller.targets),placement:structuredClone(controller.placement),...observeGetup(world,rig,floor),parts:[...rig.byId].map(([id,{body}])=>({id,position:{...body.translation()},rotation:{...body.rotation()}}))});
  const trace=[sample(0)];let quietFrames=0;
  for(let i=0;i<1200;i++){
   for(const {body} of rig.byId.values())body.resetTorques(false);
   controller.step(1/60);world.step();quietFrames+=Number(observeGetup(world,rig,floor).standing);
   if((i+1)%30===0)trace.push(sample((i+1)/60));
  }
  return {direction,initialPose:initial.pose,initial,phase:controller.phase,transitions:controller.transitions,quietFrames,success:controller.phase==='stand',recoveryResets:0,bodies:world.bodies.len(),joints:world.impulseJoints.len(),finalIterationValues:[...new Set([...rig.byId.values()].map(e=>e.body.additionalSolverIterations()))],trace};
 }finally{controller?.stop('teardown');world.free();}
}
const report={results:[trial(-1),trial(1)]};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.results.map(({trace,...r})=>r),null,2));

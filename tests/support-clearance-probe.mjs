// Static counterfactual, NOT a physically achieved pose or controller phase.
import R from '@dimforge/rapier3d-compat';
import {Quaternion,Euler} from 'three';
import {readFileSync,writeFileSync} from 'node:fs';
import {createGoblinRig} from '../src/goblin-rig.js';
import {plannedBodies,plannedSelfContacts} from '../src/pose-audit.js';
await R.init();
const target=JSON.parse(readFileSync(new URL('./fixtures/g3-blocked-pose.json',import.meta.url)));
const world=new R.World({x:0,y:0,z:0}),rig=createGoblinRig(R,world);
try {
 const original=plannedBodies(rig,target.pose,target.motors);
 const cases=[0,-.2,-.3].map(delta=>{
  const motors=structuredClone(target.motors);
  for(const side of ['L','R']){
   const e=new Euler().setFromQuaternion(new Quaternion().copy(motors['hip'+side]),'XYZ');e.x+=delta;
   const q=new Quaternion().setFromEuler(e);motors['hip'+side]={x:q.x,y:q.y,z:q.z,w:q.w};
  }
  const bodies=plannedBodies(rig,target.pose,motors);
  return {hipPitchDelta:delta,collisions:plannedSelfContacts(rig,bodies),feet:Object.fromEntries(['L','R'].map(side=>{
   const id='foot'+side,a=original[id].position,b=bodies[id].position;
   return [side,{position:b,displacement:{x:b.x-a.x,y:b.y-a.y,z:b.z-a.z}}];
  }))};
 });
 const result={diagnosticOnly:true,source:'g3-blocked-pose.json; change hip relative pitch only, retain other joint goals',cases};
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
} finally {world.free();}

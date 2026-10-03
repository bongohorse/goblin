import R from '@dimforge/rapier3d-compat';import {writeFileSync} from 'node:fs';import {Euler,Quaternion} from 'three';import {fallenCase} from './getup-fixture.js';import {captureSupports,supportPose} from '../src/support-path.js';await R.init();
// Bounded necessary-geometry search, not an impossibility or physical support proof.
const results=[];
for(const direction of [-1,1]){const f=fallenCase(R,direction);try{const supports=captureSupports(f.rig),root=f.rig.byId.get('pelvis').body,e=new Euler().setFromQuaternion(new Quaternion().copy(root.rotation()).normalize(),'XYZ');let count=0,best=null;
 const bounds=direction<0?{pitch:[-2.1,-.8],y:[.45,.85],z:[-.35,.2]}:{pitch:[.8,2.1],y:[.5,1.15],z:[.05,.7]};
 for(let pi=bounds.pitch[0];pi<=bounds.pitch[1]+1e-9;pi+=.05)for(let y=bounds.y[0];y<=bounds.y[1]+1e-9;y+=.025)for(let z=bounds.z[0];z<=bounds.z[1]+1e-9;z+=.025)for(const spine of [-.3,0,.3])for(const neck of [-.4,0,.4]){
 const p=supportPose(f.rig,supports,{position:{x:root.translation().x,y,z},pitch:pi,yaw:e.y,roll:e.z,spine,neck});if(p.feasible){count++;if(!best||p.headClearance>best.headClearance)best=p;}}
 results.push({direction,bounds,steps:{pitch:.05,position:.025,spine:[-.3,0,.3],neck:[-.4,0,.4]},count,best});
 }finally{f.world.free();}}
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({...r,best:r.best&&{pose:r.best.pose,headClearance:r.best.headClearance,limbs:r.best.limbs}})),null,2));

import {Quaternion,Euler,Vector3} from 'three';
import {worldAnchor} from './goblin-rig.js';
export function plannedBodies(rig,pose,motors){
 const bodies={pelvis:{position:pose.position,rotation:new Quaternion().setFromEuler(new Euler(pose.pitch,pose.yaw||0,pose.roll||0,'XYZ'))}};
 for(const {spec} of rig.joints.values()){
  const parent=bodies[spec.parent],target=motors[spec.id];
  const local=typeof target==='number'?new Quaternion().setFromAxisAngle(new Vector3(1,0,0),target):new Quaternion().copy(target);
  const rotation=parent.rotation.clone().multiply(local),a=new Vector3(...Object.values(spec.anchorA)).applyQuaternion(parent.rotation),b=new Vector3(...Object.values(spec.anchorB)).applyQuaternion(rotation);
  bodies[spec.child]={position:{x:parent.position.x+a.x-b.x,y:parent.position.y+a.y-b.y,z:parent.position.z+a.z-b.z},rotation};
 }return bodies;
}
export function plannedSelfContacts(rig,bodies,tolerance=.001){
 const adjacent=new Set([...rig.joints.values()].map(({spec})=>[spec.parent,spec.child].sort().join(':'))),contacts=[];
 const entries=[...rig.byId];for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
  const [a,ea]=entries[i],[b,eb]=entries[j];if(adjacent.has([a,b].sort().join(':')))continue;
  const pa=bodies[a],pb=bodies[b],contact=ea.collider.shape.contactShape(pa.position,pa.rotation,eb.collider.shape,pb.position,pb.rotation,0);
  if(contact&&contact.distance<-tolerance)contacts.push({a,b,penetration:-contact.distance});
 }return contacts;
}
export function actualSelfContacts(world,rig,dt=1/60){
 const contacts=[];for(const [id,{collider}] of rig.byId)world.contactPairsWith(collider,other=>{
  const entry=rig.byCollider.get(other.handle);if(!entry||id>=entry.spec.id)return;
  world.contactPair(collider,other,manifold=>{let force=0,penetration=0;for(let i=0;i<manifold.numContacts();i++){force+=manifold.contactImpulse(i)/dt;penetration=Math.max(penetration,-manifold.contactDist(i));}if(force>.5)contacts.push({a:id,b:entry.spec.id,force,penetration});});
 });return contacts;
}

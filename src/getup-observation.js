import {rotateVector} from './goblin-rig.js';
const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
export function supportHull(points){
  const sorted=[...points].sort((a,b)=>a.x-b.x||a.z-b.z).filter((p,i,a)=>!i||Math.hypot(p.x-a[i-1].x,p.z-a[i-1].z)>1e-6);
  if(sorted.length<3)return sorted;
  const half=list=>{const h=[];for(const p of list){while(h.length>1&&cross(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p);}return h;};
  return [...half(sorted).slice(0,-1),...half(sorted.reverse()).slice(0,-1)];
}
export function supportMargin(point,hull){
  if(hull.length<3)return -Infinity;
  let margin=Infinity;for(let i=0;i<hull.length;i++){const a=hull[i],b=hull[(i+1)%hull.length];margin=Math.min(margin,cross(a,b,point)/Math.hypot(b.x-a.x,b.z-a.z));}return margin;
}
const multiply=(a,b)=>({x:a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,y:a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,z:a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,w:a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z});
export function jointRotation(rig,spec){
  const a=rig.byId.get(spec.parent).body.rotation(),b=rig.byId.get(spec.child).body.rotation();
  const q=multiply({x:-a.x,y:-a.y,z:-a.z,w:a.w},b);
  // Signed axis twist diagnostics, not Euler angles; invariant to q / -q.
  const twist=v=>2*Math.atan2(v,q.w),wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
  return {x:wrap(twist(q.x)),y:wrap(twist(q.y)),z:wrap(twist(q.z))};
}
export function observeGetup(world,rig,floor,dt=1/60){
  const com={x:0,y:0,z:0},velocity={x:0,y:0,z:0};let mass=0;
  const contacts=[];let maxSpeed=0,maxAngularSpeed=0;
  for(const [id,{body,collider}] of rig.byId){
    const m=body.mass(),p=body.worldCom(),v=body.linvel();mass+=m;maxSpeed=Math.max(maxSpeed,Math.hypot(v.x,v.y,v.z));const angular=body.angvel();maxAngularSpeed=Math.max(maxAngularSpeed,Math.hypot(angular.x,angular.y,angular.z));
    for(const axis of ['x','y','z']){com[axis]+=m*p[axis];velocity[axis]+=m*v[axis];}
    world.contactPair(collider,floor,(manifold,flipped)=>{
      const normal=manifold.normal(),upward=flipped?normal.y:-normal.y;if(upward<.8)return;
      let force=0;for(let i=0;i<manifold.numContacts();i++)force+=manifold.contactImpulse(i)/dt;
      const points=[];for(let i=0;i<manifold.numSolverContacts();i++){const p=manifold.solverContactPoint(i);if(p&&manifold.solverContactDist(i)<.01)points.push({...p});}
      contacts.push({id,force,points});
    });
  }
  for(const axis of ['x','y','z']){com[axis]/=mass;velocity[axis]/=mass;}
  const loaded=contacts.filter(c=>c.force>.5),feet=loaded.filter(c=>c.id.startsWith('foot')),limbs=loaded.filter(c=>c.id.startsWith('foot')||c.id.startsWith('hand'));
  const hull=supportHull(limbs.flatMap(c=>c.points)),footHull=supportHull(feet.flatMap(c=>c.points));
  const torso=rig.byId.get('torso').body,up=rotateVector({x:0,y:1,z:0},torso.rotation()),forward=rotateVector({x:0,y:0,z:1},torso.rotation());
  const footForce=feet.reduce((n,c)=>n+c.force,0),weight=mass*9.81;
  const footMargin=supportMargin(com,footHull);
  const selfContacts=[];
  for(const a of ['head','torso'])for(const b of ['upperArmL','upperArmR','lowerArmL','lowerArmR','handL','handR'])world.contactPair(rig.byId.get(a).collider,rig.byId.get(b).collider,m=>{
    let force=0;for(let i=0;i<m.numContacts();i++)force+=m.contactImpulse(i)/dt;
    if(force>.5)selfContacts.push({a,b,force});
  });
  return {com,velocity,maxSpeed,maxAngularSpeed,weight,contacts,selfContacts,hull,footHull,margin:supportMargin(com,hull),footMargin,footForce,upY:up.y,pose:forward.y>.6?'back':forward.y<-.6?'belly':null,angles:Object.fromEntries([...rig.joints].map(([id,{spec}])=>[id,jointRotation(rig,spec)])),standing:up.y>.94&&rig.byId.get('head').body.translation().y>1.8&&Math.hypot(velocity.x,velocity.y,velocity.z)<.12&&maxSpeed<.25&&maxAngularSpeed<.7&&footForce>.7*weight&&footMargin>-.02};
}

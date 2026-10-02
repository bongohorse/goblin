// Rig v1: metres, +Y up, +Z forward; character-left is +X.
// These stable semantic IDs are shared by physics, picking and the future asset adapter.
export const RIG_VERSION = 1;
const v = (x=0,y=0,z=0)=>({x,y,z});
const identity = {x:0,y:0,z:0,w:1};
export function rotateVector(p,q){
  const tx=2*(q.y*p.z-q.z*p.y), ty=2*(q.z*p.x-q.x*p.z), tz=2*(q.x*p.y-q.y*p.x);
  return v(p.x+q.w*tx+q.y*tz-q.z*ty,p.y+q.w*ty+q.z*tx-q.x*tz,p.z+q.w*tz+q.x*ty-q.y*tx);
}
export function worldAnchor(body,anchor){
  const r=rotateVector(anchor,body.rotation()),p=body.translation();
  return v(p.x+r.x,p.y+r.y,p.z+r.z);
}
const parts=[];
const add=(id,position,shape,mass,rotation=identity)=>{
  const part={id,bone:id,position,rotation,shape,mass,friction:id.startsWith('foot')?1:.7,linearDamping:.35,angularDamping:1.3};
  parts.push(part); return part;
};
const capsule=(half,radius)=>({type:'capsule',half,radius});
add('pelvis',v(0,1.14,0),capsule(.09,.20),1.6);
add('torso',v(0,1.49,0),capsule(.15,.24),2);
add('head',v(0,2.30,0),{type:'ball',radius:.48},1.4);
const jointSpecs=[];
function connect(id,parent,child,position,type='spherical',limits=null){
  const local=(part)=>rotateVector(v(position.x-part.position.x,position.y-part.position.y,position.z-part.position.z),{x:-part.rotation.x,y:-part.rotation.y,z:-part.rotation.z,w:part.rotation.w});
  const a=parts.find(p=>p.id===parent),b=parts.find(p=>p.id===child);
  jointSpecs.push({id,parent,child,position,type,anchorA:local(a),anchorB:local(b),axis:v(1,0,0),limits});
}
connect('spine','pelvis','torso',v(0,1.34,0),'revolute',[-.3,.3]);
connect('neck','torso','head',v(0,1.83,0),'revolute',[-.45,.45]);
for(const [suffix,side] of [['L',1],['R',-1]]){
  const angle=side*.55,rotation={x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)};
  const shoulder=v(side*.31,1.64,0),down=rotateVector(v(0,-1,0),rotation);
  const at=distance=>v(shoulder.x+down.x*distance,shoulder.y+down.y*distance,0);
  add(`upperArm${suffix}`,at(.18),capsule(.12,.09),.35,rotation);
  add(`lowerArm${suffix}`,at(.52),capsule(.10,.085),.25,rotation);
  add(`hand${suffix}`,at(.79),{type:'ball',radius:.115},.18,rotation);
  connect(`shoulder${suffix}`,'torso',`upperArm${suffix}`,shoulder);
  connect(`elbow${suffix}`,`upperArm${suffix}`,`lowerArm${suffix}`,at(.36),'revolute',[-2.35,.05]);
  connect(`wrist${suffix}`,`lowerArm${suffix}`,`hand${suffix}`,at(.68),'revolute',[-.35,.35]);
  add(`upperLeg${suffix}`,v(side*.16,.84,0),capsule(.12,.12),.55);
  add(`lowerLeg${suffix}`,v(side*.16,.44,0),capsule(.12,.105),.4);
  add(`foot${suffix}`,v(side*.16,.12,.08),{type:'cuboid',half:v(.13,.10,.22)},.3);
  connect(`hip${suffix}`,'pelvis',`upperLeg${suffix}`,v(side*.16,1.04,0));
  connect(`knee${suffix}`,`upperLeg${suffix}`,`lowerLeg${suffix}`,v(side*.16,.64,0),'revolute',[-.05,2.3]);
  connect(`ankle${suffix}`,`lowerLeg${suffix}`,`foot${suffix}`,v(side*.16,.24,0),'revolute',[-.4,.4]);
}
export const RIG_PARTS = parts;
export const RIG_JOINTS = jointSpecs;

export function createGoblinRig(RAPIER,world){
  const byId=new Map(),byBody=new Map(),byCollider=new Map(),joints=new Map();
  for(const spec of RIG_PARTS){
    const s=spec.shape;
    const desc=RAPIER.RigidBodyDesc.dynamic().setTranslation(spec.position.x,spec.position.y,spec.position.z).setRotation(spec.rotation).setLinearDamping(spec.linearDamping).setAngularDamping(spec.angularDamping);
    const body=world.createRigidBody(desc);
    const shape=s.type==='ball'?RAPIER.ColliderDesc.ball(s.radius):s.type==='capsule'?RAPIER.ColliderDesc.capsule(s.half,s.radius):RAPIER.ColliderDesc.cuboid(s.half.x,s.half.y,s.half.z);
    const collider=world.createCollider(shape.setMass(spec.mass).setFriction(spec.friction).setRestitution(.03),body);
    const entry={spec,body,collider,joints:[]};
    byId.set(spec.id,entry);byBody.set(body.handle,entry);byCollider.set(collider.handle,entry);
  }
  for(const spec of RIG_JOINTS){
    const a=byId.get(spec.parent),b=byId.get(spec.child);
    const data=spec.type==='revolute'?RAPIER.JointData.revolute(spec.anchorA,spec.anchorB,spec.axis):RAPIER.JointData.spherical(spec.anchorA,spec.anchorB);
    const joint=world.createImpulseJoint(data,a.body,b.body,true);
    joint.setContactsEnabled(false); // Only adjacent partners; other self collisions remain enabled.
    if(spec.limits)joint.setLimits(...spec.limits);
    joints.set(spec.id,{spec,joint});a.joints.push(spec.id);b.joints.push(spec.id);
  }
  return {byId,byBody,byCollider,joints,
    reset(){for(const {body,spec} of byId.values()){
      body.setTranslation(spec.position,true);body.setRotation(spec.rotation,true);
      body.setLinvel(v(),true);body.setAngvel(v(),true);body.resetForces(false);body.resetTorques(false);
    }},
    dispose(){for(const {body} of byId.values())world.removeRigidBody(body);byId.clear();byBody.clear();byCollider.clear();joints.clear();}
  };
}

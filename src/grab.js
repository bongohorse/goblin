import * as THREE from 'three';

export const GRAB_LIMITS=Object.freeze({force:120,acceleration:80,speed:10,reach:3,throwSpeed:8,throwThreshold:1,historySeconds:.1,smoothingSeconds:.035});
const vec=v=>new THREE.Vector3(v.x,v.y,v.z);
const quat=q=>new THREE.Quaternion(q.x,q.y,q.z,q.w);
const cap=(v,n)=>{if(v.lengthSq()>n*n)v.setLength(n);return v;};

export class ContactGrab {
  constructor(world,RAPIER){this.world=world;this.RAPIER=RAPIER;this.connection=null;this.lastRelease=null;}
  get active(){return this.connection!==null;}
  get body(){return this.connection?.body??null;}
  begin(body,point,now,loadMass){
    this.cancel('replace');
    if(!body.isValid()||!body.isDynamic()||body.mass()<=0)return false;
    loadMass=Math.max(body.mass(),loadMass??body.mass());
    const local=vec(point).sub(vec(body.translation())).applyQuaternion(quat(body.rotation()).invert());
    const R=this.RAPIER,anchor=this.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(point.x,point.y,point.z));
    const joint=this.world.createImpulseJoint(R.JointData.spring(0,loadMass*360,loadMass*36,local,{x:0,y:0,z:0}),body,anchor,true);
    const force=Math.min(GRAB_LIMITS.force,loadMass*GRAB_LIMITS.acceleration);
    const solverIterations=body.additionalSolverIterations();
    if(loadMass>body.mass())body.setAdditionalSolverIterations(solverIterations+4);
    // Rapier 0.21's spring couples all linear axes through its LinX motor.
    // SpringImpulseJoint has no JS setter; use the installed public raw-set API.
    this.world.impulseJoints.raw.jointSetMotorMaxForce(joint.handle,R.JointAxis.LinX,force);
    this.connection={body,local,anchorBody:anchor,joint,solverIterations,loadMass,target:vec(point),origin:vec(point),velocity:new THREE.Vector3(),lastSample:now,lastMotion:now,force};
    this.lastRelease=null;body.wakeUp();return true;
  }
  anchor(){const c=this.connection;return c.local.clone().applyQuaternion(quat(c.body.rotation())).add(vec(c.body.translation()));}
  move(point,now,final=false){
    const c=this.connection;if(!c)return;
    const dt=now-c.lastSample;if(dt<=0)return;
    const target=vec(point),offset=target.clone().sub(c.origin);cap(offset,GRAB_LIMITS.reach);target.copy(c.origin).add(offset);
    const delta=target.clone().sub(c.target);
    // Only a duplicate release coordinate is not a movement sample. Genuine
    // stationary pointermove samples must damp the recent gesture toward zero.
    if(final&&delta.lengthSq()<1e-10)return;
    const velocity=cap(delta.clone().divideScalar(dt),GRAB_LIMITS.speed);
    c.velocity.lerp(velocity,1-Math.exp(-dt/GRAB_LIMITS.smoothingSeconds));
    if(delta.lengthSq()>1e-10)c.lastMotion=now;
    c.target.copy(target);c.lastSample=now;
  }
  pointerVelocity(now){
    const c=this.connection,age=Math.max(0,now-c.lastSample);
    if(now-c.lastMotion>=GRAB_LIMITS.historySeconds)return new THREE.Vector3();
    // A 30Hz input stream must not lose strength between its normal samples.
    return c.velocity.clone().multiplyScalar(Math.exp(-Math.max(0,age-1/30)/GRAB_LIMITS.smoothingSeconds));
  }
  step(dt){
    const c=this.connection;if(!c)return;
    if(!c.body.isValid()){this.cancel('removed');return;}
    const next=vec(c.anchorBody.translation());
    const driveSpeed=Math.min(GRAB_LIMITS.speed,GRAB_LIMITS.throwSpeed/Math.sqrt(Math.max(1,c.body.mass())));
    next.add(cap(c.target.clone().sub(next),driveSpeed*dt));
    c.anchorBody.setNextKinematicTranslation(next);c.body.wakeUp();
  }
  release(now){
    const c=this.connection;if(!c)return;
    if(!c.body.isValid()){this.cancel('removed');return;}
    const velocity=this.pointerVelocity(now),body=c.body;
    this.detach(); // No last spring impulse on the following contact-solver step.
    let threw=false;
    if(velocity.length()>=GRAB_LIMITS.throwThreshold){
      // Correct only a missing velocity component along the gesture. Keep
      // gravity/contact motion perpendicular to it and never boost faster motion.
      cap(velocity,GRAB_LIMITS.throwSpeed/Math.sqrt(Math.max(1,body.mass())));
      const speed=velocity.length(),direction=velocity.divideScalar(speed),current=vec(body.linvel()),along=current.dot(direction);
      const transverse=current.clone().addScaledVector(direction,-along);
      const desired=Math.min(speed,Math.sqrt(Math.max(0,GRAB_LIMITS.speed**2-transverse.lengthSq())));
      if(current.length()<=GRAB_LIMITS.speed&&desired>along)body.applyImpulse(direction.multiplyScalar((desired-along)*body.mass()),true);
      threw=true;
    }
    this.lastRelease={reason:'release',threw,speed:vec(body.linvel()).length()};
  }
  cancel(reason='cancel'){
    if(this.connection)this.lastRelease={reason,threw:false};
    this.detach();
  }
  detach(){
    const c=this.connection;
    if(c){if(c.body.isValid())c.body.setAdditionalSolverIterations(c.solverIterations);if(c.joint.isValid())this.world.removeImpulseJoint(c.joint,true);if(c.anchorBody.isValid())this.world.removeRigidBody(c.anchorBody);}
    this.connection=null;
  }
  get diagnostics(){
    const c=this.connection;
    return c?{active:true,body:c.body.handle,local:{...c.local},anchor:{...this.anchor()},target:{...c.target},forceLimit:c.force,connections:1}:
      {active:false,connections:0,lastRelease:this.lastRelease};
  }
}

// Direct collider queries avoid broad-phase poses left over from the last simulation step.
export function pickBody(RAPIER,world,handles,origin,direction){
  const ray=new RAPIER.Ray(origin,direction);let nearest=null;
  for(const handle of handles){
    const body=world.getRigidBody(handle);if(!body?.isDynamic())continue;
    for(let j=0;j<body.numColliders();j++){
      const hit=body.collider(j).castRayAndGetNormal(ray,80,true);
      if(hit&&(!nearest||hit.timeOfImpact<nearest.distance))nearest={body,distance:hit.timeOfImpact,hit:{point:vec(ray.pointAt(hit.timeOfImpact))}};
    }
  }
  return nearest;
}

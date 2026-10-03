import * as THREE from 'three';

export const GRAB_LIMITS=Object.freeze({force:120,acceleration:80,speed:10,angularSpeed:18,reach:3,throwSpeed:8,throwThreshold:1,historySeconds:.1,smoothingSeconds:.035});
const vec=v=>new THREE.Vector3(v.x,v.y,v.z);
const quat=q=>new THREE.Quaternion(q.x,q.y,q.z,q.w);
const cap=(v,n)=>{if(v.lengthSq()>n*n)v.setLength(n);return v;};

// Point velocity response to a unit impulse: invMass*J + (I^-1*(r x J)) x r.
// Solving the implicit spring through this matrix includes off-centre rotational inertia.
function pointResponse(body,point){
  const r=point.clone().sub(vec(body.worldCom())),i=body.effectiveWorldInvInertia();
  const inertia=new THREE.Matrix3().set(i.m11,i.m12,i.m13,i.m21,i.m22,i.m23,i.m31,i.m32,i.m33);
  const columns=[new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1)].map(axis=>
    new THREE.Vector3().crossVectors(r,axis).applyMatrix3(inertia).cross(r).addScaledVector(axis,body.invMass()));
  return new THREE.Matrix3().set(columns[0].x,columns[1].x,columns[2].x,columns[0].y,columns[1].y,columns[2].y,columns[0].z,columns[1].z,columns[2].z);
}

export class ContactGrab {
  constructor(){this.connection=null;this.lastRelease=null;}
  get active(){return this.connection!==null;}
  get body(){return this.connection?.body??null;}
  begin(body,point,now){
    this.cancel('replace');
    if(!body.isValid()||!body.isDynamic()||body.mass()<=0)return false;
    const local=vec(point).sub(vec(body.translation())).applyQuaternion(quat(body.rotation()).invert());
    this.connection={body,local,target:vec(point),origin:vec(point),velocity:new THREE.Vector3(),lastSample:now,lastMotion:now,force:0};
    this.lastRelease=null;body.wakeUp();return true;
  }
  anchor(){const c=this.connection;return c.local.clone().applyQuaternion(quat(c.body.rotation())).add(vec(c.body.translation()));}
  move(point,now){
    const c=this.connection;if(!c)return;
    const dt=now-c.lastSample;if(dt<=0)return;
    const target=vec(point),offset=target.clone().sub(c.origin);cap(offset,GRAB_LIMITS.reach);target.copy(c.origin).add(offset);
    const delta=target.clone().sub(c.target);
    // Pointerup commonly repeats the last coordinate. It is not a new zero-speed
    // motion sample; stationary time is handled by pointerVelocity's age window.
    if(delta.lengthSq()<1e-10)return;
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
  step(dt,now){
    const c=this.connection;if(!c)return;
    if(!c.body.isValid()){this.cancel('removed');return;}
    const body=c.body,point=this.anchor(),response=pointResponse(body,point);
    const mass=body.mass(),k=mass*360,d=mass*36;
    const rhs=c.target.clone().sub(point).multiplyScalar(k*dt)
      .addScaledVector(this.pointerVelocity(now).sub(vec(body.velocityAtPoint(point))),d*dt);
    const system=response.clone().multiplyScalar(dt*d+dt*dt*k);
    system.elements[0]+=1;system.elements[4]+=1;system.elements[8]+=1;
    const impulse=rhs.applyMatrix3(system.invert());
    cap(impulse,Math.min(GRAB_LIMITS.force,mass*GRAB_LIMITS.acceleration)*dt);
    c.force=impulse.length()/dt;
    body.applyImpulseAtPoint(impulse,point,true);
    this.limitVelocity(body);
  }
  limitVelocity(body){
    const linear=vec(body.linvel()),angular=vec(body.angvel());
    if(linear.length()>GRAB_LIMITS.speed)body.setLinvel(cap(linear,GRAB_LIMITS.speed),true);
    if(angular.length()>GRAB_LIMITS.angularSpeed)body.setAngvel(cap(angular,GRAB_LIMITS.angularSpeed),true);
  }
  release(now){
    const c=this.connection;if(!c)return;
    if(!c.body.isValid()){this.cancel('removed');return;}
    const velocity=this.pointerVelocity(now),body=c.body;
    let threw=false;
    if(velocity.length()>=GRAB_LIMITS.throwThreshold){
      // Correct toward the requested velocity, never add it on top of existing motion.
      // The mass-scaled speed cap makes heavy props slower than light parts.
      cap(velocity,GRAB_LIMITS.throwSpeed/Math.sqrt(Math.max(1,body.mass())));
      // Transfer the gesture to centre-of-mass translation. Preserve the spin
      // already produced while dragging; do not create another torque at release.
      const desired=velocity;
      const correction=desired.sub(vec(body.linvel())).multiplyScalar(body.mass());
      body.applyImpulse(correction,true);this.limitVelocity(body);threw=true;
    }
    this.lastRelease={reason:'release',threw,speed:vec(body.linvel()).length()};
    this.connection=null;
  }
  cancel(reason='cancel'){
    if(this.connection)this.lastRelease={reason,threw:false};
    this.connection=null;
  }
  get diagnostics(){
    const c=this.connection;
    return c?{active:true,body:c.body.handle,local:{...c.local},anchor:{...this.anchor()},target:{...c.target},force:c.force,connections:1}:
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

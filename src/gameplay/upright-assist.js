import R from '@dimforge/rapier3d-compat';
import {createGoblinRig, worldAnchor} from '../goblin-rig.js';
import {ContactGrab} from '../grab.js';
import {commandMotor, sphericalMotorView} from '../labs/standing/motors.js';
import {multiply, conjugate, rotate, cross, norm, scale, sub, jointObservation} from '../labs/standing/math.js';

// Gameplay assistance, not a scientific Standing controller. No body transform writes.
export const ASSIST_CONFIG = Object.freeze({id:'A', stiffness:80, damping:10, max_torque_Nm:20,
  supportFraction:.45, heightStiffness:300, heightDamping:50, upStiffness:60, upDamping:8});
export const LIMITS = Object.freeze({supportWeight:1.25, bodyTorque:20, jointTorque:20,
  stiffness:100, damping:12, settle:.25, unsupported:.15, tilt:Math.PI/6, pelvis:.8, anchor:.15});
// Fixed, approved gameplay diagnostics; only scale the bounded world Up torque.
export const YIELD_PROFILES=Object.freeze({B:Object.freeze({hold:0,restore:0}),
  Y1:Object.freeze({hold:12,restore:18}),Y2:Object.freeze({hold:24,restore:24})});
const UP={x:0,y:1,z:0};
const cap=(v,n)=>norm(v)>n?scale(v,n/norm(v)):v;
export const upAngle=body=>Math.acos(Math.max(-1,Math.min(1,rotate(UP,body.rotation()).y)));

export class UprightSlice {
  constructor({config=ASSIST_CONFIG, assisted=true, obstacle=false,yieldProfile='B'}={}) {
    if(!Object.hasOwn(YIELD_PROFILES,yieldProfile))throw Error('Invalid yield profile');
    this.yieldProfile=yieldProfile;this.yieldStart=null;
    const bounds={stiffness:100,damping:12,max_torque_Nm:20,supportFraction:1.25,
      heightStiffness:1000,heightDamping:200,upStiffness:200,upDamping:40};
    if(Object.keys(config).sort().join()!==Object.keys(ASSIST_CONFIG).sort().join() ||
      Object.entries(bounds).some(([k,max])=>!Number.isFinite(config[k])||config[k]<0||config[k]>max))throw Error('Invalid gameplay assist config');
    this.config=Object.freeze({...config});this.assisted=assisted;this.obstacleEnabled=obstacle;
    this.world=new R.World({x:0,y:-9.81,z:0});this.world.timestep=1/60;
    this.floor=this.world.createCollider(R.ColliderDesc.cuboid(6,.2,6).setTranslation(0,-.2,0).setFriction(.9).setRestitution(.03));
    this.obstacle=this.world.createCollider(R.ColliderDesc.cuboid(.35,.65,.7).setTranslation(1.35,.65,0).setFriction(.9));
    this.obstacle.setEnabled(obstacle);
    this.rig=createGoblinRig(R,this.world);this.grab=new ContactGrab(this.world,R);
    this.mass=[...this.rig.byId.values()].reduce((sum,{body})=>sum+body.mass(),0);
    this.entries=[...this.rig.joints.values()].map(({spec,joint:original})=>{
      const descriptor=spec.type==='spherical'?R.JointData.spherical(spec.anchorA,spec.anchorB):null;
      const joint=descriptor?sphericalMotorView(this.world,original,descriptor):original;
      if(joint.body1().handle!==this.rig.byId.get(spec.parent).body.handle || joint.body2().handle!==this.rig.byId.get(spec.child).body.handle)throw Error('Arena joint partner mismatch');
      const bindFrame={...joint.frameX1()}, frame2=joint.frameX2();
      const target=spec.type==='spherical'?multiply(conjugate(multiply(joint.body1().rotation(),bindFrame)),multiply(joint.body2().rotation(),frame2)):jointObservation({joint,spec}).angle;
      if(spec.limits&&(target<spec.limits[0]||target>spec.limits[1]))throw Error('Arena bind target outside limits');
      if(norm(sub(worldAnchor(joint.body1(),spec.anchorA),worldAnchor(joint.body2(),spec.anchorB)))>1e-5)throw Error('Arena bind anchor conflict');
      return {spec,joint,target,bindFrame};
    });
    this.reset();
  }
  upAssist(){
    if(!this.enabled)return {profile:this.yieldProfile,phase:'OFF',factor:0,remaining:0};
    const {hold,restore}=YIELD_PROFILES[this.yieldProfile];
    const elapsed=this.yieldStart===null?hold+restore:this.steps-this.yieldStart;
    if(elapsed>=hold+restore)return {profile:this.yieldProfile,phase:'FULL',factor:1,remaining:0};
    return {profile:this.yieldProfile,phase:elapsed<hold?'YIELD':'RESTORE',
      factor:elapsed<hold?0:(elapsed-hold)/restore,remaining:(hold+restore-elapsed)/60};
  }
  clearWorldCommands(){for(const {body} of this.rig.byId.values()){body.resetForces(false);body.resetTorques(false);}this.commands={support:0,torques:{},motorCap:0,upFactor:0};}
  motors(enabled){
    const gains=enabled?this.config:{stiffness:0,damping:0,max_torque_Nm:0};
    for(const e of this.entries)commandMotor(e.joint,e.spec.type,e.target,gains,e.bindFrame);
    this.commands.motorCap=enabled?this.config.max_torque_Nm:0;
    this.motorEnabled=enabled;
  }
  interrupt(reason){
    this.yieldStart=null;this.enabled=false;this.reason=reason;if(!this.invalid)this.state='DYNAMIC';
    this.clearWorldCommands();this.motors(false);
  }
  reset({assisted=this.assisted,obstacle=this.obstacleEnabled}={}){
    this.grab.cancel('reset');this.interrupt('reset');this.rig.reset();
    this.assisted=assisted;this.obstacleEnabled=obstacle;this.obstacle.setEnabled(obstacle);
    this.steps=0;this.noSupport=0;this.rest=0;this.invalid=null;this.lastHit=null;
    this.enabled=assisted;this.state=assisted?'SETTLING':'DYNAMIC';this.reason=assisted?'gameplay-assist':'baseline';
    this.contacts=[];this.motorEnabled=false;this.metrics=this.observe();
  }
  beginGrab(body,point,now){
    if(this.invalid)return false;
    const ok=this.grab.begin(body,point,now,this.mass);if(ok)this.interrupt('grab');return ok;
  }
  push(strong=false){
    if(this.invalid)return;
    if(strong)this.interrupt('strong-push');
    else if(this.enabled&&this.state==='ASSISTED_READY'&&!this.grab.active&&this.yieldProfile!=='B'&&this.upAssist().phase==='FULL')this.yieldStart=this.steps;
    const body=this.rig.byId.get('torso').body;
    // Same collider-local point for both strengths, fixed before diagnostics.
    const point=worldAnchor(body,{x:0,y:.30,z:0}),strength=strong?3.2:.4;
    body.applyImpulseAtPoint({x:strength,y:0,z:0},point,true);
    this.lastHit={strength,point,step:this.steps};
  }
  preStep(){
    this.clearWorldCommands();if(this.grab.active&&this.enabled)this.interrupt('grab');
    this.grab.step(1/60);
    if(!this.enabled)return;
    this.motors(true);this.commands.upFactor=this.upAssist().factor;
    const pelvis=this.rig.byId.get('pelvis').body;
    // Lower than the bind height so the .02 m initial foot gap can settle.
    const target=this.rig.byId.get('pelvis').spec.position.y-.02;
    const force=Math.max(0,Math.min(LIMITS.supportWeight*this.mass*9.81,
      this.config.supportFraction*this.mass*9.81+this.config.heightStiffness*(target-pelvis.translation().y)-this.config.heightDamping*pelvis.linvel().y));
    pelvis.addForce({x:0,y:force,z:0},true);this.commands.support=force;
    for(const id of ['pelvis','torso']){
      const body=this.rig.byId.get(id).body,up=rotate(UP,body.rotation()),w=body.angvel();
      const tiltVelocity=sub(w,scale(up,w.x*up.x+w.y*up.y+w.z*up.z));
      const boundedTorque=cap(sub(scale(cross(up,UP),this.config.upStiffness),scale(tiltVelocity,this.config.upDamping)),LIMITS.bodyTorque);
      const torque=scale(boundedTorque,this.commands.upFactor);
      body.addTorque(torque,true);this.commands.torques[id]={...torque};
    }
  }
  observe(){
    this.world.propagateModifiedBodyPositionsToColliders();
    const contacts=[],feet=[];let block=false;
    for(const {spec,collider} of this.rig.byId.values()){
      const contact=collider.contactCollider(this.floor,.04),distance=contact?.distance??null;
      if(spec.id.startsWith('foot'))feet.push({id:spec.id,distance});
      else if(distance!==null&&distance<=.005)contacts.push(spec.id);
      if(this.obstacleEnabled&&!spec.id.startsWith('foot')){const c=collider.contactCollider(this.obstacle,.005);if(c&&c.distance<=.005){block=true;}}
    }
    const pelvis=this.rig.byId.get('pelvis').body,torso=this.rig.byId.get('torso').body;
    return {pelvisHeight:pelvis.translation().y,pelvisTilt:upAngle(pelvis),torsoTilt:upAngle(torso),feet,nonFootFloor:contacts,block};
  }
  safety(){
    for(const {spec,body} of this.rig.byId.values()){
      if(![body.translation(),body.rotation(),body.linvel(),body.angvel()].flatMap(Object.values).every(Number.isFinite))return 'nonfinite:'+spec.id;
      if(norm(body.linvel())>50||norm(body.angvel())>200)return 'uncontrolled-energy:'+spec.id;
    }
    for(const e of this.entries)if(jointObservation(e).anchor_error>LIMITS.anchor)return 'joint-anchor:'+e.spec.id;
    return null;
  }
  step(){
    if(this.invalid)return false;
    this.preStep();this.world.step();this.steps++;
    this.invalid=this.safety();
    if(this.invalid){this.interrupt(this.invalid);this.grab.cancel('safety');this.state='STOPPED';return false;}
    this.metrics=this.observe();const m=this.metrics;
    if(this.enabled){
      if(m.block)this.interrupt('obstacle');
      else if(m.pelvisTilt>LIMITS.tilt||m.torsoTilt>LIMITS.tilt||m.pelvisHeight<LIMITS.pelvis)this.interrupt('balance-lost');
      else if(this.steps/60>=LIMITS.settle){
        this.noSupport=m.feet.some(f=>f.distance!==null&&f.distance<=.03)?0:this.noSupport+1/60;
        if(this.noSupport>LIMITS.unsupported)this.interrupt('unsupported');
        else this.state='ASSISTED_READY';
      }
    }
    if(!this.enabled){
      const quiet=[...this.rig.byId.values()].every(({body})=>norm(body.linvel())<1);
      this.rest=m.nonFootFloor.length&&quiet?this.rest+1/60:0;
      this.state=this.rest>=.3?'DOWN':'DYNAMIC';
    }
    return true;
  }
  snapshot(){return {config:this.config,state:this.state,reason:this.reason,steps:this.steps,time:this.steps/60,
    assisted:this.enabled,upAssist:this.upAssist(),invalid:this.invalid,commands:structuredClone(this.commands),motorEnabled:this.motorEnabled,metrics:structuredClone(this.metrics),
    grab:this.grab.diagnostics,counts:{bodies:this.world.bodies.len(),colliders:this.world.colliders.len(),joints:this.world.impulseJoints.len()},
    parts:[...this.rig.byId.values()].map(({spec,body})=>({id:spec.id,handle:body.handle,position:{...body.translation()},rotation:{...body.rotation()},velocity:{...body.linvel()},angularVelocity:{...body.angvel()},force:{...body.userForce()},torque:{...body.userTorque()}}))};}
  dispose(){this.grab.cancel('destroy');this.interrupt('destroy');this.world.free();}
}

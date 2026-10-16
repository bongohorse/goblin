import {rotateVector} from './goblin-rig.js';
import {observeGetup,supportHull,supportMargin,jointRotation} from './getup-observation.js';
import {Vector3,Matrix4,Quaternion} from 'three';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const inverse=q=>({x:-q.x,y:-q.y,z:-q.z,w:q.w});
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
export function planarIK(y,z,l1,l2,sign,maxBend){
  const minReach=Math.sqrt(l1*l1+l2*l2+2*l1*l2*Math.cos(maxBend));
  const r=clamp(Math.hypot(y,z),minReach,l1+l2-.002),c=clamp((r*r-l1*l1-l2*l2)/(2*l1*l2),-1,1);
  const bend=sign*Math.acos(c),base=wrap(Math.atan2(-z,-y)-Math.atan2(l2*Math.sin(bend),l1+l2*Math.cos(bend)));
  return {base,bend};
}
export function armIK(target,side){
  const t=new Vector3(target.x,target.y,target.z),requested=t.length();
  const r=clamp(requested,Math.sqrt(.36**2+.43**2+2*.36*.43*Math.cos(2.35)),.788),direction=requested>1e-8?t.clone().normalize():new Vector3(0,-1,0);
  const along=(.36**2+r*r-.43**2)/(2*r),height=Math.sqrt(Math.max(0,.36**2-along*along));
  let bend=new Vector3(side,0,0).addScaledVector(direction,-side*direction.x);
  if(bend.lengthSq()<1e-8)bend=new Vector3(0,0,1).addScaledVector(direction,-direction.z);
  bend.normalize();
  const elbow=direction.clone().multiplyScalar(along).addScaledVector(bend,height);
  const upper=elbow.clone().divideScalar(.36),lower=direction.clone().multiplyScalar(r).sub(elbow).divideScalar(.43);
  const angle=-Math.acos(clamp(upper.dot(lower),-1,1)),y=upper.clone().negate();
  const z=lower.clone().addScaledVector(upper,-Math.cos(angle)).divideScalar(-Math.sin(angle));
  const x=new Vector3().crossVectors(y,z).normalize();
  const q=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x,y,z));
  return {requested,elbow:{x:elbow.x,y:elbow.y,z:elbow.z},rotation:{x:q.x,y:q.y,z:q.z,w:q.w},bend:angle};
}
// Experimental joint-only controller. Integration requires back/belly acceptance.
export class ContactGetup {
  constructor(R,world,rig,floor){
    Object.assign(this,{R,world,rig,floor,phase:'plant',elapsed:0,steady:0,transitions:[],disposed:false});
    this.originalIterations=new Map([...rig.byId].map(([id,{body}])=>[id,body.additionalSolverIterations()]));
    this.motors=new Map();this.targets={};this.placement={};
    for(const [id,{spec,joint:original}] of rig.joints){
      const joint=spec.type==='spherical'?new R.SphericalImpulseJoint(world.impulseJoints.raw,world.bodies,original.handle):original;
      const originalFrame={...joint.frameX1()};
      if(spec.type==='spherical')joint.setFrameX1(rig.byId.get(spec.child).spec.rotation);
      const a=rig.byId.get(spec.parent).body.rotation(),b=rig.byId.get(spec.child).body.rotation();
      const current=spec.type==='spherical'?new Quaternion().copy(a).invert().multiply(new Quaternion().copy(b)).normalize():jointRotation(rig,spec).x;
      this.motors.set(id,{joint,spec,originalFrame,current});
    }
    this.enableBudget();
    this.footGoals=Object.fromEntries(['L','R'].map(s=>[s,{...rig.byId.get('foot'+s).body.translation(),y:.12}]));
  }
  enableBudget(){for(const [id,{body}] of this.rig.byId)body.setAdditionalSolverIterations(this.originalIterations.get(id)+16);}
  disableActuation(){
    for(const id of this.motors.keys())this.motor(id,0,0);
    this.flush(0);
    for(const [id,{body}] of this.rig.byId){body.resetTorques(false);body.setAdditionalSolverIterations(this.originalIterations.get(id));}
  }
  motor(id,target,force=20){
    this.targets[id]=target;
    this.motors.get(id).command={target,force};
  }
  flush(dt){for(const {joint,spec,command,current} of this.motors.values()){
    if(!command)continue;
    const {target,force}=command,R=this.R;
    if(spec.type==='spherical'){
      const goal=typeof target==='number'?{x:Math.sin(target/2),y:0,z:0,w:Math.cos(target/2)}:target;
      const desired=new Quaternion().copy(goal).normalize(),angle=current.angleTo(desired);
      current.slerp(desired,angle>0?Math.min(1,2*dt/angle):1);joint.setFrameX1(current);
      for(const axis of [R.JointAxis.AngX,R.JointAxis.AngY,R.JointAxis.AngZ]){
        joint.configureMotorModel(axis,R.MotorModel.ForceBased);joint.configureMotor(axis,0,0,100,12);joint.setMotorMaxForce(axis,force);
      }
    }else{const value=current+clamp(target-current,-2*dt,2*dt);this.motors.get(spec.id).current=value;joint.configureMotorModel(R.MotorModel.ForceBased);joint.configureMotor(value,0,100,12);joint.setMotorMaxForce(force);}
  }}
  stop(reason){
    if(this.disposed)return;
    this.phase=reason;this.transitions.push({time:this.elapsed,phase:reason,footStep:structuredClone(this.footStep)});this.disableActuation();
    for(const {joint,originalFrame} of this.motors.values())joint.setFrameX1(originalFrame);
    this.disposed=true;
  }
  step(dt,intent={}){
    if(this.disposed)return;
    if(intent.held||intent.hit||intent.blocked){this.stop(intent.held?'held':intent.hit?'hit':'blocked');return;}
    if(intent.paused){if(!this.paused)this.disableActuation();this.paused=true;return;}
    if(this.paused){this.enableBudget();this.paused=false;}
    this.elapsed+=dt;const s=observeGetup(this.world,this.rig,this.floor,dt);this.observation=s;
    if(this.elapsed>12&&this.phase!=='stand'){this.stop('timeout');return;}
    const pelvis=this.rig.byId.get('pelvis').body,torso=this.rig.byId.get('torso').body;
    if(this.phase==='transfer'&&!this.footStep){
      this.footStep={side:'L',phase:'await-support',elapsed:0};
      this.handGoals=Object.fromEntries(['L','R'].map(side=>[side,{...this.rig.byId.get('hand'+side).body.translation(),y:.115}]));
    }
    if(this.footStep&&this.footStep.side!=='done'&&this.phase==='transfer'){
      const step=this.footStep,foot=this.rig.byId.get('foot'+step.side).body,position=foot.translation();step.elapsed+=dt;
      const other=s.contacts.filter(c=>c.force>.5&&c.id!=='foot'+step.side&&(c.id.startsWith('foot')||c.id.startsWith('hand')));
      step.remainingMargin=supportMargin(s.com,supportHull(other.flatMap(c=>c.points)));step.remainingLoad=other.reduce((n,c)=>n+c.force,0);
      step.headLoad=s.contacts.filter(c=>c.id==='head').reduce((n,c)=>n+c.force,0);
      const safe=step.remainingMargin>0&&step.remainingLoad>.6*s.weight&&step.headLoad<.05*s.weight;
      if(step.phase==='await-support'){
        step.safeTime=safe?(step.safeTime||0)+dt:0;
        if(step.safeTime>.2)step.phase='lift';
      }else if(step.phase!=='done'&&!safe){
        step.lostTime=(step.lostTime||0)+dt;if(step.lostTime>.1){this.stop('support-loss');return;}
      }else step.lostTime=0;
      if(safe&&step.phase==='lift'){
        this.footGoals[step.side].y=.24;
        let bottom=Infinity;for(const x of [-.13,.13])for(const y of [-.1,.1])for(const z of [-.22,.22])bottom=Math.min(bottom,position.y+rotateVector({x,y,z},foot.rotation()).y);
        step.bottom=bottom;if(bottom>.02)step.phase='move';
      }
      if(step.phase==='move'){this.footGoals[step.side].z=s.com.z-.02;if(Math.abs(position.z-this.footGoals[step.side].z)<.06)step.phase='land';}
      if(step.phase==='land'){
        this.footGoals[step.side].y=.12;
        const load=s.contacts.filter(c=>c.id==='foot'+step.side).reduce((n,c)=>n+c.force,0);
        step.loaded=load>.2*s.weight?(step.loaded||0)+dt:0;
        if(step.loaded>.2)this.footStep=step.side==='L'?{side:'R',phase:'await-support',elapsed:0}:{side:'done',phase:'done',elapsed:0};
      }
      if(step.elapsed>4&&step.side!=='done'){this.stop('foot-placement-timeout');return;}
    }
    for(const id of this.motors.keys())this.motor(id,0,12);
    for(const suffix of ['L','R']){
      const hip=this.rig.joints.get('hip'+suffix).spec,root=pelvis.translation(),offset=rotateVector(hip.anchorA,pelvis.rotation());
      const goal=this.footGoals[suffix];
      const local=rotateVector({x:goal.x-root.x-offset.x,y:goal.y+.12-root.y-offset.y,z:goal.z-.08-root.z-offset.z},inverse(pelvis.rotation()));
      this.placement['foot'+suffix]={requestedReach:Math.hypot(local.x,local.y,local.z),lateralError:local.x,maxReach:.8,target:{y:goal.y+.12,z:goal.z-.08}};
      const leg=planarIK(local.y,local.z,.4,.4,1,2.3);
      this.motor('hip'+suffix,this.phase==='extend'||this.phase==='stand'?-.4:leg.base);this.motor('knee'+suffix,this.phase==='extend'||this.phase==='stand'?.8:clamp(leg.bend,-.05,2.3));
      const lowerUp=rotateVector({x:0,y:1,z:0},this.rig.byId.get('lowerLeg'+suffix).body.rotation());
      this.motor('ankle'+suffix,clamp(-Math.atan2(lowerUp.z,lowerUp.y),-.4,.4));
      const shoulder=this.rig.joints.get('shoulder'+suffix).spec,top=torso.translation(),off=rotateVector(shoulder.anchorA,torso.rotation());
      // Limited hand extension while the head still carries load; no floor pose writes.
      const headLoad=s.contacts.filter(c=>c.id==='head').reduce((n,c)=>n+c.force,0);
      const lift=this.phase==='transfer'&&headLoad>.05*s.weight?.04:0,side=suffix==='L'?1:-1;
      const outward=rotateVector({x:side,y:0,z:0},torso.rotation()),n=Math.hypot(outward.x,outward.z);
      const planted=this.handGoals?.[suffix];
      const delta=planted?{x:planted.x-top.x-off.x,y:planted.y-top.y-off.y-lift,z:planted.z-top.z-off.z}:
        {x:(n>1e-6?outward.x/n:side)*.3,y:.115-top.y-off.y-lift,z:(n>1e-6?outward.z/n:0)*.3};
      const arm=armIK(rotateVector(delta,inverse(torso.rotation())),side);
      this.placement['hand'+suffix]={requestedReach:arm.requested,maxReach:.79,extensionBias:lift,target:{x:top.x+off.x+delta.x,y:.115,z:top.z+off.z+delta.z},elbow:arm.elbow};
      this.motor('shoulder'+suffix,arm.rotation);this.motor('elbow'+suffix,arm.bend);
    }
    const infeasible=Object.values(this.placement).some(p=>p.requestedReach>p.maxReach+.02);
    this.infeasibleTime=infeasible?(this.infeasibleTime||0)+dt:0;
    if(this.infeasibleTime>.5){this.transitions.push({time:this.elapsed,phase:'unreachable-support-target',placement:structuredClone(this.placement)});this.stop('unreachable-support-target');return;}
    const handForce=s.contacts.filter(c=>c.id.startsWith('hand')).reduce((n,c)=>n+c.force,0);
    const footSupported=s.footForce>.15*s.weight&&handForce>.1*s.weight&&s.margin>.02&&Math.hypot(s.velocity.x,s.velocity.y,s.velocity.z)<.25;
    this.supportedTime=footSupported?(this.supportedTime||0)+dt:0;
    if(this.phase==='plant'&&this.supportedTime>=.2){this.phase='transfer';this.transitions.push({time:this.elapsed,phase:this.phase,margin:s.margin,footMargin:s.footMargin,force:s.footForce});}
    if(this.phase==='transfer'&&s.footForce>.65*s.weight&&s.footMargin>0&&s.upY>.65){this.phase='extend';this.transitions.push({time:this.elapsed,phase:this.phase,margin:s.margin,footMargin:s.footMargin,force:s.footForce});}
    if((this.phase==='transfer'&&this.footStep?.phase==='done')||this.phase==='extend'||this.phase==='stand'){
      const supported=s.contacts.filter(c=>c.force>.5&&(c.id.startsWith('foot')||c.id.startsWith('hand')));
      if(supported.length){
        const up=rotateVector({x:0,y:1,z:0},pelvis.rotation()),v=pelvis.angvel();let t={x:-100*up.z-20*v.x,y:-5*v.y,z:100*up.x-20*v.z};
        const scale=Math.min(1,24/(Math.hypot(t.x,t.y,t.z)||1));t={x:t.x*scale,y:t.y*scale,z:t.z*scale};pelvis.addTorque(t,true);
        const total=supported.reduce((n,c)=>n+c.force,0);for(const c of supported)this.rig.byId.get(c.id).body.addTorque({x:-t.x*c.force/total,y:-t.y*c.force/total,z:-t.z*c.force/total},true);
      }
    }
    this.steady=s.standing?this.steady+dt:0;
    if(this.steady>=.6&&this.phase!=='stand'){this.phase='stand';this.transitions.push({time:this.elapsed,phase:this.phase,margin:s.margin,footMargin:s.footMargin,force:s.footForce});}
    this.flush(dt);
  }
}

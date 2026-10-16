import {ContactGetup} from './contact-getup.js';
import {observeGetup} from './getup-observation.js';
import {rotateVector} from './goblin-rig.js';
// Bounded alternative-route investigation, not a get-up success controller.
// Contact bodies receive the exact opposite torque; there is no world anchor.
export class SideSupportProbe extends ContactGetup {
 constructor(R,world,rig,floor){super(R,world,rig,floor);this.phase='side-probe';this.dwell=0;}
 step(dt,intent={}){
  if(this.disposed)return;
  if(intent.held||intent.hit||intent.blocked){this.stop('interrupted');return;}
  if(intent.paused){if(!this.paused)this.disableActuation();this.paused=true;return;}
  if(this.paused){this.enableBudget();this.paused=false;}
  this.elapsed+=dt;const s=observeGetup(this.world,this.rig,this.floor,dt);
  const root=this.rig.byId.get('pelvis').body,torso=this.rig.byId.get('torso').body;
  const axis=rotateVector({x:0,y:1,z:0},root.rotation()),forward=rotateVector({x:0,y:0,z:1},torso.rotation());
  const support=s.contacts.filter(c=>c.force>.5&&(c.id.startsWith('hand')||c.id.startsWith('foot'))),load=support.reduce((n,c)=>n+c.force,0);
  const head=s.contacts.filter(c=>c.id==='head').reduce((n,c)=>n+c.force,0),omega=root.angvel();
  this.feedback={forward,head,load,com:s.com,velocity:s.velocity,contacts:s.contacts};
  if(load<.2*s.weight){this.lost=(this.lost||0)+dt;if(this.lost>.2){this.stop('side-support-loss');return;}}else this.lost=0;
  // Release shoulder/hip motors to permit rolling; hold the measured hinge angles.
  // As the body rolls, hands/feet remain free to slip and change contact.
  for(const [id,m] of this.motors)this.motor(id,m.current,id.startsWith('hip')||id.startsWith('shoulder')?0:12);
  this.flush(dt);
  const error=Math.atan2(axis.y*forward.z-axis.z*forward.y,forward.x);
  const torque=Math.max(-24,Math.min(24,16*error-4*(omega.x*axis.x+omega.y*axis.y+omega.z*axis.z)));
  if(load>.2*s.weight){root.addTorque({x:axis.x*torque,y:axis.y*torque,z:axis.z*torque},true);
   for(const c of support)this.rig.byId.get(c.id).body.addTorque({x:-axis.x*torque*c.force/load,y:-axis.y*torque*c.force/load,z:-axis.z*torque*c.force/load},true);
  }
  this.feedback.torque=torque;
  const side=Math.abs(forward.y)<.25&&forward.x>.7;
  this.dwell=side&&head<.05*s.weight&&this.rig.byId.get('head').body.translation().y>.53&&Math.hypot(s.velocity.x,s.velocity.y,s.velocity.z)<.12?this.dwell+dt:0;
  if(this.dwell>=1){this.stop('head-free-side-observed');return;}
  if(this.elapsed>=3)this.stop('side-probe-timeout');
 }
}

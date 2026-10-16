// G3 transition contract. Not yet connected to gameplay: balance must pass first.
export const POSTURE_STATES=Object.freeze(['preparing','standing','swaying','falling','lying','rising','recovery']);
export class PostureState {
  constructor(){this.reset();}
  reset(phase='preparing'){
    this.state=phase==='preparing'?'preparing':'standing';this.elapsed=0;
    this.reason=null;this.pose=null;this.timers=new Map();this.disposed=false;
  }
  dispose(){this.reset();this.disposed=true;}
  transition(state,reason=null){
    if(this.state===state)return;
    const outside=this.timers.get('outside');
    this.state=state;this.reason=reason;this.elapsed=0;this.timers.clear();
    // A posture change must not restart the independent arena-exit deadline.
    if(outside!==undefined)this.timers.set('outside',outside);
  }
  sustained(key,condition,dt,seconds){
    const time=condition?(this.timers.get(key)||0)+dt:0;
    this.timers.set(key,time);return time+1e-9>=seconds;
  }
  update(dt,s){
    if(this.disposed||s.paused||s.phase==='ended')return this.state;
    if(s.phase==='preparing'){this.reset();return this.state;}
    if(this.state==='preparing')this.transition('standing');
    this.elapsed+=dt;
    const upright=s.upY>.94&&s.headY>1.8;
    const settled=s.grounded&&s.upY<.45&&s.speed<.25&&s.angularSpeed<.7;
    this.pose=s.pose==='back'||s.pose==='belly'?s.pose:null;
    // Holding inhibits recovery resets as well as get-up; never remove a held body.
    if(this.sustained('outside',s.outside&&!s.held,dt,.5)){
      this.transition('recovery','arena-exit');return this.state;
    }
    if(this.state==='standing'||this.state==='swaying'){
      const unstable=s.upY<.65||s.headY<1.3||!s.supported;
      if(this.sustained('fall',unstable,dt,.18))this.transition('falling','lost-balance');
      else if(!unstable&&this.state==='standing'&&this.sustained('sway',s.upY<.985||s.speed>.18,dt,.1))this.transition('swaying');
      else if(this.state==='swaying'&&this.sustained('steady',upright&&s.speed<.12&&s.supported,dt,.6))this.transition('standing');
    }else if(this.state==='falling'){
      if(this.sustained('settled',settled,dt,.8))this.transition('lying');
      else if(this.sustained('landed-standing',upright&&s.supported&&s.speed<.12,dt,.6))this.transition('standing');
    }else if(this.state==='lying'){
      if(this.sustained('unsupported',!this.pose&&!s.held,dt,3))this.transition('recovery','unsupported-pose');
      else if(this.sustained('blocked',s.blocked&&!s.held,dt,4))this.transition('recovery','blocked');
      // readyToRise must be supplied by a verified physical controller, never a timer alone.
      else if(!s.held&&!s.hit&&!s.blocked&&this.pose&&s.readyToRise&&settled)this.transition('rising');
    }else if(this.state==='rising'){
      if(s.held||s.hit)this.transition('falling',s.held?'held':'hit');
      else if(s.blocked)this.transition('lying','blocked');
      else if(this.sustained('stood',upright&&s.supported&&s.speed<.12,dt,.6))this.transition('standing');
      else if(this.elapsed>=8)this.transition('recovery','rise-timeout');
    }
    return this.state;
  }
}

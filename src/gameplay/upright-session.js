import {FixedClock} from '../runtime.js';
import {rotate, jointObservation} from '../labs/standing/math.js';
import {POINT_IDS} from './upright-comparison.js';
import {requireEventPreconditions} from '../../scripts/execution-event-checks.mjs';

// Exact archived B, not another assist candidate. No sliders or tuning.
export const CONFIG_B=Object.freeze({id:'B',stiffness:40,damping:2,max_torque_Nm:20,
  supportFraction:.45,heightStiffness:300,heightDamping:50,upStiffness:60,upDamping:2});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const length=v=>Math.hypot(v.x,v.y,v.z);
const motion=sim=>sim.snapshot().parts.map(({id,position,rotation,velocity,angularVelocity})=>({id,position,rotation,velocity,angularVelocity}));

// Read-only recorder: forwards the original native commands and interruption exactly.
export function auditCommands(sim,onInterrupt){
  const ledger=new Map(),restore=[];
  for(const {spec,joint} of sim.entries){
    for(const name of ['setMotorMaxForce','configureMotor']){
      const original=joint[name];
      joint[name]=function(...args){
        const result=original.apply(this,args);
        const spherical=spec.type==='spherical',key=spec.id+':'+(spherical?args[0]:'hinge');
        const command=ledger.get(key)||{joint:spec.id,axis:spherical?args[0]:'hinge'};
        if(name==='setMotorMaxForce')command.cap=args.at(-1);
        else Object.assign(command,{target:args[spherical?1:0],velocity:args[spherical?2:1],stiffness:args.at(-2),damping:args.at(-1)});
        ledger.set(key,command);return result;
      };
      restore.push(()=>{joint[name]=original;});
    }
  }
  const original=sim.interrupt;
  sim.interrupt=function(reason){
    const before=motion(sim),result=original.call(this,reason);
    onInterrupt({kind:'interrupt',reason,step:sim.steps,motionUnchanged:same(before,motion(sim)),
      nativeMotorCommands:[...ledger.values()].map(x=>({...x}))});
    return result;
  };
  restore.push(()=>{sim.interrupt=original;});
  return {ledger,dispose:()=>restore.reverse().forEach(fn=>fn())};
}

export class UprightSession {
  constructor(sim,{audit=true,record=true,runPolicy={mode:'historical'},speed=1,resetOptions={assisted:true,obstacle:false}}={}){
    if(!['historical','free'].includes(runPolicy.mode))throw Error('Invalid run policy');
    const timerSteps=runPolicy.timerSteps??null;
    if(timerSteps!==null&&(!Number.isSafeInteger(timerSteps)||timerSteps<1))throw Error('Invalid timer');
    this.runPolicy=Object.freeze({mode:runPolicy.mode,timerSteps});
    this.setSpeed(speed);
    this.record=record;
    this.sim=sim;this.clock=new FixedClock();this.paused=true;this.windowLimit=runPolicy.mode==='free'?Infinity:600;
    this.trace=[];this.events=[];this.pending=null;this.lastRun=null;
    this.audit=audit?auditCommands(sim,event=>{if(this.record)this.events.push(event);}):null;
    this.reset(resetOptions);
  }
  setSpeed(speed){
    if(![.25,.5,1].includes(speed))throw Error('Invalid simulation speed');
    this.speed=speed;this.clock?.reset();
  }
  event(kind,detail={}){if(this.record)this.events.push({kind,step:this.sim.steps,time:this.sim.steps/60,...detail});}
  reset(options){
    this.sim.reset(options);this.clock.reset();this.paused=true;this.pending=null;
    this.pauseContext={kind:'initial',reason:'reset',step:this.sim.steps};
    this.timerReached=false;
    this.trace=[];this.events=[];this.lastRun=null;this.trial=null;this.event('manual-reset',{options});this.capture();
  }
  pause(reason='pause'){
    this.pauseContext={kind:'safety',reason,step:this.sim.steps,
      grab_cancelled:!!this.sim.grab.active,pending_discarded:this.pending!==null};
    this.sim.grab.cancel(reason);this.sim.interrupt(reason);this.paused=true;this.clock.reset();this.pending=null;
    this.event('pause',{reason});
  }
  // Observation is a clock stop, never an assist interruption or state restore.
  // Keep pause() as the explicit historical safety path for existing callers.
  observePause(reason='observation'){
    let action='already-paused';
    if(this.sim.grab.active){this.pause(reason+'-active-grab');action='safety-stop';}
    else if(this.sim.invalid){this.pause('safety');action='safety-stop';}
    else if(this.sim.steps>=this.windowLimit){this.pause('window-limit');action='safety-stop';}
    else if(!this.paused||this.pauseContext.kind!=='safety'){
      this.paused=true;this.clock.reset();
      this.pauseContext={kind:'observation',reason,step:this.sim.steps};
      this.event('observation-pause',{reason});
      action='observation-pause';
    }
    return {...structuredClone(this.pauseContext),action,requested_reason:reason};
  }
  resume(){if(this.sim.invalid||this.sim.steps>=this.windowLimit)return;this.paused=false;this.clock.reset();this.event('resume');}
  push(strong,scheduled=false){
    if(this.paused)return false;
    if(scheduled){
      if(this.sim.steps>=120)return false;
      this.pending=strong;this.event('scheduled-push',{strong,atStep:120});return true;
    }
    this.event('push-before',{strong,torsoTilt:this.sim.metrics.torsoTilt});
    const body=this.sim.rig.byId.get('torso').body;
    const before={velocity:{...body.linvel()},angularVelocity:{...body.angvel()}};
    this.sim.push(strong);this.event('push-after',{strong,hit:structuredClone(this.sim.lastHit)});
    const delta=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
    this.event('impulse-observation',{strength:strong?3.2:.4,direction:{x:1,y:0,z:0},localPoint:{x:0,y:.30,z:0},
      point:structuredClone(this.sim.lastHit?.point),before,after:{velocity:{...body.linvel()},angularVelocity:{...body.angvel()}},
      deltaVelocity:delta(body.linvel(),before.velocity),deltaAngularVelocity:delta(body.angvel(),before.angularVelocity)});
    return true;
  }
  armTrial({id,durationSteps,actions}){
    if(!this.paused||this.sim.steps!==0||this.pending!==null||this.trial||this.sim.grab.active)throw Error('Trial requires fresh paused Step0 without pending input/grab');
    if(typeof id!=='string'||!Number.isInteger(durationSteps)||durationSteps<1||durationSteps>720||!Array.isArray(actions))throw Error('Invalid trial window');
    let previous=-1;
    for(const action of actions){
      if(!['small','strong','grab','move','release','off'].includes(action.kind)||!Number.isInteger(action.step)||action.step<=previous||action.step>=durationSteps||action.step<0)throw Error('Invalid trial input/step');
      if(action.kind==='move'&&(!action.offset||!['x','y','z'].every(k=>Number.isFinite(action.offset[k]))||length(action.offset)>.25))throw Error('Invalid trial drag');
      if(action.kind==='grab'&&action.body!=='handL')throw Error('Invalid trial body');
      if(!action.policy||action.policy.step!==action.step)throw Error('Invalid trial policy');
      previous=action.step;
    }
    this.windowLimit=durationSteps;this.trial={id,actions:structuredClone(actions),outcomes:[],next:0};
  }
  applyTrialEvents(){
    const plan=this.trial,sim=this.sim;if(!plan)return;
    while(plan.next<plan.actions.length&&plan.actions[plan.next].step<=sim.steps){
      const action=plan.actions[plan.next++],before=sim.snapshot(),m=before.metrics;
      const observed={step:sim.steps,invalid:before.invalid!==null,
        upright:before.assisted&&before.state==='ASSISTED_READY'&&!before.grab.active&&m.pelvisHeight>=.95&&m.pelvisHeight<=1.25&&m.pelvisTilt<=Math.PI/12&&m.torsoTilt<=Math.PI/12&&
          m.feet.every(f=>f.distance!==null&&f.distance<=.03)&&m.feet.some(f=>f.distance!==null&&f.distance<=.005)&&!m.nonFootFloor.length,
        activeTarget:sim.targetStart!==null&&['RISE','HOLD','RETURN'].includes(before.targetAssist.phase)};
      const outcome={kind:action.kind,plannedStep:action.step,actualStep:sim.steps,observed,before,applied:false};
      try{
        requireEventPreconditions(action.kind,observed,action.policy);
        if(action.kind==='small'||action.kind==='strong')this.push(action.kind==='strong');
        else if(action.kind==='off'){sim.interrupt('manual-assist-off');this.event('assist-off');}
        else if(action.kind==='grab'){
          const body=sim.rig.byId.get(action.body).body,point={...body.translation()};
          if(!sim.beginGrab(body,point,sim.steps/60))throw Error('API grip refused');
          this.event('grab-begin',{body:action.body,point,input:'step-scheduled ContactGrab API'});
          plan.gripPoint=point;
        }else if(action.kind==='move'){
          if(!sim.grab.active||!plan.gripPoint)throw Error('No active grip for move');
          sim.grab.move(Object.fromEntries(['x','y','z'].map(k=>[k,plan.gripPoint[k]+action.offset[k]])),sim.steps/60);
          this.event('grab-move',{offset:action.offset,input:'step-scheduled ContactGrab API'});
        }else if(action.kind==='release'){
          if(!sim.grab.active)throw Error('No active grip for release');
          sim.grab.release(sim.steps/60);this.event('grab-release',{release:sim.grab.diagnostics.lastRelease});
        }
        outcome.applied=true;
      }catch(error){outcome.error=error.message;this.event('trial-event-rejected',{action:action.kind,plannedStep:action.step,error:error.message});}
      outcome.after=sim.snapshot();plan.outcomes.push(outcome);
    }
  }
  capture(){
    if(!this.record)return;
    const s=this.sim.snapshot(),torso=s.parts.find(p=>p.id==='torso'),pelvis=s.parts.find(p=>p.id==='pelvis');
    const commands=this.audit?[...this.audit.ledger.values()]:[];
    this.trace.push({step:s.steps,time:s.time,state:s.state,reason:s.reason,assisted:s.assisted,upAssist:s.upAssist,targetAssist:s.targetAssist,
      torso:{position:torso.position,rotation:torso.rotation,up:rotate({x:0,y:1,z:0},torso.rotation),velocity:torso.velocity,angularVelocity:torso.angularVelocity,tilt:s.metrics.torsoTilt},
      pelvis:{position:pelvis.position,rotation:pelvis.rotation,tilt:s.metrics.pelvisTilt},
      commands:s.commands,motorEnabled:s.motorEnabled,motorAxes:commands.length,
      activeMotorAxes:commands.filter(c=>c.cap>0&&(c.stiffness>0||c.damping>0)).length,
      maxWorldForce:Math.max(...s.parts.map(p=>length(p.force))),maxWorldTorque:Math.max(...s.parts.map(p=>length(p.torque))),
      maxAnchorError:Math.max(...this.sim.entries.map(e=>jointObservation(e).anchor_error)),
      metrics:s.metrics,grab:s.grab,counts:s.counts,invalid:s.invalid,
      observation:{points:Object.fromEntries(POINT_IDS.map(id=>{const p=s.parts.find(p=>p.id===id);return [id,structuredClone(p)];})),
        bodies:s.parts.map(p=>({...p,sleeping:this.sim.rig.byId.get(p.id).body.isSleeping()})),
        controller:{config:s.config,yieldProfile:this.sim.yieldProfile,yieldStart:this.sim.yieldStart,reaction:this.sim.reaction,targetStart:this.sim.targetStart,noSupport:this.sim.noSupport,rest:this.sim.rest,
          obstacle:this.sim.obstacleEnabled,lastHit:structuredClone(this.sim.lastHit)}}});
  }
  tick(now){
    // Keep the historically pinned FixedClock byte-identical. Only this
    // session maps bounded wall deltas to slow simulation time; dt stays fixed.
    const delta=Math.min(this.clock.step*this.clock.maxSteps,Math.max(0,now-(this.wallPrevious??now)));
    const clockNow=this.speed===1||this.clock.previous===null?now:this.clock.previous+delta*this.speed;
    this.wallPrevious=now;
    this.clock.advance(clockNow,this.paused,()=>{
      if(this.paused)return;
      this.advanceStep();
    });
  }
  advanceStep(){
    if(this.sim.invalid||this.sim.steps>=this.windowLimit)return false;
    this.applyTrialEvents();
    if(this.pending!==null&&this.sim.steps===120){const strong=this.pending;this.pending=null;this.push(strong);}
    this.sim.step();this.capture();
    if(this.sim.invalid)this.finish('safety');
    else if(this.sim.steps>=this.windowLimit)this.finish('window-limit');
    else if(!this.timerReached&&this.runPolicy.timerSteps!==null&&this.sim.steps>=this.runPolicy.timerSteps){
      this.timerReached=true;this.observePause('timer-end');
    }
    return true;
  }
  singleStep(){
    if(!this.paused)return false;
    this.clock.reset();this.paused=false;
    try{return this.advanceStep();}finally{this.paused=true;}
  }
  finish(reason='observation-end'){
    this.lastRun=this.report();this.pause(reason);
  }
  report(){return {config:CONFIG_B,windowLimit:Number.isFinite(this.windowLimit)?this.windowLimit:null,runPolicy:this.runPolicy,speed:this.speed,timerReached:this.timerReached,paused:this.paused,pause:structuredClone(this.pauseContext),pending:this.pending,trial:structuredClone(this.trial),
    final:this.sim.snapshot(),trace:structuredClone(this.trace),events:structuredClone(this.events)};}
  dispose(){this.pause('destroy');this.audit?.dispose();this.sim.dispose();}
}

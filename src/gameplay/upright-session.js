import {FixedClock} from '../runtime.js';
import {rotate, jointObservation} from '../labs/standing/math.js';
import {POINT_IDS} from './upright-comparison.js';

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
  constructor(sim,{audit=true}={}){
    this.sim=sim;this.clock=new FixedClock();this.paused=true;this.windowLimit=600;
    this.trace=[];this.events=[];this.pending=null;this.lastRun=null;
    this.audit=audit?auditCommands(sim,event=>this.events.push(event)):null;
    this.reset({assisted:true,obstacle:false});
  }
  event(kind,detail={}){this.events.push({kind,step:this.sim.steps,time:this.sim.steps/60,...detail});}
  reset(options){
    this.sim.reset(options);this.clock.reset();this.paused=true;this.pending=null;
    this.trace=[];this.events=[];this.lastRun=null;this.event('manual-reset',{options});this.capture();
  }
  pause(reason='pause'){
    this.sim.grab.cancel(reason);this.sim.interrupt(reason);this.paused=true;this.clock.reset();this.pending=null;
    this.event('pause',{reason});
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
  capture(){
    const s=this.sim.snapshot(),torso=s.parts.find(p=>p.id==='torso'),pelvis=s.parts.find(p=>p.id==='pelvis');
    const commands=this.audit?[...this.audit.ledger.values()]:[];
    this.trace.push({step:s.steps,time:s.time,state:s.state,reason:s.reason,assisted:s.assisted,upAssist:s.upAssist,
      torso:{position:torso.position,rotation:torso.rotation,up:rotate({x:0,y:1,z:0},torso.rotation),velocity:torso.velocity,angularVelocity:torso.angularVelocity,tilt:s.metrics.torsoTilt},
      pelvis:{position:pelvis.position,rotation:pelvis.rotation,tilt:s.metrics.pelvisTilt},
      commands:s.commands,motorEnabled:s.motorEnabled,motorAxes:commands.length,
      activeMotorAxes:commands.filter(c=>c.cap>0&&(c.stiffness>0||c.damping>0)).length,
      maxWorldForce:Math.max(...s.parts.map(p=>length(p.force))),maxWorldTorque:Math.max(...s.parts.map(p=>length(p.torque))),
      maxAnchorError:Math.max(...this.sim.entries.map(e=>jointObservation(e).anchor_error)),
      metrics:s.metrics,grab:s.grab,counts:s.counts,invalid:s.invalid,
      observation:{points:Object.fromEntries(POINT_IDS.map(id=>{const p=s.parts.find(p=>p.id===id);return [id,structuredClone(p)];})),
        bodies:s.parts.map(p=>({...p,sleeping:this.sim.rig.byId.get(p.id).body.isSleeping()})),
        controller:{config:s.config,yieldProfile:this.sim.yieldProfile,yieldStart:this.sim.yieldStart,noSupport:this.sim.noSupport,rest:this.sim.rest,
          obstacle:this.sim.obstacleEnabled,lastHit:structuredClone(this.sim.lastHit)}}});
  }
  tick(now){
    this.clock.advance(now,this.paused,()=>{
      if(this.paused)return;
      if(this.pending!==null&&this.sim.steps===120){const strong=this.pending;this.pending=null;this.push(strong);}
      this.sim.step();this.capture();
      if(this.sim.invalid){this.finish('safety');return;}
      if(this.sim.steps>=this.windowLimit)this.finish('window-limit');
    });
  }
  finish(reason='observation-end'){
    this.lastRun=this.report();this.pause(reason);
  }
  report(){return {config:CONFIG_B,windowLimit:this.windowLimit,paused:this.paused,
    final:this.sim.snapshot(),trace:structuredClone(this.trace),events:structuredClone(this.events)};}
  dispose(){this.pause('destroy');this.audit?.dispose();this.sim.dispose();}
}

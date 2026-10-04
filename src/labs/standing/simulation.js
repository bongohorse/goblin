import RAPIER from '@dimforge/rapier3d-compat';
import {BASELINE,validateConfig,validateResult,configIdentity,canonical} from './config.js';
import {vec,norm,sub,jointObservation,freeze} from './math.js';
import {observe,termination,timingStats} from './measurement.js';
import {NativePoseHold} from './motors.js';
import {validateMotorExperiment} from './motor-config.js';
let initialization;
export const initRapier=()=>initialization??=RAPIER.init();
export function colliderDesc(shape){return shape.type==='ball'?RAPIER.ColliderDesc.ball(shape.radius):shape.type==='capsule'?RAPIER.ColliderDesc.capsule(shape.half,shape.radius):RAPIER.ColliderDesc.cuboid(shape.half.x,shape.half.y,shape.half.z);}

export class StandingSimulation {
  constructor(config=BASELINE,metadata={},experiment=null){
    this.config=validateConfig(config);this.metadata=freeze(structuredClone(metadata));this.experiment=experiment?validateMotorExperiment(experiment):null;
    if(this.experiment&&canonical(this.config)!==canonical(BASELINE))throw Error('Motor rig must be the frozen baseline');
    this.motor=this.experiment?new NativePoseHold(this.experiment.actuation,this.config):null;this.disposed=false;this.generation=0;this.reset();
  }
  reset(){
    if(this.disposed)throw Error('Disposed simulation');
    this.release();this.generation++;this.steps=0;this.paused=true;this.invalid=null;
    this.runId=globalThis.crypto.randomUUID();this.physicsTimes=[];this.commandTimes=[];
    this.observationTimes=[];this.checkpoints=[];this.terminal=null;this.telemetry=null;this.initialCom=null;
    this.bodies=new Map();this.colliders=new Map();this.joints=new Map();
    try{
      this.world=new RAPIER.World(this.config.gravity);this.events=new RAPIER.EventQueue(true);
      this.world.timestep=this.config.fixed_dt;
      for(const [key,value] of Object.entries(this.config.solver_config))if(key!=='additionalSolverIterations')this.world.integrationParameters[key]=value;
      if(this.experiment)this.world.integrationParameters.numSolverIterations=this.experiment.solver_config.numSolverIterations;
      const f=this.config.floor;
      this.floor=this.world.createCollider(RAPIER.ColliderDesc.cuboid(f.half.x,f.half.y,f.half.z).setTranslation(f.position.x,f.position.y,f.position.z).setFriction(f.friction).setRestitution(f.restitution));
      for(const spec of this.config.bodies){
        const p=spec.position,body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x,p.y,p.z).setRotation(spec.rotation).setLinearDamping(spec.linearDamping).setAngularDamping(spec.angularDamping));
        body.setAdditionalSolverIterations(0);
        const collider=this.world.createCollider(colliderDesc(spec.shape).setMass(spec.mass).setFriction(spec.friction).setRestitution(spec.restitution),body);
        const entry={spec,body,collider};this.bodies.set(spec.id,entry);this.colliders.set(collider.handle,entry);
      }
      for(const spec of this.config.joints){
        const data=spec.type==='revolute'?RAPIER.JointData.revolute(spec.anchorA,spec.anchorB,spec.axis):RAPIER.JointData.spherical(spec.anchorA,spec.anchorB);
        const joint=this.world.createImpulseJoint(data,this.bodies.get(spec.parent).body,this.bodies.get(spec.child).body,true);
        joint.setContactsEnabled(false);if(spec.limits)joint.setLimits(...spec.limits);this.joints.set(spec.id,{spec,joint,descriptor:data});
      }
      this.auditRig();
      this.motor?.bind(this);this.telemetry=this.observeState(true);this.initialCom={...this.telemetry.com};
      this.terminal=termination(this.telemetry.contacts,this.config,0);
      this.checkpoints.push(this.snapshot());
    }catch(error){this.release();throw error;}
    return this;
  }
  auditRig(){
    for(const {body,spec} of this.bodies.values()){
      if(Math.abs(body.mass()-spec.mass)>1e-5||Object.values(body.principalInertia()).some(n=>!Number.isFinite(n)||n<=0)||norm(sub(body.worldCom(),body.translation()))>1e-6)throw Error('Invalid mass/COM/inertia '+spec.id);
    }
    for(const j of this.joints.values()){const o=jointObservation(j);if(o.anchor_error>1e-6||(o.axis_error??0)>1e-6||(o.limit_violation??0)>1e-6)throw Error('Initial constraint conflict '+o.id);}
    const adjacent=new Set(this.config.joints.map(j=>[j.parent,j.child].sort().join(':'))),parts=[...this.bodies.values()];
    for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){
      const a=parts[i],b=parts[j];if(adjacent.has([a.spec.id,b.spec.id].sort().join(':')))continue;
      const c=a.collider.contactCollider(b.collider,0);if(c&&c.distance< -1e-6)throw Error('Initial self penetration '+a.spec.id+'/'+b.spec.id+': '+c.distance);
    }
  }
  get time(){return this.steps*this.config.fixed_dt;}
  observeState(initial=false){const t=observe(this,initial);return this.motor?{...t,motor_tracking:this.motor.tracking(),motor_saturation:null,motor_effort:null,motor_effort_reason:'Unavailable: supported getters cannot separate motor, contact and limit impulses'}:t;}
  assertLive(){if(this.disposed||!this.world)throw Error('Disposed simulation');}
  step(){
    this.assertLive();if(this.terminal)return false;
    try{
      this.invalid=this.anomaly();if(this.invalid)throw Error(this.invalid);
      if(this.motor){const commandStart=performance.now();this.motor.command();this.commandTimes.push(performance.now()-commandStart);}
      const before=performance.now();this.world.step(this.events);this.physicsTimes.push(performance.now()-before);this.steps++;
      this.events.drainCollisionEvents(()=>{});this.events.drainContactForceEvents(()=>{});
      this.invalid=this.anomaly();
      if(this.invalid)throw Error(this.invalid);
      const observationStart=performance.now();this.telemetry=this.observeState();this.observationTimes.push(performance.now()-observationStart);
      this.terminal=termination(this.telemetry.contacts,this.config,this.steps);
      if([1,10,30,60].includes(this.steps)||this.terminal)this.checkpoints.push(this.snapshot());
    }catch(error){this.invalid=String(error.message);this.telemetry=null;this.terminal=termination([],this.config,this.steps,this.invalid);}
    if(this.terminal)this.paused=true;
    return true;
  }
  anomaly(){
    if(this.world.bodies.len()!==15||this.world.colliders.len()!==16||this.world.impulseJoints.len()!==14)return 'lost_resource';
    for(const {body,spec} of this.bodies.values()){
      if(!body.isValid())return 'lost_body:'+spec.id;
      const p=body.translation(),q=body.rotation(),v=body.linvel(),a=body.angvel();
      if([...Object.values(p),...Object.values(q),...Object.values(v),...Object.values(a)].some(n=>!Number.isFinite(n)))return 'nonfinite:'+spec.id;
      if(norm(p)>20||norm(v)>50||norm(a)>200||Math.abs(Math.hypot(...Object.values(q))-1)>1e-4)return 'exploding_state:'+spec.id;
    }
    for(const j of this.joints.values()){const o=jointObservation(j);if(o.anchor_error>.08||(o.limit_violation??0)>.05)return 'constraint_error:'+o.id;}
    return null;
  }
  snapshot(){this.assertLive();return freeze({step:this.steps,bodies:[...this.bodies.values()].sort((a,b)=>a.spec.id.localeCompare(b.spec.id)).map(({spec,body})=>({id:spec.id,position:{...body.translation()},rotation:{...body.rotation()},linear_velocity:{...body.linvel()},angular_velocity:{...body.angvel()}})),contacts:structuredClone(this.telemetry?.contacts??[])});}
  async result(){
    this.assertLive();
    // Capture synchronously before hash awaits: reset/export races cannot mix runs.
    const result={schema_version:1,run_id:this.runId,run_index:this.metadata.run_index??1,rig_id:this.config.rig_id,controller_id:'none',config:structuredClone(this.config),git_commit:this.metadata.git_commit??'0000000000000000000000000000000000000000',dirty:this.metadata.dirty??true,build_id:this.metadata.build_id??'unspecified',rapier_js_version:RAPIER.version(),rapier_upstream_commit:'b716d375efc0201003f0cd9ef7168eee0b62c177',fixed_dt:this.config.fixed_dt,solver_config:structuredClone(this.config.solver_config),simulation_steps:this.steps,observed_time:this.time,...(this.terminal??{termination_reason:'incomplete',failure_reason:null,failure_bodies:[],failure_body:null,failure_step:null,standing_time:null,invalid_detail:null}),fall_cause:'unknown',telemetry:structuredClone(this.telemetry),physics_timing:timingStats(this.physicsTimes),observation_timing:timingStats(this.observationTimes),platform:structuredClone(this.metadata.platform??{os:'unspecified',runtime:'unspecified',host:'unspecified',user_agent:null}),checkpoints:structuredClone(this.checkpoints),unreached_checkpoints:[0,1,10,30,60].filter(n=>!this.checkpoints.some(c=>c.step===n))};
    if(this.experiment)Object.assign(result,{schema_version:2,controller_id:this.experiment.controller_id,config:structuredClone(this.experiment),solver_config:structuredClone(this.experiment.solver_config),motor_commands_timing:timingStats(this.commandTimes)});
    Object.assign(result,await configIdentity(result.config));validateResult(result);return freeze(result);
  }
  counts(){this.assertLive();return {bodies:this.world.bodies.len(),colliders:this.world.colliders.len(),joints:this.world.impulseJoints.len()};}
  release(){this.motor?.clear();this.events?.free();this.world?.free();this.events=null;this.world=null;this.floor=null;this.bodies?.clear();this.colliders?.clear();this.joints?.clear();}
  dispose(){if(this.disposed)return;this.release();this.disposed=true;this.paused=true;this.physicsTimes=[];this.commandTimes=[];this.observationTimes=[];this.checkpoints=[];this.telemetry=null;this.initialCom=null;this.terminal=null;}
}

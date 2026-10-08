// Authorized observer diagnostics only; not imported by CI/tests/study runner.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {floorObservation} from '../src/labs/standing/measurement.js';
import {StandingSimulation,initRapier} from '../src/labs/standing/simulation.js';
import {motorExperiment} from '../src/labs/standing/motor-config.js';
const [mode,dir,only]=process.argv.slice(2);assert.ok(['controls','baselines','fullrig'].includes(mode)&&dir);fs.mkdirSync(dir);
const ledger=path.join(path.dirname(dir),'diagnostic-ledger.ndjson'),log=x=>fs.appendFileSync(ledger,JSON.stringify(x)+'\n'),save=(name,x)=>fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify(x,null,2)+'\n');
const events=fs.existsSync(ledger)?fs.readFileSync(ledger,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
let allocations=events.filter(x=>x.event==='allocation').length,steps=events.filter(x=>x.event==='step_attempt').length;
const allocate=id=>{assert.ok(allocations<12);log({event:'allocation',ordinal:++allocations,id});},step=(id,fn)=>{assert.ok(steps<10000);log({event:'step_attempt',total:++steps,id});fn();};
await initRapier();const summaries=[];
if(mode==='controls')for(const id of ['air','drop-rest-release','reverse-offset-drop-rest-release'].filter(id=>!only||id===only)){
 allocate(id);const world=new R.World({x:0,y:id==='air'?0:-9.81,z:0});world.timestep=1/60;const rows=[];let body,floor,collider,last_sample=null;
 try{
  const reverse=id.startsWith('reverse'),addFloor=()=>world.createCollider(R.ColliderDesc.cuboid(3,.2,3).setTranslation(0,-.2,0));if(!reverse)floor=addFloor();
  body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,id==='air'?.55:.51,0).setCanSleep(false));
  collider=world.createCollider(R.ColliderDesc.cuboid(.5,.5,.5).setMass(1).setTranslation(reverse?.1:0,0,0),body);if(reverse)floor=addFloor();
  const entries=[{spec:{id:'footL',collider_id:'collider:footL'},body,collider}];
  let began=false,cachedWhileTouching=false,releasedWithCache=false;
  const advance=phase=>{
   const before=body.linvel().y,gravity=world.gravity.y;step(id,()=>world.step());const after=body.linvel().y,observation=floorObservation(world,floor,entries),r=observation.bodies[0],q=collider.rotation(),n=Math.hypot(q.x,q.y,q.z,q.w),x=q.x/n,y=q.y/n,z=q.z/n,w=q.w/n;
   // Independent box support function vs horizontal plane, not observer/Query reuse.
   const boxBottom=collider.translation().y-.5*(Math.abs(2*(x*y+z*w))+Math.abs(1-2*(x*x+z*z))+Math.abs(2*(y*z-x*w))),top=floor.translation().y+floor.halfExtents().y,gap=boxBottom-top;
   last_sample={step:rows.length+1,phase,gap,position:{...collider.translation()},rotation:{...collider.rotation()},observation};if(Math.abs(gap)>1e-6)assert.equal(r.current_touching,gap<=0,'independent current geometry');if(r.current_geometry)assert.ok(Math.abs(r.current_geometry.distance-gap)<1e-6);if(r.query_geometry){const query=r.query_geometry;assert.ok(query.distance<=0);assert.ok(Math.abs(query.body_point.y-query.floor_point.y-query.distance)<1e-6);assert.ok(query.body_point.y>=gap+top-1e-6,'query witness cannot lie below deepest box corner');}
   const momentumImpulse=body.mass()*(after-before-gravity*world.timestep),measuredImpulse=(r.interval_vertical_mean_load??0)*world.timestep;
   assert.ok(Math.abs(momentumImpulse-measuredImpulse)<1e-4,'independent vertical momentum balance');
   began ||= r.current_touching&&r.interval_normal_impulse>0;cachedWhileTouching ||= r.current_touching&&r.candidates.some(c=>c.cached_distance>0);releasedWithCache ||= phase==='release'&&!r.current_touching&&r.candidates.length>0;
   rows.push({step:rows.length+1,phase,independent_gap:gap,momentum_impulse:momentumImpulse,observation});
  };
  if(id==='air'){for(let i=0;i<4;i++)advance('air');assert.ok(rows.every(x=>!x.observation.bodies[0].current_touching&&x.observation.bodies[0].interval_normal_impulse===0));}
  else{for(let i=0;i<240;i++)advance(i<30?'begin_contact':'rest');const resting=rows.slice(-60).reduce((s,x)=>s+x.observation.bodies[0].interval_vertical_mean_load,0)/60;assert.ok(Math.abs(resting-9.81)<.02);assert.ok(began&&cachedWhileTouching);world.gravity={x:0,y:0,z:0};body.setLinvel({x:0,y:1,z:0},true);for(let i=0;i<4;i++)advance('release');assert.ok(releasedWithCache,'real detached state retains candidate cache');}
  save(id,{kind:'diagnostic_not_controller_selection',id,rows});summaries.push({id,steps:rows.length,began,cachedWhileTouching,releasedWithCache});
 }catch(error){save(id+'-failure',{id,message:error.stack,rows,last_sample});throw error;}finally{world.free();}
}
else if(mode==='fullrig'){
 const {StudyWorld,init}=await import('./fullrig84-world.mjs'),{PLAN}=await import('./fullrig84-model.mjs'),{worldDecision,commandCheck}=await import('./fullrig84-reader.mjs');await init();const trial=PLAN.order[60],id=trial.id;allocate(id);const sim=new StudyWorld(trial),run={trial,initial:null,frames:[],decision:null};try{sim.allocate();run.initial=sim.snapshot(true);run.decision=worldDecision(run);for(let i=0;i<40&&run.decision.kind==='incomplete';i++){const pre=sim.snapshot(i===0),command=sim.prepare(pre),command_classification=commandCheck(pre,command,trial.variant);step(id,()=>sim.step());const post=sim.snapshot(),cleared=sim.clear();run.frames.push({pre,command,command_classification,post,cleared,cpu:{physics_ms:0,command_ms:0,observation_ms:0}});run.decision=worldDecision(run);}save('fullrig',run);summaries.push({id,steps:sim.steps,decision:run.decision});}catch(error){save('fullrig-failure',{message:error.stack,run});throw error;}finally{sim.dispose();}
}
else for(const [id,experiment] of [['passive',null],['force20',motorExperiment(20)],['force1',motorExperiment(1)]]){
 allocate(id);let sim;try{sim=new StandingSimulation(undefined,{build_id:'diagnostic observer-v2',dirty:true},experiment);while(!sim.terminal)step(id,()=>sim.step());const result=await sim.result();save(id,result);summaries.push({id,steps:result.simulation_steps,standing_time:result.standing_time,termination:result.termination_reason,failures:result.failure_bodies,measurement_version:result.measurement_version});}catch(error){save(id+'-failure',{message:error.stack});throw error;}finally{sim?.dispose();}
}
save('summary',{mode,allocations,public_steps:steps,summaries});console.log(JSON.stringify({mode,allocations,public_steps:steps,summaries}));
